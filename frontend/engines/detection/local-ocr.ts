
import { createWorker, type Worker as TesseractWorker } from 'tesseract.js';
import type { IDCardData } from '@/types/id-card';
import { NORM_W, NORM_H } from '@/engines/detection/face-crop';
import {
  normalizeCardCanvas,
  enhanceForOcr,
  binarizeOtsu,
  canvasToDataUrl,
  cropRegion,
  type PixelRegion,
} from '@/engines/detection/local-preprocess';

/* -------------------------------------------------------------------------- */
/* Fixed Fayda field regions                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Which side of the card a field appears on. The Fayda layout splits text
 * across two physical scans: the front carries the photo, name, DOB, sex,
 * date_of_expiry, and FAN; the back carries the QR code, phone, FIN,
 * nationality, region, zone, woreda, and address.
 */
export type CardSide = 'front' | 'back';

/**
 * Measured field rectangles, normalised to 0..1 fractions of the source
 * image so they apply identically regardless of upload resolution.
 *
 * The bboxes were auto-extracted by `scripts/measure-fields.mjs` running
 * Tesseract against the reference Fayda scans:
 *   front: 629 × 1024  (digital copy, photo + barcode side)
 *   back:  644 × 1024  (digital copy, QR code + admin side)
 *
 * Pixel measurements straight from Tesseract word bboxes (with the small +30 %
 * vertical safety pad applied later inside `fieldBBoxToPixels`):
 *
 *   FRONT
 *     name_am         x= 76 y=606 w=277 h=19
 *     name_en         x= 75 y=632 w=363 h=22
 *     dob             x= 75 y=693 w=272 h=24
 *     sex             x= 76 y=743 w=119 h=18
 *     date_of_expiry  x= 75 y=801 w=264 h=24
 *     fan             x=174 y=857 w=245 h=17    (digits printed above barcode)
 *
 *   BACK
 *     phone           x= 66 y=679 w=200 h=25    (estimated; OCR misread the digits)
 *     fin             x=412 y=679 w=172 h=15
 *     nationality     x= 66 y=763 w=199 h=24
 *     region          x= 66 y=850 w=200 h=20    ("Oromia")
 *     zone            x= 66 y=909 w=250 h=23    ("West Harerge")
 *     woreda          x= 66 y=968 w=280 h=22    ("Chiro City Administration")
 */
export const FAYDA_FIELD_BBOXES_FRONT: Partial<
  Record<keyof IDCardData, { x: number; y: number; w: number; h: number }>
> = {
  name_am:        { x: 0.121, y: 0.592, w: 0.440, h: 0.019 },
  name_en:        { x: 0.119, y: 0.617, w: 0.577, h: 0.021 },
  dob:            { x: 0.119, y: 0.677, w: 0.432, h: 0.023 },
  sex:            { x: 0.121, y: 0.726, w: 0.189, h: 0.018 },
  date_of_expiry: { x: 0.119, y: 0.782, w: 0.420, h: 0.023 },
  fan:            { x: 0.277, y: 0.837, w: 0.390, h: 0.017 },
};

export const FAYDA_FIELD_BBOXES_BACK: Partial<
  Record<keyof IDCardData, { x: number; y: number; w: number; h: number }>
> = {
  phone:       { x: 0.102, y: 0.663, w: 0.310, h: 0.024 },
  fin:         { x: 0.640, y: 0.663, w: 0.267, h: 0.015 },
  // nationality is intentionally omitted — Fayda is the Ethiopian national ID,
  // so the value is always "ኢትዮጵያዊ | Ethiopian". It's pinned in extractWithAI
  // (see FAYDA_NATIONALITY) and we save the OCR cost here.
  region:      { x: 0.102, y: 0.830, w: 0.310, h: 0.019 },
  zone:        { x: 0.102, y: 0.888, w: 0.388, h: 0.023 },
  woreda:      { x: 0.102, y: 0.945, w: 0.435, h: 0.021 },
  // Combined Amharic address: spans the three Ethiopic lines that sit just
  // above each English admin line (region_am ≈ y=823, zone_am ≈ y=881,
  // woreda_am ≈ y=940). Run as a multi-line PSM 6 block.
  address_am:  { x: 0.102, y: 0.804, w: 0.466, h: 0.140 },
};

const BBOXES_BY_SIDE: Record<CardSide, typeof FAYDA_FIELD_BBOXES_FRONT> = {
  front: FAYDA_FIELD_BBOXES_FRONT,
  back:  FAYDA_FIELD_BBOXES_BACK,
};

/**
 * Backwards-compat alias used by debug overlays that don't yet know about the
 * side split. Combines both sides; do NOT use for actual cropping (front and
 * back occupy the same Y range so the bboxes overlap).
 */
export const FAYDA_FIELD_BBOXES: Partial<
  Record<keyof IDCardData, { x: number; y: number; w: number; h: number }>
> = { ...FAYDA_FIELD_BBOXES_FRONT, ...FAYDA_FIELD_BBOXES_BACK };

/**
 * Per-field Tesseract configuration. PSM 7 (single text line) suits one-row
 * crops; PSM 8 (single word) is used for short single-token fields. Whitelists
 * eliminate the most common OCR confusions (O↔0, I↔1, S↔5).
 */
interface FieldOcrSpec {
  worker: 'eng' | 'amh';
  /** Tesseract page-segmentation mode: '6' = uniform block, '7' = single line, '8' = single word. */
  psm: '6' | '7' | '8';
  /** Optional character whitelist; empty string = no whitelist. */
  whitelist?: string;
  /** Per-field upscale factor applied before OCR (default 3). */
  upscale?: number;
}

const FIELD_OCR_SPECS: Partial<Record<keyof IDCardData, FieldOcrSpec>> = {
  // FRONT
  name_am:        { worker: 'amh', psm: '7' },
  name_en:        { worker: 'eng', psm: '7' },
  // dob has dual-format text ("25/02/1992 | 1999/Nov/05"); a digits-only
  // whitelist confuses Tesseract here — leaving it open and post-processing.
  dob:            { worker: 'eng', psm: '7' },
  sex:            { worker: 'eng', psm: '7', whitelist: 'MaleFemalmale|' },
  date_of_expiry: { worker: 'eng', psm: '7' },
  fan:            { worker: 'eng', psm: '7', whitelist: '0123456789 ' },
  // BACK
  // phone digits sit on a coloured background that often costs the leading
  // "9"; allow the open alphabet so context guides the read, then strip
  // non-digits in post-processing.
  phone:          { worker: 'eng', psm: '7' },
  fin:            { worker: 'eng', psm: '7', whitelist: '0123456789 ' },
  // nationality is constant — see FAYDA_NATIONALITY in id-card.ts.
  region:         { worker: 'eng', psm: '7' },
  zone:           { worker: 'eng', psm: '7' },
  woreda:         { worker: 'eng', psm: '7' },
  // Multi-line Amharic block: three short Ethiopic lines stacked together.
  // PSM 6 lets Tesseract treat them as one paragraph and preserves line breaks.
  address_am:     { worker: 'amh', psm: '6' },
};

/* -------------------------------------------------------------------------- */
/* Worker management                                                          */
/* -------------------------------------------------------------------------- */

let engWorkerPromise: Promise<TesseractWorker> | null = null;
let amhWorkerPromise: Promise<TesseractWorker> | null = null;

async function getEngWorker(): Promise<TesseractWorker> {
  if (!engWorkerPromise) {
    engWorkerPromise = (async () => {
      const w = await createWorker('eng', 1);
      // PSM 6 = "Assume a single uniform block of text" — much better for
      // ID cards than the default auto-segmentation, which tries to detect
      // columns and gets confused by the photo, logos, and barcode.
      await w.setParameters({
        tessedit_pageseg_mode: '6' as never,
        preserve_interword_spaces: '1',
      });
      return w;
    })().catch((err) => {
      engWorkerPromise = null;
      throw err;
    });
  }
  return engWorkerPromise;
}

async function getAmhWorker(): Promise<TesseractWorker> {
  if (!amhWorkerPromise) {
    amhWorkerPromise = (async () => {
      try {
        const w = await createWorker('amh', 1);
        await w.setParameters({
          tessedit_pageseg_mode: '6' as never,
          preserve_interword_spaces: '1',
        });
        return w;
      } catch (e) {
        amhWorkerPromise = null;
        throw e;
      }
    })();
  }
  return amhWorkerPromise;
}

export function warmUpOcrWorkers(): void {
  void getEngWorker().catch(() => { /* swallow */ });
  void getAmhWorker().catch(() => { /* swallow */ });
}

/* -------------------------------------------------------------------------- */
/* Region-based OCR (one Tesseract call per measured field)                   */
/* -------------------------------------------------------------------------- */

/**
 * Convert a normalized 0..1 bbox into a pixel rectangle on the NORM_W×NORM_H
 * working canvas, with extra padding so a slightly tilted scan still captures
 * the whole glyph row (Y padding is generous because tall ascenders /
 * descenders sometimes spill outside the printed text-line height).
 */
function fieldBBoxToPixels(
  bb: { x: number; y: number; w: number; h: number },
  padX = 0.05,
  padY = 0.30,
): PixelRegion {
  const px = bb.w * NORM_W * padX;
  const py = bb.h * NORM_H * padY;
  const x = Math.max(0, bb.x * NORM_W - px);
  const y = Math.max(0, bb.y * NORM_H - py);
  const w = Math.min(NORM_W - x, bb.w * NORM_W + 2 * px);
  const h = Math.min(NORM_H - y, bb.h * NORM_H + 2 * py);
  return { x, y, w, h };
}

/**
 * Crop a single field region from the normalised card canvas, upscale it,
 * apply contrast + Otsu binarization, then run Tesseract with the per-field
 * PSM and character whitelist. Returns the trimmed raw OCR text, or empty
 * string on any error.
 *
 * Each crop is preprocessed *individually* so Otsu's threshold reflects the
 * local intensity distribution of just that field (much more accurate than
 * applying a global threshold across the whole card).
 */
async function ocrField(
  fullCanvas: HTMLCanvasElement,
  bbox: { x: number; y: number; w: number; h: number },
  spec: FieldOcrSpec,
): Promise<string> {
  try {
    const region = fieldBBoxToPixels(bbox);
    const cropped = cropRegion(fullCanvas, region, spec.upscale ?? 3);
    enhanceForOcr(cropped);
    binarizeOtsu(cropped);

    const worker = spec.worker === 'amh' ? await getAmhWorker() : await getEngWorker();
    await worker.setParameters({
      tessedit_pageseg_mode: spec.psm as never,
      tessedit_char_whitelist: spec.whitelist ?? '',
      preserve_interword_spaces: '1',
    });
    const result = await worker.recognize(cropped);
    return result.data.text.replace(/\s+/g, ' ').trim();
  } catch (err) {
    console.warn('[local-ocr] region OCR failed', err);
    return '';
  }
}

/**
 * Clean raw region-OCR output into the typed value we want to store.
 * Returns '' when the value clearly fails its expected shape so the caller
 * can fall through to other extraction sources.
 */
function postProcessFieldValue(field: keyof IDCardData, raw: string): string {
  const text = raw.trim();
  if (!text) return '';

  switch (field) {
    case 'fan': {
      const digits = text.replace(/\D/g, '');
      return digits.length === 16 ? digits : '';
    }
    case 'fin': {
      const digits = text.replace(/\D/g, '');
      return digits.length === 12 ? digits : '';
    }
    case 'phone': {
      // The Tesseract crop frequently picks up label garbage on the right
      // (e.g. "...is Fig"), so pull out the longest 9–13 digit run anywhere
      // in the text rather than trusting the whole string.
      const runs = text.match(/[0-9+\-\s]{9,}/g) ?? [];
      let best = '';
      for (const run of runs) {
        const compact = run.replace(/[\s\-]/g, '');
        const d = compact.replace(/\D/g, '');
        if (d.length >= 9 && d.length <= 13 && compact.length > best.length) best = compact;
      }
      return best;
    }
    case 'sex': {
      // "Female" must be checked before "Male" because the substring "male"
      // matches inside "Female". Word-boundary fallbacks accept lone M / F.
      if (/female/i.test(text) || /\bf\b/i.test(text)) return 'Female';
      if (/male/i.test(text)   || /\bm\b/i.test(text)) return 'Male';
      return '';
    }
    case 'dob':
    case 'date_of_issue':
    case 'date_of_expiry': {
      // Fayda dates can appear in EITHER order on the same card:
      //   DOB:    "25/02/1992 | 1999/Nov/05"   → DD/MM/YYYY first
      //   Expiry: "2026/07/24 | 2034/Apr/02"   → YYYY/MM/DD first
      // Try the YYYY-first pattern first; if it doesn't match, fall back to
      // DD-first. Output is always normalised to DD/MM/YYYY.
      const ymd = /(\d{4})[\/\-.\s](\d{1,2})[\/\-.\s](\d{1,2})/.exec(text);
      if (ymd) {
        const [, y, mo, d] = ymd;
        const dd = d.padStart(2, '0');
        const mm = mo.padStart(2, '0');
        if (+y >= 1900 && +y <= 2100 && +mm >= 1 && +mm <= 12 && +dd >= 1 && +dd <= 31) {
          return `${dd}/${mm}/${y}`;
        }
      }
      const dmy = /(\d{1,2})[\/\-.\s](\d{1,2})[\/\-.\s](\d{4})/.exec(text);
      if (dmy) {
        const [, d, mo, y] = dmy;
        const dd = d.padStart(2, '0');
        const mm = mo.padStart(2, '0');
        if (+y >= 1900 && +y <= 2100 && +mm >= 1 && +mm <= 12 && +dd >= 1 && +dd <= 31) {
          return `${dd}/${mm}/${y}`;
        }
      }
      return '';
    }
    case 'name_en':
      return text.replace(/[^A-Za-z'\-\s]/g, '').replace(/\s+/g, ' ').trim();
    case 'name_am':
    case 'address_am':
      return text.replace(/[^\u1200-\u137F\s]/g, '').replace(/\s+/g, ' ').trim();
    case 'nationality': {
      // Drop everything that isn't an English letter/space, then return the
      // longest connected word group. Pre-cleanup chops short garbage runs
      // (e.g. "To xe" before "Ethiopian") that come from Amharic mis-reads.
      const cleaned = text.replace(/[^A-Za-z\s]/g, '').replace(/\s+/g, ' ').trim();
      const words = cleaned.split(/\s+/).filter((w) => w.length >= 4);
      return words.length ? words.join(' ') : cleaned;
    }
    case 'blood_type': {
      const m = /(AB|A|B|O)\s*([+\-])/i.exec(text);
      return m ? `${m[1].toUpperCase()}${m[2]}` : '';
    }
    default:
      return text;
  }
}

async function runFieldRegionOcr(
  fullCanvas: HTMLCanvasElement,
  side: CardSide,
): Promise<Partial<IDCardData>> {
  const sideBBoxes = BBOXES_BY_SIDE[side];
  const fields: Partial<IDCardData> = {};
  for (const key of Object.keys(sideBBoxes) as (keyof IDCardData)[]) {
    const bbox = sideBBoxes[key];
    const spec = FIELD_OCR_SPECS[key];
    if (!bbox || !spec) continue;
    const raw = await ocrField(fullCanvas, bbox, spec);
    const cleaned = postProcessFieldValue(key, raw);
    if (cleaned) {
      (fields as Record<string, string>)[key] = cleaned;
    }
    if (typeof window !== 'undefined') {
      console.debug(`[local-ocr] (${side}) region "${key}" raw="${raw}" cleaned="${cleaned}"`);
    }
  }
  return fields;
}

function digitFix(s: string): string {
  return s
    .replace(/O/g, '0').replace(/o/g, '0')
    .replace(/I/g, '1').replace(/l/g, '1')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
    .replace(/Z/g, '2');
}

/** Strip every non-digit character from a string. */
function compactDigits(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}

/**
 * Find every contiguous numeric-or-near-numeric run that, after digit-fixing,
 * has at least `minDigits` digits. Returns runs sorted by digit count desc.
 */
function findDigitRuns(text: string, minDigits: number): string[] {
  const runs: string[] = [];
  // Match runs that contain digits / common digit-shaped letters / spaces / dashes.
  const re = /[0-9OoIlSBZ][0-9OoIlSBZ\s\-]{3,}[0-9OoIlSBZ]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const fixed = digitFix(m[0]);
    if (compactDigits(fixed).length >= minDigits) runs.push(fixed);
  }
  runs.sort((a, b) => compactDigits(b).length - compactDigits(a).length);
  return runs;
}

/**
 * Look for date-shaped patterns. We accept BOTH orderings on the same card:
 *   YYYY/MM/DD  (Fayda's expiry layout: 2026/07/24)
 *   DD/MM/YYYY  (Fayda's DOB layout:    25/02/1992)
 * Output is always normalised to DD/MM/YYYY.
 */
function findDates(text: string): string[] {
  const dates: string[] = [];

  // YYYY-first pass.
  const reYmd = /\b(\d{4})[\/\-.\s](\d{1,2})[\/\-.\s](\d{1,2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = reYmd.exec(text)) !== null) {
    const [, y, mo, d] = m;
    const dd = d.padStart(2, '0');
    const mm = mo.padStart(2, '0');
    if (+y >= 1900 && +y <= 2100 && +mm >= 1 && +mm <= 12 && +dd >= 1 && +dd <= 31) {
      dates.push(`${dd}/${mm}/${y}`);
    }
  }

  // DD-first pass.
  const reDmy = /\b(\d{1,2})[\/\-.\s](\d{1,2})[\/\-.\s](\d{2,4})\b/g;
  while ((m = reDmy.exec(text)) !== null) {
    const [, d, mo, y] = m;
    if (y.length === 4 && +y >= 1900 && +y <= 2100) {
      // already covered by YMD pass for the same substring; skip if we
      // already recorded an equivalent date.
    }
    const yyyy = y.length === 2 ? `20${y}` : y;
    const dd = d.padStart(2, '0');
    const mm = mo.padStart(2, '0');
    if (+dd >= 1 && +dd <= 31 && +mm >= 1 && +mm <= 12) {
      const out = `${dd}/${mm}/${yyyy}`;
      if (!dates.includes(out)) dates.push(out);
    }
  }
  return dates;
}

/** Ethiopian phone numbers: 9-10 digits, often "09xxxxxxxx" or "+251 9xxxxxxxx". */
function findPhones(text: string): string[] {
  const re = /(?:\+?251|0)?\s*9\s*\d[\d\s\-]{6,12}\d/g;
  const phones: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const compact = m[0].replace(/[\s\-]/g, '');
    const digits = compactDigits(compact);
    if (digits.length >= 9 && digits.length <= 13) {
      phones.push(compact.startsWith('+') ? compact : compact);
    }
  }
  return phones;
}

/** Blood type pattern: A+/A-/B+/B-/AB+/AB-/O+/O-. */
function findBloodType(text: string): string {
  const m = /\b(AB|A|B|O)\s*([+\-])/i.exec(text);
  if (!m) return '';
  return `${m[1].toUpperCase()}${m[2]}`;
}

/** Sex / gender — accept M/F/Male/Female with surrounding noise. */
function findSex(text: string): string {
  if (/\b(female|fem|f\b)/i.test(text)) return 'Female';
  if (/\b(male|mal|m\b)/i.test(text)) return 'Male';
  return '';
}

/**
 * English name detection.
 *
 * Tesseract on a Fayda card produces a lot of capitalized noise (boilerplate
 * "Federal Democratic Republic Of Ethiopia", garbled OCR like "Aaa Bbb",
 * tampered punctuation, etc.) so we are very conservative here:
 *
 *   - Each word must be 3+ characters with at least one vowel.
 *   - Each word must contain a typical letter mix (not e.g. "Aaaaa").
 *   - The whole match must be 2-4 words.
 *   - No stopword may appear in the candidate.
 *   - Total length must be ≥ 8 characters.
 *   - We deliberately bail out if no candidate clearly stands out — better to
 *     return empty string and let the user / cloud AI fill it in than to
 *     overwrite the field with junk.
 */
const NAME_STOPWORDS = new Set([
  'DATE', 'OF', 'BIRTH', 'ISSUE', 'EXPIRY', 'NAME', 'SEX', 'PHONE', 'NATIONALITY',
  'REGION', 'ZONE', 'WOREDA', 'KEBELE', 'HOUSE', 'BLOOD', 'TYPE', 'GROUP', 'MALE',
  'FEMALE', 'FEDERAL', 'DEMOCRATIC', 'REPUBLIC', 'ETHIOPIA', 'ETHIOPIAN', 'NATIONAL',
  'IDENTIFICATION', 'NUMBER', 'ID', 'CARD', 'FAYDA', 'FAN', 'FIN', 'SN', 'SERIAL',
  'EMERGENCY', 'CONTACT', 'ADDRESS', 'NO',
]);

const VOWELS = /[aeiouAEIOU]/;

function looksLikeRealName(word: string): boolean {
  if (word.length < 3) return false;
  if (!VOWELS.test(word)) return false;
  // Reject "Aaaaa" / "Bbbbb" garbage: at most 2 of any single letter.
  const letterCounts: Record<string, number> = {};
  for (const ch of word.toLowerCase()) {
    letterCounts[ch] = (letterCounts[ch] || 0) + 1;
    if (letterCounts[ch] > 3) return false;
  }
  return true;
}

function findEnglishName(text: string): string {
  const re = /\b([A-Z][a-z'\-]{2,})(?:\s+([A-Z][a-z'\-]{2,})){1,3}/g;
  const candidates: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const words = m[0].split(/\s+/);
    if (words.length < 2 || words.length > 4) continue;
    if (m[0].length < 8) continue;
    const stopwordHits = words.filter((w) => NAME_STOPWORDS.has(w.toUpperCase())).length;
    if (stopwordHits > 0) continue;
    if (!words.every(looksLikeRealName)) continue;
    candidates.push(m[0]);
  }
  // Prefer 3-word names (most common Ethiopian convention: given + father + grandfather)
  // over shorter candidates of similar length.
  candidates.sort((a, b) => {
    const aWords = a.split(/\s+/).length;
    const bWords = b.split(/\s+/).length;
    if (aWords !== bWords) return Math.abs(3 - aWords) - Math.abs(3 - bWords);
    return b.length - a.length;
  });
  return candidates[0] ?? '';
}

/**
 * Amharic name detection from the `amh` Tesseract pass.
 *
 * Find lines that contain mostly Ethiopic syllables (U+1200..U+137F) and have
 * at least 3 syllables in a row. We require the line to be ≥ 6 syllables in
 * total before treating it as a name — single-syllable noise from logos or
 * script-id confusion is discarded.
 */
function findAmharicRuns(text: string): string[] {
  const lines = text.split(/[\r\n]+/);
  const runs: string[] = [];
  for (const line of lines) {
    const cleaned = line.replace(/[^\u1200-\u137F\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;
    const ethiopicCount = (cleaned.match(/[\u1200-\u137F]/g) || []).length;
    if (ethiopicCount < 6) continue;
    runs.push(cleaned);
  }
  runs.sort((a, b) => {
    const aCount = (a.match(/[\u1200-\u137F]/g) || []).length;
    const bCount = (b.match(/[\u1200-\u137F]/g) || []).length;
    return bCount - aCount;
  });
  return runs;
}

/* -------------------------------------------------------------------------- */
/* Field assembly                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Take the merged Latin OCR text and pull out every field we can identify by
 * shape. This runs once per side; back-side-only fields (region/zone/woreda)
 * fall back to label-anchored matching since they don't have a distinctive
 * pattern.
 */
function parseLatinFields(text: string): Partial<IDCardData> {
  const fields: Partial<IDCardData> = {};

  // 12-digit FIN.
  for (const run of findDigitRuns(text, 12)) {
    const d = compactDigits(run);
    if (d.length === 12) { fields.fin = d; break; }
  }

  // 16-digit FAN (the barcode pipeline overwrites this when it succeeds).
  for (const run of findDigitRuns(text, 16)) {
    const d = compactDigits(run);
    if (d.length === 16) { fields.fan = d; break; }
  }

  // Phone.
  const phones = findPhones(text);
  if (phones[0]) fields.phone = phones[0].replace(/\s+/g, '');
  if (phones[1]) fields.emergency_contact = phones[1].replace(/\s+/g, '');

  // Dates — Fayda always has DOB + issue + expiry, in that approximate order.
  const dates = findDates(text);
  if (dates[0]) fields.dob = dates[0];
  if (dates[1]) fields.date_of_issue = dates[1];
  if (dates[2]) fields.date_of_expiry = dates[2];

  const sex = findSex(text);
  if (sex) fields.sex = sex;

  const blood = findBloodType(text);
  if (blood) fields.blood_type = blood;

  const nameEn = findEnglishName(text);
  if (nameEn) fields.name_en = nameEn;

  // Label-anchored fallback for back-side admin fields. These don't have a
  // pattern (any word can be a region name) so we have to trust the label.
  const labelled = (label: RegExp): string => {
    const re = new RegExp(`${label.source}\\s*[:\\-]?\\s*([A-Z0-9][A-Za-z0-9\\-\\s]{1,40})`, 'i');
    const m = re.exec(text);
    return m ? m[1].split(/\s+(?:Zone|Woreda|Kebele|House|Region|Blood|Emergency|Address)/i)[0].trim() : '';
  };
  const region = labelled(/region/i);   if (region) fields.region = region;
  const zone = labelled(/zone/i);       if (zone) fields.zone = zone;
  const woreda = labelled(/woreda/i);   if (woreda) fields.woreda = woreda;
  const kebele = labelled(/kebele/i);   if (kebele) fields.kebele = kebele;
  const houseNo = labelled(/house\s*(?:no\.?|number)?/i); if (houseNo) fields.house_no = houseNo;
  const nationality = labelled(/nationality/i); if (nationality) fields.nationality = nationality;

  // Serial number: Fayda SN is alphanumeric, ~6-12 chars, often contains both letters and digits.
  const snMatch = /\b([A-Z]{1,3}[A-Z0-9\-]{4,12})\b/.exec(text);
  if (snMatch && /\d/.test(snMatch[1]) && /[A-Z]/.test(snMatch[1])) fields.sn = snMatch[1];

  return fields;
}

function parseAmharicFields(text: string): Partial<IDCardData> {
  const fields: Partial<IDCardData> = {};
  const runs = findAmharicRuns(text);
  if (runs[0]) fields.name_am = runs[0];
  if (runs[1] && runs[1].length >= 4) fields.address_am = runs[1];
  return fields;
}

/* -------------------------------------------------------------------------- */
/* Public entry point                                                         */
/* -------------------------------------------------------------------------- */

export interface LocalOcrResult {
  fields: Partial<IDCardData>;
  confidence: Partial<Record<keyof IDCardData, number>>;
  rawText: string;
}

/**
 * Run Tesseract on a single image and return parsed fields.
 *
 * Two-stage pipeline:
 *
 *   STAGE A — Region OCR (high precision)
 *     For every Fayda field with a measured bounding box (FAYDA_FIELD_BBOXES)
 *     we crop just that rectangle, upscale 3×, binarize, and run Tesseract
 *     with the right PSM and character whitelist. Position itself is the
 *     label so we trust this output highly (~0.92 confidence).
 *
 *   STAGE B — Full-card OCR (recall)
 *     We then preprocess and binarize the whole card and run Tesseract
 *     across it. Position-free pattern matchers (digit-runs, dates, phones)
 *     pick up the fields we don't have measured regions for — FIN, DOB,
 *     date_of_issue, SN, blood_type, plus everything on the back side.
 *
 *   Merge order: region-OCR fields override full-card matches when both
 *   produced a value, because the region pass is much more accurate.
 */
export async function runLocalOcrOnImage(
  imageDataUrl: string,
  side: CardSide,
): Promise<LocalOcrResult> {
  // Stage A inputs need the un-binarized canvas (region preprocessing is
  // per-crop). We mutate this same canvas in place for stage B once stage A
  // is done, so we don't double the memory.
  const baseCanvas = await normalizeCardCanvas(imageDataUrl);

  // ---- Stage A: per-field region OCR (side-specific bboxes) ----
  const regionFields = await runFieldRegionOcr(baseCanvas, side);

  // ---- Stage B: full-card OCR for fields without measured regions ----
  enhanceForOcr(baseCanvas);
  binarizeOtsu(baseCanvas);
  const cleanedDataUrl = canvasToDataUrl(baseCanvas);

  const engWorker = await getEngWorker();
  // Restore PSM 6 (uniform block) — region OCR may have left the worker on PSM 7.
  await engWorker.setParameters({
    tessedit_pageseg_mode: '6' as never,
    tessedit_char_whitelist: '',
    preserve_interword_spaces: '1',
  });
  const engResult = await engWorker.recognize(cleanedDataUrl);
  const latinText = engResult.data.text;
  const latinFields = parseLatinFields(latinText);

  let amharicFields: Partial<IDCardData> = {};
  let amharicText = '';
  try {
    const amhWorker = await getAmhWorker();
    await amhWorker.setParameters({
      tessedit_pageseg_mode: '6' as never,
      tessedit_char_whitelist: '',
      preserve_interword_spaces: '1',
    });
    const amhResult = await amhWorker.recognize(cleanedDataUrl);
    amharicText = amhResult.data.text;
    amharicFields = parseAmharicFields(amharicText);
  } catch (err) {
    console.warn('[local-ocr] Amharic OCR unavailable; continuing with Latin only', err);
  }

  // Region OCR wins on conflict — cropped + tuned recognition is materially
  // more accurate than label-free pattern matching across the whole card.
  const fields: Partial<IDCardData> = {
    ...latinFields,
    ...amharicFields,
    ...regionFields,
  };
  const confidence: Partial<Record<keyof IDCardData, number>> = {};

  // Per-field confidence map. Region-OCR fields get the highest score (0.92)
  // since they were extracted from a tightly-cropped, character-whitelisted
  // crop. Pattern-matched fields keep their previous confidence.
  const PATTERN_SCORES: Partial<Record<keyof IDCardData, number>> = {
    fin: 0.85, fan: 0.85, phone: 0.85, emergency_contact: 0.80,
    dob: 0.80, date_of_issue: 0.75, date_of_expiry: 0.75,
    sex: 0.75, blood_type: 0.75,
    name_en: 0.55, name_am: 0.65, address_am: 0.55,
    region: 0.60, zone: 0.60, woreda: 0.60, kebele: 0.60,
    house_no: 0.60, nationality: 0.65, sn: 0.65,
  };
  const REGION_SCORE = 0.92;

  for (const k of Object.keys(fields) as (keyof IDCardData)[]) {
    if (!fields[k]) continue;
    confidence[k] = (k in regionFields)
      ? REGION_SCORE
      : (PATTERN_SCORES[k] ?? 0.6);
  }

  // Useful debug surface — log the raw OCR text so the user can see what
  // Tesseract actually saw when a field doesn't fill in correctly.
  if (typeof window !== 'undefined') {
    console.debug(`[local-ocr] (${side}) region fields`, regionFields);
    console.debug(`[local-ocr] (${side}) raw Latin output:\n` + latinText);
    if (amharicText) console.debug(`[local-ocr] (${side}) raw Amharic output:\n` + amharicText);
    console.debug(`[local-ocr] (${side}) merged fields`, fields);
  }

  return {
    fields,
    confidence,
    rawText: `${latinText}\n---\n${amharicText}`,
  };
}

/**
 * Run OCR on the front and (optional) back image and merge the results.
 * Each side runs region OCR with the bbox set measured for that side, so
 * front/back fields don't overlap or steal from each other.
 */
export async function runLocalOcr(
  frontImageDataUrl: string,
  backImageDataUrl: string,
): Promise<LocalOcrResult> {
  const tasks: Promise<LocalOcrResult>[] = [];
  if (frontImageDataUrl) tasks.push(runLocalOcrOnImage(frontImageDataUrl, 'front'));
  if (backImageDataUrl)  tasks.push(runLocalOcrOnImage(backImageDataUrl,  'back'));
  const results = await Promise.all(tasks);

  const merged: LocalOcrResult = { fields: {}, confidence: {}, rawText: '' };
  for (const r of results) {
    merged.fields = { ...merged.fields, ...r.fields };
    merged.confidence = { ...merged.confidence, ...r.confidence };
    merged.rawText = `${merged.rawText}\n=====\n${r.rawText}`;
  }
  return merged;
}

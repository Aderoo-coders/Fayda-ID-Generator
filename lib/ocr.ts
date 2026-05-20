import Tesseract from 'tesseract.js';
import type { IDCardData, ExtractionResult } from '@/types/id-card';
import { extractFaceFromCard } from './face-extract';

const defaultData: IDCardData = {
  name_am: '', name_en: '', dob: '', sex: '', fin: '', fan: '', phone: '', sn: '',
  date_of_issue: '', date_of_expiry: '', photo: null,
  nationality: '', region: '', zone: '', woreda: '', kebele: '', house_no: '',
  blood_type: '', emergency_contact: '', address_am: '',
  back_qr_crop: null,
};

const emptyConfidence = (): Record<keyof IDCardData, number> => ({
  name_am: 0, name_en: 0, dob: 0, sex: 0, fin: 0, fan: 0, phone: 0, sn: 0,
  date_of_issue: 0, date_of_expiry: 0, photo: 0,
  nationality: 0, region: 0, zone: 0, woreda: 0, kebele: 0, house_no: 0,
  blood_type: 0, emergency_contact: 0, address_am: 0,
  back_qr_crop: 0,
});

function parseFrontText(text: string): ExtractionResult {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const data: IDCardData = { ...defaultData };
  const confidence = emptyConfidence();

  for (const line of lines) {
    const dateMatch = line.match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/);
    if (dateMatch && !data.dob) {
      data.dob = dateMatch[1];
      confidence.dob = 0.7;
    }

    const finMatch = line.match(/\b(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/) || line.match(/FIN[:\s]*([A-Z0-9]+)/i);
    if (finMatch && !data.fin) {
      data.fin = finMatch[1].replace(/\s/g, '');
      confidence.fin = 0.6;
    }

    const phoneMatch = line.match(/(\+?251[\s-]?\d{9}|\b09\d{8}\b)/);
    if (phoneMatch && !data.phone) {
      data.phone = phoneMatch[1];
      confidence.phone = 0.7;
    }

    const sexMatch = line.match(/\b(Male|Female|M|F|ወንድ|ሴት)\b/i);
    if (sexMatch && !data.sex) {
      const val = sexMatch[1].toUpperCase();
      data.sex = val === 'M' || val === 'MALE' || val === 'ወንድ' ? 'Male' : 'Female';
      confidence.sex = 0.8;
    }

    const snMatch = line.match(/S\.?N\.?[:\s]*([A-Z0-9]+)/i);
    if (snMatch && !data.sn) {
      data.sn = snMatch[1];
      confidence.sn = 0.6;
    }

    if (/[\u1200-\u137F]/.test(line) && !data.name_am && line.length > 2) {
      data.name_am = line.replace(/[^ሀ-ፚ\s]/g, '').trim();
      confidence.name_am = 0.5;
    }

    if (/^[A-Za-z\s]{4,}$/.test(line) && !data.name_en && !/date|sex|fin|phone|birth/i.test(line)) {
      data.name_en = line;
      confidence.name_en = 0.5;
    }
  }

  return { data, confidence };
}

function parseBackText(text: string): Partial<ExtractionResult> {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const data: Partial<IDCardData> = {};
  const confidence: Partial<Record<keyof IDCardData, number>> = {};

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Phone
    const phoneMatch = line.match(/(\+?251[\s-]?\d{9}|\b09\d{8}\b)/);
    if (phoneMatch && !data.phone) {
      data.phone = phoneMatch[1];
      confidence.phone = 0.7;
    }

    // Emergency contact (second phone found or labeled)
    if (/emergency|አደጋ/i.test(line)) {
      const ph = line.match(/(\+?251[\s-]?\d{9}|\b09\d{8}\b)/);
      if (ph) { data.emergency_contact = ph[1]; confidence.emergency_contact = 0.6; }
    }

    // Nationality
    if (/nationality|ዜግነት/i.test(lower) || /ethiopian/i.test(line)) {
      const nat = line.replace(/.*(?:nationality|ዜግነት)[:\s|]*/i, '').trim();
      if (nat) { data.nationality = nat; confidence.nationality = 0.7; }
      else { data.nationality = 'Ethiopian'; confidence.nationality = 0.5; }
    }

    // Region
    if (/region|ክልል/i.test(lower)) {
      const val = line.replace(/.*(?:region|ክልል)[:\s|]*/i, '').trim();
      if (val) { data.region = val; confidence.region = 0.6; }
    }

    // Zone
    if (/zone|ዞን/i.test(lower)) {
      const val = line.replace(/.*(?:zone|ዞን)[:\s|]*/i, '').trim();
      if (val) { data.zone = val; confidence.zone = 0.6; }
    }

    // Woreda
    if (/woreda|ወረዳ/i.test(lower)) {
      const val = line.replace(/.*(?:woreda|ወረዳ)[:\s|]*/i, '').trim();
      if (val) { data.woreda = val; confidence.woreda = 0.6; }
    }

    // Kebele
    if (/kebele|ቀበሌ/i.test(lower)) {
      const val = line.replace(/.*(?:kebele|ቀበሌ)[:\s|]*/i, '').trim();
      if (val) { data.kebele = val; confidence.kebele = 0.6; }
    }

    // House number
    if (/house\s*no|የቤት\s*ቁ/i.test(lower)) {
      const val = line.replace(/.*(?:house\s*no\.?|የቤት\s*ቁ\.?)[:\s|]*/i, '').trim();
      if (val) { data.house_no = val; confidence.house_no = 0.6; }
    }

    // Blood type
    if (/blood|ደም/i.test(lower)) {
      const bt = line.match(/\b([ABO]{1,2}[+-])\b/i);
      if (bt) { data.blood_type = bt[1].toUpperCase(); confidence.blood_type = 0.7; }
    }

    // Amharic address line
    if (/[\u1200-\u137F]{3,}/.test(line) && !data.address_am && !/ዜግነት|ስልክ|ክልል|ዞን|ወረዳ|ቀበሌ|የቤት|ደም|አደጋ/i.test(line)) {
      data.address_am = line.replace(/[^\u1200-\u137F\s]/g, '').trim();
      confidence.address_am = 0.4;
    }

    // FIN on back
    const finMatch = line.match(/FIN[:\s]*([A-Z0-9\-]+)/i) || line.match(/\b(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/);
    if (finMatch && !data.fin) {
      data.fin = finMatch[1].replace(/\s/g, '');
      confidence.fin = 0.6;
    }

    // SN on back
    const snMatch = line.match(/S\.?N\.?[:\s]*([A-Z0-9]+)/i);
    if (snMatch && !data.sn) {
      data.sn = snMatch[1];
      confidence.sn = 0.6;
    }
  }

  return { data: data as IDCardData, confidence: confidence as Record<keyof IDCardData, number> };
}

export async function extractFromImage(imageUrl: string): Promise<ExtractionResult> {
  const [ocr, face] = await Promise.all([
    Tesseract.recognize(imageUrl, 'eng', { logger: () => {} }),
    extractFaceFromCard(imageUrl).catch(() => null),
  ]);
  const parsed = parseFrontText(ocr.data.text);
  parsed.data.photo = face?.dataUrl ?? imageUrl;
  parsed.confidence.photo = face ? face.confidence / 100 : 0.3;
  return parsed;
}

export async function extractBackFromImage(imageUrl: string): Promise<Partial<ExtractionResult>> {
  const result = await Tesseract.recognize(imageUrl, 'eng', { logger: () => {} });
  return parseBackText(result.data.text);
}

export function mergeExtractions(
  front: ExtractionResult,
  back: Partial<ExtractionResult>,
): ExtractionResult {
  const merged = { ...front };
  if (back.data) {
    for (const [key, val] of Object.entries(back.data)) {
      const k = key as keyof IDCardData;
      if (val && !merged.data[k]) {
        (merged.data as any)[k] = val;
      }
    }
  }
  if (back.confidence) {
    for (const [key, val] of Object.entries(back.confidence)) {
      const k = key as keyof IDCardData;
      if (val && (!merged.confidence[k] || val > merged.confidence[k])) {
        merged.confidence[k] = val;
      }
    }
  }
  return merged;
}

/** Same reference card as `id-card-preview` / Python slot_crop */
const CARD_REF = { w: 850, h: 540 };
const FRONT_PHOTO_PX = { x: 186, y: 171, w: 348, h: 443 };
const FRONT_PHOTO_NORM = {
  x: FRONT_PHOTO_PX.x / CARD_REF.w,
  y: FRONT_PHOTO_PX.y / CARD_REF.h,
  w: FRONT_PHOTO_PX.w / CARD_REF.w,
  h: FRONT_PHOTO_PX.h / CARD_REF.h,
};

/** Client-side portrait slot crop (fallback when image API is unavailable). */
export function cropFrontPortraitFromImage(imageUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        if (!iw || !ih) {
          resolve(null);
          return;
        }
        const sx = Math.round(iw * FRONT_PHOTO_NORM.x);
        const sy = Math.round(ih * FRONT_PHOTO_NORM.y);
        const sw = Math.round(iw * FRONT_PHOTO_NORM.w);
        const sh = Math.round(ih * FRONT_PHOTO_NORM.h);
        if (sw < 16 || sh < 16) {
          resolve(null);
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

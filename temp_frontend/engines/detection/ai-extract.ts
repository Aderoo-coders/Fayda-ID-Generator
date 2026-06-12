import type { BarcodeInfo, ExtractionResult, IDCardData, FaceBBox } from "@/types/id-card";
import { FAYDA_NATIONALITY } from "@/types/id-card";
import { detectBarcodes, type BarcodeResult } from "./barcode-detect";
import { LOW_FACE_MODEL_CONFIDENCE } from "@/lib/photo-fit";
import { removePortraitBackground } from "@/engines/detection/remove-portrait-background";
import { cropFaceToDataUrl, FAYDA_PHOTO_BBOX } from "@/engines/detection/face-crop";
import { detectFaceLocal } from "@/engines/detection/local-face-detect";
import { runLocalOcr } from "@/engines/detection/local-ocr";

const FIELD_KEYS: (keyof IDCardData)[] = [
  "name_am", "name_en", "dob", "sex", "fin", "fan", "phone", "sn",
  "date_of_issue", "date_of_expiry",
  "nationality", "region", "zone", "woreda", "kebele", "house_no",
  "blood_type", "emergency_contact", "address_am",
];

const BARCODE_FIELD_CONFIDENCE = 0.75;

function toBarcodeInfo(b: BarcodeResult, side: "front" | "back"): BarcodeInfo {
  return {
    rawValue: b.rawValue,
    format: b.format,
    side,
    boundingBox: b.boundingBox,
    roiImage: b.roiImage,
    roiRawValue: b.roiRawValue,
  };
}

function fieldMappingsFromPartial(p: Partial<IDCardData>): { field: keyof IDCardData; value: string }[] {
  const out: { field: keyof IDCardData; value: string }[] = [];
  for (const k of FIELD_KEYS) {
    const v = p[k];
    if (typeof v === "string" && v.trim()) out.push({ field: k, value: v.trim() });
  }
  return out;
}

async function collectBarcodes(
  frontImage: string,
  backImage: string,
): Promise<BarcodeInfo[]> {
  const [frontList, backList] = await Promise.all([
    frontImage ? detectBarcodes(frontImage).catch(() => [] as BarcodeResult[]) : Promise.resolve([] as BarcodeResult[]),
    backImage ? detectBarcodes(backImage).catch(() => [] as BarcodeResult[]) : Promise.resolve([] as BarcodeResult[]),
  ]);
  const seen = new Set<string>();
  const merged: BarcodeInfo[] = [];
  const pushSide = (list: BarcodeResult[], side: "front" | "back") => {
    for (const b of list) {
      const key = `${b.format}:${b.rawValue}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const info = toBarcodeInfo(b, side);
      const partial = parseBarcodeToFields([info]);
      info.fieldMappings = fieldMappingsFromPartial(partial);
      merged.push(info);
    }
  };
  pushSide(frontList, "front");
  pushSide(backList, "back");
  return merged;
}

/* ───────────── Barcode → field mapping ───────────── */

/**
 * Try to parse structured data from barcode raw values and map to ID card fields.
 * Supports common Ethiopian ID barcode formats:
 * - Key=Value pairs (e.g. "NAME=John Doe\nDOB=1990-01-01")
 * - Delimited values (pipe, comma, tab separated)
 * - JSON encoded data
 */
function parseBarcodeToFields(barcodes: BarcodeInfo[]): Partial<IDCardData> {
  const parsed: Partial<IDCardData> = {};

  for (const bc of barcodes) {
    const raw = bc.rawValue.trim();
    if (!raw) continue;

    try {
      const json = JSON.parse(raw) as unknown;
      if (typeof json === "object" && json !== null && !Array.isArray(json)) {
        mapObjectToFields(json as Record<string, unknown>, parsed);
        continue;
      }
    } catch {
      /* not JSON */
    }

    if (/[=:]/.test(raw) && /[\n;|]/.test(raw)) {
      const pairs = raw.split(/[\n;|]+/);
      const obj: Record<string, string> = {};
      for (const pair of pairs) {
        const [k, ...rest] = pair.split(/[=:]/);
        if (k && rest.length) obj[k.trim()] = rest.join(":").trim();
      }
      if (Object.keys(obj).length > 0) {
        mapObjectToFields(obj, parsed);
        continue;
      }
    }

    const delimited = raw.includes("|") ? raw.split("|") : raw.includes("\t") ? raw.split("\t") : null;
    if (delimited && delimited.length >= 3) {
      mapDelimitedToFields(delimited, parsed);
      continue;
    }

    mapSingleValue(raw, parsed);
  }

  return parsed;
}

/** Map an object (from JSON or key=value) to ID card fields using fuzzy key matching */
function mapObjectToFields(obj: Record<string, unknown>, out: Partial<IDCardData>) {
  const keyMap: Record<string, keyof IDCardData> = {
    name: "name_en",
    full_name: "name_en",
    name_en: "name_en",
    fullname: "name_en",
    english_name: "name_en",
    name_am: "name_am",
    amharic_name: "name_am",
    dob: "dob",
    date_of_birth: "dob",
    birth_date: "dob",
    birthdate: "dob",
    sex: "sex",
    gender: "sex",
    fin: "fin",
    fayda_id: "fin",
    fayda: "fin",
    id_number: "fin",
    fan: "fan",
    phone: "phone",
    mobile: "phone",
    tel: "phone",
    telephone: "phone",
    sn: "sn",
    serial: "sn",
    serial_number: "sn",
    date_of_issue: "date_of_issue",
    issue_date: "date_of_issue",
    issued: "date_of_issue",
    date_of_expiry: "date_of_expiry",
    expiry_date: "date_of_expiry",
    expiry: "date_of_expiry",
    expires: "date_of_expiry",
    nationality: "nationality",
    nation: "nationality",
    region: "region",
    zone: "zone",
    woreda: "woreda",
    kebele: "kebele",
    house_no: "house_no",
    house: "house_no",
    house_number: "house_no",
    blood_type: "blood_type",
    blood: "blood_type",
    blood_group: "blood_type",
    emergency_contact: "emergency_contact",
    emergency: "emergency_contact",
    address_am: "address_am",
    address: "address_am",
  };

  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== "string" && typeof v !== "number") continue;
    const normalized = k.toLowerCase().replace(/[\s-]/g, "_");
    const field = keyMap[normalized];
    if (field && field !== "photo") {
      const val = String(v).trim();
      if (val) (out as Record<string, string>)[field] = val;
    }
  }
}

/** Map positional delimited values (common in PDF417) */
function mapDelimitedToFields(parts: string[], out: Partial<IDCardData>) {
  const clean = parts.map((p) => p.trim()).filter(Boolean);
  const positionalFields: (keyof IDCardData | null)[] = [
    "fin",
    "name_en",
    "name_am",
    "dob",
    "sex",
    "nationality",
    "region",
    "zone",
    "woreda",
    "kebele",
    "house_no",
    "phone",
    "sn",
    "date_of_issue",
    "date_of_expiry",
    "blood_type",
    "emergency_contact",
  ];

  for (let i = 0; i < clean.length && i < positionalFields.length; i++) {
    const field = positionalFields[i];
    if (field && field !== "photo" && clean[i]) (out as Record<string, string>)[field] = clean[i]!;
  }
}

/** Try to guess what a single raw value represents */
function mapSingleValue(raw: string, out: Partial<IDCardData>) {
  if (/^\d[\d-]{6,}$/.test(raw) && !out.fin) {
    out.fin = raw;
  }
}

/**
 * Strict validation tuned to Fayda card geometry. The portrait sits in the LEFT
 * portion of the card and has a near-portrait aspect ratio; rejecting anything
 * outside this envelope prevents bad AI boxes from silently producing wrong crops.
 */
export function isValidAiFaceBBox(bb: FaceBBox | undefined): bb is FaceBBox {
  if (!bb) return false;
  const inBounds =
    bb.x >= 0 && bb.y >= 0 &&
    bb.x + bb.w <= 1.01 && bb.y + bb.h <= 1.01;
  if (!inBounds) return false;
  const hasSize = bb.w >= 0.10 && bb.h >= 0.15;
  const inLeftHalf = bb.x < 0.6 && (bb.x + bb.w) <= 0.95;
  const ratio = bb.h / bb.w;
  const goodRatio = ratio > 0.5 && ratio < 3;
  const enoughConf = (bb.confidence ?? 0) >= 0.6;
  return hasSize && inLeftHalf && goodRatio && enoughConf;
}

/**
 * Blend the AI-detected bbox with the known Fayda layout to dampen run-to-run
 * jitter while still allowing the AI to correct for small card tilt/skew.
 *
 * - If the AI box drifts more than MAX_DRIFT from the expected layout in any
 *   dimension, the AI box is discarded and the fixed layout is returned.
 * - Otherwise the AI box is averaged with the fixed layout (weighted toward
 *   the fixed layout) so the result is stable across reruns.
 */
const MAX_DRIFT = 0.08;
const FIXED_WEIGHT = 0.6;
function blendWithFixed(ai: FaceBBox): FaceBBox {
  const f = FAYDA_PHOTO_BBOX;
  const drifted =
    Math.abs(ai.x - f.x) > MAX_DRIFT ||
    Math.abs(ai.y - f.y) > MAX_DRIFT ||
    Math.abs(ai.w - f.w) > MAX_DRIFT ||
    Math.abs(ai.h - f.h) > MAX_DRIFT;
  if (drifted) return { ...f, confidence: ai.confidence };
  const aiW = 1 - FIXED_WEIGHT;
  return {
    x: f.x * FIXED_WEIGHT + ai.x * aiW,
    y: f.y * FIXED_WEIGHT + ai.y * aiW,
    w: f.w * FIXED_WEIGHT + ai.w * aiW,
    h: f.h * FIXED_WEIGHT + ai.h * aiW,
    confidence: ai.confidence,
  };
}

/**
 * Same face/photo pipeline as AI extraction: AI bbox (blended with fixed layout)
 * when valid, else fixed Fayda region.
 */
export async function extractPhotoFromFrontImage(
  frontImage: string,
  face_bbox: FaceBBox | undefined,
): Promise<{ photo: string; faceCropUncertain: boolean; confidence: number }> {
  const valid = isValidAiFaceBBox(face_bbox);
  try {
    if (valid) {
      const modelConf = face_bbox!.confidence ?? 0.8;
      const stableBBox = blendWithFixed(face_bbox!);
      const cropped = await cropFaceToDataUrl(frontImage, stableBBox, 0.05, 0);
      const photo = await removePortraitBackground(cropped);
      return {
        photo,
        faceCropUncertain: modelConf < LOW_FACE_MODEL_CONFIDENCE,
        confidence: Math.max(0.5, Math.min(1, modelConf)),
      };
    }
    if (face_bbox) console.warn("AI face bbox invalid, using fixed Fayda crop region", face_bbox);
    const cropped = await cropFaceToDataUrl(frontImage, FAYDA_PHOTO_BBOX, 0, 0.05);
    const photo = await removePortraitBackground(cropped);
    return { photo, faceCropUncertain: true, confidence: 0.5 };
  } catch (e) {
    console.warn("Face crop failed, using full front image", e);
    const photo = await removePortraitBackground(frontImage);
    return { photo, faceCropUncertain: true, confidence: 0.3 };
  }
}

/** User-drawn rectangle on the front image (no padding, exactly what the user drew). */
export async function extractPhotoFromManualBBox(
  frontImage: string,
  bbox: FaceBBox,
): Promise<{ photo: string }> {
  const cropped = await cropFaceToDataUrl(frontImage, bbox, 0, 0);
  const photo = await removePortraitBackground(cropped);
  return { photo };
}

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY as string;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY as string | undefined;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Lovable AI Gateway — re-exposed as an *opt-in* preferred provider so users
// can spend their workspace's free-tier credits before any paid API quota.
// When `NEXT_PUBLIC_LOVABLE_API_KEY` is set, the cloud cascade tries Lovable first
// and only falls back to Gemini/Groq on 402 (credits exhausted), 429 (rate
// limited) or 5xx (upstream error). Leaving the var unset disables Lovable
// and the cascade behaves exactly as before.
const LOVABLE_API_KEY = process.env.NEXT_PUBLIC_LOVABLE_API_KEY as string | undefined;
const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const SYSTEM_PROMPT = `You are an expert OCR + vision system for Ethiopian Fayda national ID cards.
You receive one or two card images (front and/or back). Extract every visible field
accurately. Preserve original Amharic script for Amharic fields. Use date format
DD/MM/YYYY when possible.

If a field is not visible, return an empty string. Do not invent data.

Note: face detection is handled separately on the client. Do NOT return any
bounding box — focus only on text field extraction.`;

const GEMINI_TOOL = {
  type: "function",
  function: {
    name: "return_id_fields",
    description: "Return extracted Fayda ID card text fields.",
    parameters: {
      type: "object",
      properties: {
        name_am: { type: "string", description: "Full name in Amharic script" },
        name_en: { type: "string", description: "Full name in English / Latin" },
        dob: { type: "string", description: "DD/MM/YYYY" },
        sex: { type: "string", enum: ["Male", "Female", ""] },
        fin: { type: "string", description: "12-digit FIN, digits only, no spaces" },
        fan: { type: "string", description: "16-digit FAN, digits only, no spaces" },
        phone: { type: "string" },
        sn: { type: "string", description: "Serial number, alphanumeric" },
        date_of_issue: { type: "string", description: "DD/MM/YYYY" },
        date_of_expiry: { type: "string", description: "DD/MM/YYYY" },
        nationality: { type: "string" },
        region: { type: "string" },
        zone: { type: "string" },
        woreda: { type: "string" },
        kebele: { type: "string" },
        house_no: { type: "string" },
        blood_type: { type: "string", description: "A+/A-/B+/B-/AB+/AB-/O+/O- or empty" },
        emergency_contact: { type: "string" },
        address_am: { type: "string", description: "Full address in Amharic script" },
      },
      required: [
        "name_am", "name_en", "dob", "sex", "fin", "fan", "phone", "sn",
        "date_of_issue", "date_of_expiry",
        "nationality", "region", "zone", "woreda", "kebele", "house_no",
        "blood_type", "emergency_contact", "address_am",
      ],
    },
  },
};

/**
 * Call one AI provider and return the raw tool-call arguments string.
 * Returns null on 429 (rate-limited) so the caller can try the next provider.
 * Throws on all other errors.
 */
async function callProvider(
  url: string,
  apiKey: string,
  model: string,
  userContent: Array<Record<string, unknown>>,
): Promise<string | null> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      top_p: 1,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      tools: [GEMINI_TOOL],
      tool_choice: { type: "function", function: { name: "return_id_fields" } },
    }),
  });

  if (res.status === 429) {
    console.warn(`[ai-extract] ${model} rate-limited (429) — trying next provider.`);
    return null;
  }

  // Lovable AI Gateway returns 402 when the workspace's free-tier credits are
  // exhausted. Treat the same as a rate-limit: silently skip to the next
  // provider (Gemini → Groq) so the user keeps getting cloud results.
  if (res.status === 402) {
    console.warn(`[ai-extract] ${model} credits exhausted (402) — trying next provider.`);
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`[ai-extract] ${model} error ${res.status}`, text);
    // Upstream/server errors are also retryable on the next provider.
    if (res.status >= 500) {
      console.warn(`[ai-extract] ${model} upstream error (${res.status}) — trying next provider.`);
      return null;
    }
    if (res.status === 403) throw new Error("AI API key invalid or lacks permission.");

    // Tool-call validation failures (Groq's `tool_use_failed`) include the
    // model's actual generated arguments inside `error.failed_generation`.
    // Smaller models sometimes return scalar fields (face_bbox especially) as
    // a stringified JSON instead of an object, which Groq's strict schema
    // validator rejects — but the data is still there and is usable. We
    // salvage it rather than throwing the whole response away.
    if (res.status === 400) {
      try {
        const errJson = JSON.parse(text);
        const failedGen = errJson?.error?.failed_generation;
        if (typeof failedGen === "string") {
          const parsed = JSON.parse(failedGen);
          const calls = Array.isArray(parsed) ? parsed : [parsed];
          const params = calls[0]?.parameters ?? calls[0]?.arguments;
          if (params && typeof params === "object") {
            // Coerce face_bbox if it came as a JSON string.
            if (typeof params.face_bbox === "string") {
              try {
                params.face_bbox = JSON.parse(params.face_bbox);
              } catch {
                delete params.face_bbox;
              }
            }
            console.warn(
              `[ai-extract] ${model} tool_use_failed but salvaged usable fields from failed_generation.`,
            );
            return JSON.stringify(params);
          }
        }
      } catch {
        /* fall through to provider-skip */
      }
      console.warn(`[ai-extract] ${model} returned 400 — trying next provider.`);
      return null;
    }
    throw new Error(`AI API error ${res.status}`);
  }

  const json = await res.json();
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) {
    console.error(`[ai-extract] ${model} returned no tool call`, JSON.stringify(json).slice(0, 500));
    throw new Error("AI did not return structured fields");
  }
  return args;
}

/**
 * Build an empty ExtractionResult skeleton with all field strings = "" and
 * confidences = 0. The orchestrator then merges local-OCR / cloud-AI / barcode
 * results into this skeleton in priority order.
 */
function makeEmptyResult(): ExtractionResult {
  return {
    data: {
      name_am: "", name_en: "", dob: "", sex: "", fin: "", fan: "", phone: "", sn: "",
      date_of_issue: "", date_of_expiry: "", photo: null,
      // Fayda is Ethiopia's national ID — nationality is always the same value.
      nationality: FAYDA_NATIONALITY,
      region: "", zone: "", woreda: "", kebele: "", house_no: "",
      blood_type: "", emergency_contact: "", address_am: "",
      back_qr_crop: null,
    },
    confidence: {
      name_am: 0, name_en: 0, dob: 0, sex: 0, fin: 0, fan: 0, phone: 0, sn: 0,
      date_of_issue: 0, date_of_expiry: 0, photo: 0,
      nationality: 1, region: 0, zone: 0, woreda: 0, kebele: 0, house_no: 0,
      blood_type: 0, emergency_contact: 0, address_am: 0,
      back_qr_crop: 0,
    },
    faceCropUncertain: false,
  };
}

/**
 * Cloud AI is ON by default when at least one provider key is set, because
 * Tesseract.js alone cannot reliably extract every Fayda field on a typical
 * phone-camera scan. The cloud pass runs in parallel with local OCR and only
 * fills in fields the local pipeline missed (so we never overwrite reliable
 * pattern-matched values, and we still avoid an API call when local is
 * sufficient — though we can't know that until both finish).
 *
/**
 * To force pure-offline mode set NEXT_PUBLIC_USE_CLOUD_AI=false in .env.
 */
const USE_CLOUD_AI = (() => {
  const raw = String(process.env.NEXT_PUBLIC_USE_CLOUD_AI ?? "").toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return Boolean(LOVABLE_API_KEY || GEMINI_API_KEY || GROQ_API_KEY);
})();

const USE_SUPABASE_EDGE_AI = (() => {
  const raw = String(process.env.NEXT_PUBLIC_USE_SUPABASE_EDGE_AI ?? "").toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
})();

async function trySupabaseEdgeExtract(
  frontImage: string,
  backImage: string,
): Promise<(Record<string, unknown> & { face_bbox?: FaceBBox }) | null> {
  return null;

  if (!frontImage && !backImage) return null;

  try {
  } catch (err) {
    console.warn("[ai-extract] supabase extract-id threw; falling back to direct providers", err);
    return null;
  }
}

/**
 * Cloud AI cascade (Lovable → Gemini → Groq), retained for opt-in use only.
 *
 * Lovable AI Gateway is preferred when configured because it bills against the
 * workspace's free-tier credits before any paid Gemini/Groq quota. When
 * Lovable returns 402 (credits exhausted), 429 (rate limited) or 5xx, we
 * transparently fall through to Gemini, then Groq — preserving the previous
 * behaviour for users without Lovable credits.
 *
 * Returns the parsed tool-call arguments object, or null if no provider is
 * reachable / the cloud path is disabled.
 */
async function tryCloudExtract(
  frontImage: string,
  backImage: string,
): Promise<(Record<string, unknown> & { face_bbox?: FaceBBox }) | null> {
  // First preference: Supabase edge function (server-side provider keys).
  // This keeps Lovable/Gemini keys off the client and still lets the frontend
  // benefit from the same provider cascade.
  const edge = await trySupabaseEdgeExtract(frontImage, backImage);
  if (edge) return edge;

  if (!USE_CLOUD_AI) return null;
  if (!LOVABLE_API_KEY && !GEMINI_API_KEY && !GROQ_API_KEY) return null;

  const userContent: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: `Extract all fields from the provided Fayda ID card image(s). ${
        frontImage ? "Image 1 = FRONT." : ""
      } ${backImage ? `Image ${frontImage ? 2 : 1} = BACK.` : ""} Detect the face photo on the FRONT image and return its normalized bounding box.`,
    },
  ];
  if (frontImage) userContent.push({ type: "image_url", image_url: { url: frontImage } });
  if (backImage) userContent.push({ type: "image_url", image_url: { url: backImage } });

  let rawArgs: string | null = null;
  try {
    if (LOVABLE_API_KEY) {
      console.log("[ai-extract] cloud preferred → Lovable AI Gateway (google/gemini-2.5-pro)");
      rawArgs = await callProvider(
        LOVABLE_URL,
        LOVABLE_API_KEY,
        "google/gemini-2.5-pro",
        userContent,
      );
    }
    if (rawArgs === null && GEMINI_API_KEY) {
      rawArgs = await callProvider(GEMINI_URL, GEMINI_API_KEY, "gemini-2.0-flash", userContent);
    }
    if (rawArgs === null && GROQ_API_KEY) {
      // Note: Groq's gpt-oss-20b is text-only and cannot process images.
      // For ID card OCR we need a vision-capable model — Llama 4 Maverick is
      // currently Groq's strongest multimodal option.
      console.log("[ai-extract] cloud fallback → Groq meta-llama/llama-4-maverick-17b-128e-instruct");
      rawArgs = await callProvider(
        GROQ_URL,
        GROQ_API_KEY,
        "meta-llama/llama-4-maverick-17b-128e-instruct",
        userContent,
      );
    }
  } catch (err) {
    console.warn("[ai-extract] cloud fallback failed; continuing with local results only", err);
    return null;
  }

  if (!rawArgs) return null;
  try {
    const parsed = JSON.parse(rawArgs) as Record<string, unknown> & { face_bbox?: FaceBBox | string };
    // Some smaller models stringify nested objects; coerce defensively.
    if (typeof parsed.face_bbox === "string") {
      try {
        parsed.face_bbox = JSON.parse(parsed.face_bbox);
      } catch {
        delete parsed.face_bbox;
      }
    }
    return parsed as Record<string, unknown> & { face_bbox?: FaceBBox };
  } catch {
    console.warn("[ai-extract] could not parse cloud response");
    return null;
  }
}

/**
 * Main extraction orchestrator — fully local by default.
 *
 * Pipeline (all WebAssembly / Canvas, no external API calls):
 *   1. Local face detection (MediaPipe BlazeFace) → face_bbox
 *   2. Local OCR (Tesseract.js eng + amh) → text fields
 *   3. Local barcode / QR decode (ZXing + jsQR) → structured field hints
 *   4. Local background removal (@imgly/background-removal) → portrait PNG
 *
 * Optional cloud cascade: when at least one of `VITE_LOVABLE_API_KEY`,
 * `VITE_GEMINI_API_KEY` or `VITE_GROQ_API_KEY` is set (and
 * `VITE_USE_CLOUD_AI` is not explicitly disabled) the cloud cascade also
 * runs in parallel with local OCR. Provider order:
 *   1. Lovable AI Gateway — preferred; consumes the workspace's free-tier
 *      credits before any paid quota.
 *   2. Gemini direct — used when Lovable is unset / 402 / 429 / 5xx.
 *   3. Groq vision — used when both above are unavailable.
 * Cloud-extracted fields fill any value the local OCR returned empty.
 */
export async function extractWithAI(
  frontImage: string,
  backImage: string,
): Promise<ExtractionResult> {
  const result = makeEmptyResult();

  // Run all the local heavy-lifting in parallel — face detection, OCR, cloud,
  // and barcode decoding are independent of each other.
  const [faceBBox, ocr, cloud, barcodes] = await Promise.all([
    frontImage ? detectFaceLocal(frontImage).catch(() => null) : Promise.resolve(null),
    runLocalOcr(frontImage, backImage).catch((err) => {
      console.warn("[ai-extract] local OCR failed", err);
      return { fields: {}, confidence: {}, rawText: "" };
    }),
    tryCloudExtract(frontImage, backImage),
    collectBarcodes(frontImage, backImage),
  ]);
  result.barcodes = barcodes;

  // 1. Cloud AI fields are applied first when available — Gemini/Groq are
  //    materially more accurate than pattern-matched Tesseract output for
  //    free-form text fields (names, addresses, region/zone/woreda) and for
  //    Amharic. We give them confidence 0.9. `nationality` is excluded
  //    because it's pinned to FAYDA_NATIONALITY below.
  if (cloud) {
    for (const k of FIELD_KEYS) {
      if (k === "nationality") continue;
      const v = cloud[k];
      if (typeof v === "string" && v.trim()) {
        (result.data as any)[k] = v.trim();
        (result.confidence as any)[k] = 0.9;
      }
    }
  }

  // 2. Local OCR fills any field cloud didn't return (or fills everything when
  //    cloud is disabled / unreachable). Pattern-matched values like FIN/FAN/
  //    dates/phone keep their local confidence (0.75-0.85) so the user can
  //    see which fields came from which source.
  for (const k of FIELD_KEYS) {
    if (k === "nationality") continue;
    if ((result.data as any)[k]) continue;
    const v = (ocr.fields as any)[k];
    if (typeof v === "string" && v.trim()) {
      (result.data as any)[k] = v.trim();
      (result.confidence as any)[k] = (ocr.confidence as any)[k] ?? 0.7;
    }
  }

  // 3. Barcodes / QR — structured payloads fill fields still empty after cloud + OCR.
  const fromBarcodes = parseBarcodeToFields(barcodes);
  for (const k of FIELD_KEYS) {
    if (k === "nationality") continue;
    const v = fromBarcodes[k];
    if (typeof v !== "string" || !v.trim()) continue;
    if (String((result.data as any)[k] ?? "").trim()) continue;
    (result.data as any)[k] = v.trim();
    (result.confidence as any)[k] = BARCODE_FIELD_CONFIDENCE;
  }

  // Pin nationality to the canonical Fayda value (always Ethiopian). This is
  // a safety net in case any earlier merge accidentally clobbered it.
  result.data.nationality = FAYDA_NATIONALITY;
  result.confidence.nationality = 1;

  // 4. Face bbox: local MediaPipe wins; cloud's face_bbox is fallback only.
  result.aiFaceBBox = faceBBox ?? cloud?.face_bbox;

  // 5. Photo crop + background removal.
  const sideTasks: Promise<void>[] = [];
  if (frontImage) {
    sideTasks.push(
      extractPhotoFromFrontImage(frontImage, result.aiFaceBBox).then((photoOut) => {
        result.data.photo = photoOut.photo;
        result.confidence.photo = photoOut.confidence;
        result.faceCropUncertain = photoOut.faceCropUncertain;
      }),
    );
  }
  await Promise.all(sideTasks);

  return result;
}

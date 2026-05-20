/**
 * Face extraction for Fayda ID cards.
 *
 * Strategy:
 *  1. Normalize the source image to a fixed canvas size (2000x1300) so
 *     coordinates are predictable regardless of upload resolution.
 *  2. Try the browser's native FaceDetector API (Chromium) to locate the face.
 *  3. Fallback to a fixed crop region matching the Fayda layout (left side
 *     of the card) when detection is unavailable or fails.
 *  4. Return a cropped, centered face as a PNG data URL plus a confidence
 *     score and bounding box (in normalized-canvas coordinates).
 */

export interface FaceExtractionResult {
  face_detected: boolean;
  confidence: number; // 0-100
  bbox: { x: number; y: number; w: number; h: number };
  dataUrl: string;
}

const NORM_W = 2000;
const NORM_H = 1300;

// Fixed fallback region for the Fayda layout (portrait, face top-center).
// Normalized from 784×1281 source: x=210, y=173, w=341, h=437.
const FALLBACK_BBOX = {
  x: Math.round(NORM_W * 0.268),
  y: Math.round(NORM_H * 0.135),
  w: Math.round(NORM_W * 0.435),
  h: Math.round(NORM_H * 0.341),
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function normalize(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = NORM_W;
  canvas.height = NORM_H;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, NORM_W, NORM_H);
  return canvas;
}

function cropToDataUrl(
  source: HTMLCanvasElement,
  bbox: { x: number; y: number; w: number; h: number },
): string {
  // Pad the crop slightly so the full face is visible with minimal noise.
  const padX = Math.round(bbox.w * 0.1);
  const padY = Math.round(bbox.h * 0.1);
  const x = Math.max(0, bbox.x - padX);
  const y = Math.max(0, bbox.y - padY);
  const w = Math.min(NORM_W - x, bbox.w + padX * 2);
  const h = Math.min(NORM_H - y, bbox.h + padY * 2);

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(source, x, y, w, h, 0, 0, w, h);
  return out.toDataURL('image/png');
}

async function detectWithBrowser(
  canvas: HTMLCanvasElement,
): Promise<{ x: number; y: number; w: number; h: number } | null> {
  // FaceDetector is non-standard (Chromium only); guard carefully.
  const FD = (window as unknown as { FaceDetector?: new (opts?: unknown) => {
    detect: (src: CanvasImageSource) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
  } }).FaceDetector;
  if (!FD) return null;
  try {
    const detector = new FD({ fastMode: true, maxDetectedFaces: 3 });
    const faces = await detector.detect(canvas);
    if (!faces || faces.length === 0) return null;
    // Prefer the largest face on the LEFT half of the card (Fayda layout).
    const leftFaces = faces.filter(f => f.boundingBox.x < NORM_W * 0.5);
    const pool = leftFaces.length > 0 ? leftFaces : faces;
    const best = pool.reduce((a, b) =>
      a.boundingBox.width * a.boundingBox.height >
      b.boundingBox.width * b.boundingBox.height
        ? a
        : b,
    );
    const b = best.boundingBox;
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  } catch {
    return null;
  }
}

export async function extractFaceFromCard(
  imageUrl: string,
): Promise<FaceExtractionResult> {
  const img = await loadImage(imageUrl);
  const canvas = normalize(img);

  const detected = await detectWithBrowser(canvas);

  if (detected) {
    // Sanity-check the detected box. A valid Fayda face crop should:
    //  - cover a meaningful portion of the card height (not a tiny stray match)
    //  - sit on the LEFT side of the card where the photo lives
    const areaRatio = (detected.w * detected.h) / (NORM_W * NORM_H);
    const centerX = detected.x + detected.w / 2;
    const centerY = detected.y + detected.h / 2;
    const expectedCenterX = FALLBACK_BBOX.x + FALLBACK_BBOX.w / 2;
    const expectedCenterY = FALLBACK_BBOX.y + FALLBACK_BBOX.h / 2;
    const offsetX = Math.abs(centerX - expectedCenterX) / NORM_W;
    const offsetY = Math.abs(centerY - expectedCenterY) / NORM_H;

    const tooSmall = areaRatio < 0.02; // <2% of card area => suspicious
    const offCenter = offsetX > 0.18 || offsetY > 0.18; // far from photo region

    if (tooSmall || offCenter) {
      const reasons = [
        tooSmall ? 'box too small' : null,
        offCenter ? 'off-center from photo region' : null,
      ].filter(Boolean).join(', ');
      console.warn(
        `[face-extract] Detected face rejected (${reasons}); falling back to fixed left-side crop.`,
      );
      return {
        face_detected: false,
        confidence: 45,
        bbox: { ...FALLBACK_BBOX },
        dataUrl: cropToDataUrl(canvas, FALLBACK_BBOX),
      };
    }

    // Confidence scales down slightly with how far the box drifts from the
    // expected photo center, capped at 90.
    const drift = Math.min(1, (offsetX + offsetY) / 0.36);
    const confidence = Math.round(90 - drift * 25);

    return {
      face_detected: true,
      confidence,
      bbox: {
        x: Math.round(detected.x),
        y: Math.round(detected.y),
        w: Math.round(detected.w),
        h: Math.round(detected.h),
      },
      dataUrl: cropToDataUrl(canvas, detected),
    };
  }

  // Fallback: fixed Fayda layout region.
  return {
    face_detected: false,
    confidence: 50,
    bbox: { ...FALLBACK_BBOX },
    dataUrl: cropToDataUrl(canvas, FALLBACK_BBOX),
  };
}

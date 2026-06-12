/**
 * Image preprocessing for local OCR — pure Canvas 2D, no WASM model required.
 *
 * Tesseract.js degrades sharply on dim, blurry, or low-contrast scans. These
 * helpers run cheap classical CV transforms (grayscale, contrast stretch,
 * adaptive thresholding, mild sharpen) to give the OCR engine a much cleaner
 * signal. Everything here runs in the browser's main thread on a `<canvas>`,
 * so there is no extra dependency cost.
 */

import { NORM_W, NORM_H } from '@/engines/detection/face-crop';

/** Normalized 0..1 region on the canonical NORM_W × NORM_H card canvas. */
export interface PixelRegion {
  x: number; y: number; w: number; h: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Draw the source image onto a fresh NORM_W × NORM_H canvas so every downstream
 * step can use stable pixel coordinates regardless of the user's upload size.
 */
export async function normalizeCardCanvas(srcDataUrl: string): Promise<HTMLCanvasElement> {
  const img = await loadImage(srcDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = NORM_W;
  canvas.height = NORM_H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, NORM_W, NORM_H);
  return canvas;
}

/**
 * Crop a region from the normalized canvas into a fresh canvas, optionally
 * upscaling it (Tesseract benefits from larger glyphs — ~32 px x-height is a
 * sweet spot, so we 2× small regions).
 */
export function cropRegion(
  source: HTMLCanvasElement,
  region: PixelRegion,
  upscale = 2,
): HTMLCanvasElement {
  const w = Math.max(1, Math.round(region.w));
  const h = Math.max(1, Math.round(region.h));
  const dst = document.createElement('canvas');
  dst.width = w * upscale;
  dst.height = h * upscale;
  const ctx = dst.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    source,
    Math.max(0, Math.round(region.x)),
    Math.max(0, Math.round(region.y)),
    w, h,
    0, 0,
    dst.width, dst.height,
  );
  return dst;
}

/**
 * In-place grayscale + linear contrast stretch (a simplified CLAHE) tuned for
 * dark-text-on-light-background ID card fields. We:
 *   1. Convert to luminance (Rec.601).
 *   2. Compute the 2nd / 98th percentiles of the histogram.
 *   3. Linearly remap that range to 0..255 so faint print pops.
 *   4. Apply a mild gamma to keep dark strokes solid.
 */
export function enhanceForOcr(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const N = data.length / 4;

  const lum = new Uint8ClampedArray(N);
  const hist = new Uint32Array(256);
  for (let i = 0, j = 0; j < N; i += 4, j++) {
    const y = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
    lum[j] = y;
    hist[y]++;
  }

  const lowTarget = N * 0.02;
  const highTarget = N * 0.98;
  let acc = 0, lo = 0, hi = 255;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= lowTarget) { lo = v; break; } }
  acc = 0;
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= N - highTarget) { hi = v; break; } }
  if (hi <= lo) { lo = 0; hi = 255; }

  const range = hi - lo;
  const gamma = 0.85;
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    const stretched = Math.max(0, Math.min(255, ((v - lo) * 255) / range));
    lut[v] = Math.round(255 * Math.pow(stretched / 255, gamma));
  }

  for (let i = 0, j = 0; j < N; i += 4, j++) {
    const y = lut[lum[j]];
    data[i] = y;
    data[i + 1] = y;
    data[i + 2] = y;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Otsu's global threshold — picks the gray level that maximises the
 * between-class variance of foreground vs. background pixels. The classic
 * binarization technique for printed text and the single biggest accuracy
 * boost you can hand Tesseract.
 *
 * Expects an already-grayscale canvas (call `enhanceForOcr` first). Mutates
 * the canvas in place to a 1-bit black/white image (encoded as 0 or 255).
 */
export function binarizeOtsu(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const N = data.length / 4;

  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) hist[data[i]]++;

  let total = 0;
  for (let v = 0; v < 256; v++) total += v * hist[v];

  let wB = 0, sumB = 0, maxVar = -1, threshold = 127;
  for (let v = 0; v < 256; v++) {
    wB += hist[v];
    if (wB === 0) continue;
    const wF = N - wB;
    if (wF === 0) break;
    sumB += v * hist[v];
    const mB = sumB / wB;
    const mF = (total - sumB) / wF;
    const varBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varBetween > maxVar) {
      maxVar = varBetween;
      threshold = v;
    }
  }

  // Slight inward bias keeps thin glyph edges intact on faint print.
  const t = Math.max(0, threshold - 5);
  for (let i = 0; i < data.length; i += 4) {
    const bw = data[i] > t ? 255 : 0;
    data[i] = bw;
    data[i + 1] = bw;
    data[i + 2] = bw;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Convert a canvas to a PNG data URL (Tesseract accepts both, but data URLs
 * survive serialization between worker boundaries cleanly).
 */
export function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

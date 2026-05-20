import type { FaceBBox } from '@/types/id-card';

export const NORM_W = 2000;
export const NORM_H = 1300;

/**
 * Fixed Fayda photo region (normalized from 784×1281 source: x=210, y=173, w=341, h=437).
 * y shifted up by 0.04 and h extended by 0.04 to include the full hairline/forehead.
 */
export const FAYDA_PHOTO_BBOX: FaceBBox = { x: 0.268, y: 0.095, w: 0.435, h: 0.381 };

const MIN_W = 0.04; 
const MIN_H = 0.04;

export function clampBBox(b: FaceBBox): FaceBBox {
  let { x, y, w, h } = b;
  w = Math.max(MIN_W, Math.min(w, 1));
  h = Math.max(MIN_H, Math.min(h, 1));
  x = Math.max(0, Math.min(x, 1 - w));
  y = Math.max(0, Math.min(y, 1 - h));
  return { x, y, w, h };
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
 * Crop a normalized region (0..1 of source image) to a PNG data URL.
 * Source is drawn into an NORM_W×NORM_H canvas first for stable output scale.
 *
 * Callers should pass explicit values for both pad and padTopExtra to make the
 * crop output deterministic and match any preview shown to the user.
 *
 * @param pad         Uniform padding fraction (relative to crop w/h) on all sides.
 * @param padTopExtra Additional fraction added only above the box to preserve hairline.
 *                    Use 0 when the bbox already includes the hairline (AI face boxes
 *                    and user-drawn manual boxes); use a small positive value only
 *                    for tight measured boxes that exclude the hairline.
 */
export async function cropFaceToDataUrl(
  frontImageUrl: string,
  bbox: FaceBBox,
  pad = 0,
  padTopExtra = 0,
): Promise<string> {
  const b = clampBBox(bbox);
  const img = await loadImage(frontImageUrl);
  const norm = document.createElement('canvas');
  norm.width = NORM_W;
  norm.height = NORM_H;
  norm.getContext('2d')!.drawImage(img, 0, 0, NORM_W, NORM_H);

  const px = {
    x: Math.round(b.x * NORM_W),
    y: Math.round(b.y * NORM_H),
    w: Math.round(b.w * NORM_W),
    h: Math.round(b.h * NORM_H),
  };
  const padX = Math.round(px.w * pad);
  const padY = Math.round(px.h * pad);
  const padTop = Math.round(px.h * padTopExtra);

  const x = Math.max(0, px.x - padX);
  const y = Math.max(0, px.y - padY - padTop);
  const w = Math.min(NORM_W - x, px.w + padX * 2);
  const h = Math.min(NORM_H - y, px.h + padY * 2 + padTop);

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  out.getContext('2d')!.drawImage(norm, x, y, w, h, 0, 0, w, h);
  return out.toDataURL('image/png');
}

export interface TrimEmptyEdgesOptions {
  /** Pixel alpha below this is considered empty (transparent / segmentation residue). */
  alphaThreshold?: number;
  /** Lightness (max RGB channel) at or above this with low chroma is treated as empty. */
  lightnessThreshold?: number;
  /** Max chroma (max-min RGB) for a "light desaturated" pixel to count as empty. */
  chromaThreshold?: number;
  /** Per-row/column emptiness ratio (0..1) above which the row/column is trimmed. */
  emptyRatio?: number;
  /** Maximum fraction of width/height that can be trimmed from any single side. */
  maxTrimFraction?: number;
  /** When true, logs debugging info about what was trimmed. */
  debug?: boolean;
}

/**
 * Auto-trim card-background residue (transparent OR light/low-chroma pixels) from the
 * edges of a PNG. The Fayda card's photo border is a light cream color, so we treat
 * any "light + low saturation" pixel as background, not just pure white.
 *
 * Defaults are tuned to remove the ~1-15px sliver that segmentation leaves below the
 * portrait without trimming into skin (high chroma) or hair (low lightness).
 */
export async function trimEmptyEdges(
  dataUrl: string,
  opts: TrimEmptyEdgesOptions = {},
): Promise<string> {
  const {
    alphaThreshold = 60,
    lightnessThreshold = 205,
    chromaThreshold = 35,
    emptyRatio = 0.85,
    maxTrimFraction = 0.20,
    debug = false,
  } = opts;

  try {
    const img = await loadImage(dataUrl);
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    if (W < 4 || H < 4) return dataUrl;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, W, H).data;

    const isEmptyAt = (i: number) => {
      const a = data[i + 3];
      if (a < alphaThreshold) return true;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = r > g ? (r > b ? r : b) : (g > b ? g : b);
      const min = r < g ? (r < b ? r : b) : (g < b ? g : b);
      return max >= lightnessThreshold && (max - min) <= chromaThreshold;
    };

    const rowEmptyCount = (y: number) => {
      let c = 0;
      const base = y * W * 4;
      for (let x = 0; x < W; x++) {
        if (isEmptyAt(base + x * 4)) c++;
      }
      return c;
    };

    const colEmptyCount = (x: number) => {
      let c = 0;
      const xOff = x * 4;
      for (let y = 0; y < H; y++) {
        if (isEmptyAt(y * W * 4 + xOff)) c++;
      }
      return c;
    };

    const maxTrimY = Math.floor(H * maxTrimFraction);
    const maxTrimX = Math.floor(W * maxTrimFraction);

    let top = 0;
    while (top < maxTrimY && rowEmptyCount(top) / W >= emptyRatio) top++;

    let bottom = H - 1;
    let trimmedBottom = 0;
    while (trimmedBottom < maxTrimY && rowEmptyCount(bottom) / W >= emptyRatio) {
      bottom--;
      trimmedBottom++;
    }

    let left = 0;
    while (left < maxTrimX && colEmptyCount(left) / H >= emptyRatio) left++;

    let right = W - 1;
    let trimmedRight = 0;
    while (trimmedRight < maxTrimX && colEmptyCount(right) / H >= emptyRatio) {
      right--;
      trimmedRight++;
    }

    const newW = right - left + 1;
    const newH = bottom - top + 1;
    if (newW <= 0 || newH <= 0) return dataUrl;
    if (top === 0 && left === 0 && right === W - 1 && bottom === H - 1) {
      if (debug) console.log('[trimEmptyEdges] nothing trimmed', { W, H });
      return dataUrl;
    }

    if (debug) {
      console.log('[trimEmptyEdges] trimmed', {
        from: { W, H },
        to: { W: newW, H: newH },
        sides: { top, bottom: trimmedBottom, left, right: trimmedRight },
      });
    }

    const out = document.createElement('canvas');
    out.width = newW;
    out.height = newH;
    out.getContext('2d')!.drawImage(canvas, left, top, newW, newH, 0, 0, newW, newH);
    return out.toDataURL('image/png');
  } catch (e) {
    console.warn('trimEmptyEdges failed; returning untrimmed image.', e);
    return dataUrl;
  }
}

/**
 * Local face detection using MediaPipe Tasks Vision (WebAssembly).
 *
 * Replaces the AI face_bbox call with a fully in-browser inference. The
 * BlazeFace short-range model (~230 KB) is downloaded once from a CDN, cached
 * by the browser, and then loaded into a WASM runtime. No external API calls,
 * no rate limits, no API keys.
 *
 * Returns a normalized FaceBBox that plugs straight into the existing
 * `extractPhotoFromFrontImage` pipeline (which validates, blends with the fixed
 * Fayda layout, then crops and removes the background).
 */
import { FaceDetector, FilesetResolver, type Detection } from '@mediapipe/tasks-vision';
import type { FaceBBox } from '@/types/id-card';

/**
 * MediaPipe ships its WASM runtime + face detection model on a CDN. We pin to a
 * specific version of the Tasks Vision package so cache keys stay stable.
 */
const WASM_BASE_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

let detectorPromise: Promise<FaceDetector> | null = null;

/**
 * Lazily construct (and cache) the FaceDetector. The first call downloads the
 * WASM runtime + model; subsequent calls reuse the same instance. Runs in
 * IMAGE mode for one-shot inference on uploaded ID card photos.
 */
async function getDetector(): Promise<FaceDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
      return FaceDetector.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.5,
      });
    })().catch((err) => {
      // Reset on failure so the next call retries (helps after offline → online).
      detectorPromise = null;
      throw err;
    });
  }
  return detectorPromise;
}

/**
 * Decode a data URL or remote URL into an HTMLImageElement.
 */
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
 * Convert a MediaPipe Detection into our normalized FaceBBox shape.
 *
 * MediaPipe returns absolute pixel boxes against the source image dimensions,
 * so we divide by the image width/height to get a 0..1 box that matches what
 * the rest of the pipeline expects (FAYDA_PHOTO_BBOX, AI bbox, manual bbox).
 */
function toNormalizedBBox(
  detection: Detection,
  imgW: number,
  imgH: number,
): FaceBBox | null {
  const bb = detection.boundingBox;
  if (!bb) return null;
  const conf = detection.categories?.[0]?.score ?? 0.8;
  return {
    x: bb.originX / imgW,
    y: bb.originY / imgH,
    w: bb.width / imgW,
    h: bb.height / imgH,
    confidence: Math.max(0, Math.min(1, conf)),
  };
}

/**
 * Pick the most plausible face from MediaPipe's detections.
 *
 * Cards may contain logos, watermarks, or stylized art that BlazeFace
 * occasionally interprets as a face. We prefer:
 *   1. The largest detection by area (the portrait should dominate the
 *      candidate set on a clean Fayda scan).
 *   2. As a tiebreaker, higher confidence wins.
 */
function pickBestFace(
  detections: Detection[],
  imgW: number,
  imgH: number,
): FaceBBox | null {
  const candidates = detections
    .map((d) => toNormalizedBBox(d, imgW, imgH))
    .filter((b): b is FaceBBox => b !== null);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const areaA = a.w * a.h;
    const areaB = b.w * b.h;
    if (Math.abs(areaA - areaB) > 0.01) return areaB - areaA;
    return (b.confidence ?? 0) - (a.confidence ?? 0);
  });

  return candidates[0];
}

/**
 * Run local face detection on a front-of-card image.
 *
 * @returns The best FaceBBox in normalized 0..1 coordinates, or `null` when no
 *          face is detected. The caller (ai-extract.ts) will fall back to the
 *          fixed Fayda layout region in that case.
 */
export async function detectFaceLocal(frontImageDataUrl: string): Promise<FaceBBox | null> {
  try {
    const [detector, img] = await Promise.all([
      getDetector(),
      loadImage(frontImageDataUrl),
    ]);

    const W = img.naturalWidth;
    const H = img.naturalHeight;
    if (W === 0 || H === 0) return null;

    // MediaPipe accepts HTMLImageElement directly in IMAGE mode.
    const result = detector.detect(img);
    return pickBestFace(result.detections, W, H);
  } catch (err) {
    console.warn('[local-face-detect] inference failed; falling back', err);
    return null;
  }
}

/**
 * Eagerly warm up the detector so the first real extraction call doesn't pay
 * the model-download latency. Safe to fire-and-forget on app boot.
 */
export function warmUpFaceDetector(): void {
  void getDetector().catch(() => {
    /* swallow — getDetector() already resets its promise on failure */
  });
}

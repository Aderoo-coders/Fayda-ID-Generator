import { scanCanvas, imageToCanvas, type Detection } from "@/engines/detection/qr-scan";

export interface BarcodeBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BarcodeDetection {
  boundingBox?: BarcodeBBox;
  format: string;
  rawValue: string;
}

export interface BarcodeResult extends BarcodeDetection {
  /** Cropped ROI image (data URL) of the barcode region */
  roiImage?: string;
  /** Re-decoded value from the cropped ROI (mirrors rawValue when scan succeeded) */
  roiRawValue?: string;
  /** Polygon corners (image-space coordinates) when available */
  points?: { x: number; y: number }[];
}

/**
 * Pipeline:
 *  1) Image → Canvas (downscaled to ≤1600px on the long side)
 *  2) ZXing whole-image + jsQR pass for primary detection
 *  3) Tiled sweep (3x3 with 30% overlap) for multi-barcode robustness
 *  4) Each detection carries its own cropped ROI data URL
 */
export async function detectBarcodes(imageUrl: string): Promise<BarcodeResult[]> {
  const canvas = await imageToCanvas(imageUrl);
  const detections = await scanCanvas(canvas);
  return detections.map(toBarcodeResult);
}

function toBarcodeResult(d: Detection): BarcodeResult {
  return {
    rawValue: d.value,
    format: d.type.toLowerCase(), // e.g. "qr_code", "code_128" — matches existing consumers
    boundingBox: d.bbox,
    roiImage: d.cropDataUrl,
    roiRawValue: d.value,
    points: d.points,
  };
}

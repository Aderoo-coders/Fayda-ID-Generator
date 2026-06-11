import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from "@zxing/library";
import type { Result } from "@zxing/library";
import jsQR from "jsqr";

export type Detection = {
  id: string;
  type: string;
  value: string;
  bbox: { x: number; y: number; width: number; height: number };
  points?: { x: number; y: number }[];
  cropDataUrl: string;
};

const FORMATS = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.PDF_417,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.AZTEC,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
];

function makeReader() {
  const reader = new MultiFormatReader();
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);
  reader.setHints(hints);
  return reader;
}

function rgbaToLuminanceSource(data: Uint8ClampedArray, w: number, h: number) {
  const lum = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    lum[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
  }
  return new RGBLuminanceSource(lum, w, h);
}

function pointsToBBox(points: { x: number; y: number }[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function cropCanvas(
  source: HTMLCanvasElement,
  bbox: { x: number; y: number; width: number; height: number },
  pad = 12,
) {
  const x = Math.max(0, Math.floor(bbox.x - pad));
  const y = Math.max(0, Math.floor(bbox.y - pad));
  const w = Math.min(source.width - x, Math.ceil(bbox.width + pad * 2));
  const h = Math.min(source.height - y, Math.ceil(bbox.height + pad * 2));
  const c = document.createElement("canvas");
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(source, x, y, c.width, c.height, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}

function tryDecodeRegion(
  reader: InstanceType<typeof MultiFormatReader>,
  imageData: ImageData,
): Result | null {
  try {
    const src = rgbaToLuminanceSource(imageData.data, imageData.width, imageData.height);
    const bitmap = new BinaryBitmap(new HybridBinarizer(src));
    return reader.decode(bitmap);
  } catch {
    return null;
  }
}

export async function scanCanvas(canvas: HTMLCanvasElement): Promise<Detection[]> {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const fullData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const reader = makeReader();
  const detections: Detection[] = [];
  const seen = new Set<string>();

  // 1) jsQR for QR (handles multiple via tile sweep + perspective)
  const qr = jsQR(fullData.data, fullData.width, fullData.height, {
    inversionAttempts: "attemptBoth",
  });
  if (qr) {
    const points = [
      qr.location.topLeftCorner,
      qr.location.topRightCorner,
      qr.location.bottomRightCorner,
      qr.location.bottomLeftCorner,
    ];
    const bbox = pointsToBBox(points);
    const key = `QR:${qr.data}`;
    if (!seen.has(key)) {
      seen.add(key);
      detections.push({
        id: key,
        type: "QR_CODE",
        value: qr.data,
        bbox,
        points,
        cropDataUrl: cropCanvas(canvas, bbox),
      });
    }
  }

  // 2) Whole image with ZXing
  const whole = tryDecodeRegion(reader, fullData);
  if (whole) {
    const key = `${whole.getBarcodeFormat()}:${whole.getText()}`;
    if (!seen.has(key)) {
      seen.add(key);
      const pts =
        whole
          .getResultPoints()
          ?.filter(Boolean)
          .map((p) => ({ x: p.getX(), y: p.getY() })) ?? [];
      const bbox =
        pts.length >= 2
          ? pointsToBBox(pts)
          : { x: 0, y: 0, width: canvas.width, height: canvas.height };
      detections.push({
        id: key,
        type: BarcodeFormat[whole.getBarcodeFormat()],
        value: whole.getText(),
        bbox,
        points: pts,
        cropDataUrl: cropCanvas(canvas, bbox),
      });
    }
  }

  // 3) Tile sweep for multiple barcodes / robustness
  const tilesPerAxis = 3;
  const tw = Math.floor(canvas.width / tilesPerAxis);
  const th = Math.floor(canvas.height / tilesPerAxis);
  const overlap = 0.3;
  for (let ty = 0; ty < tilesPerAxis; ty++) {
    for (let tx = 0; tx < tilesPerAxis; tx++) {
      const x = Math.max(0, Math.floor(tx * tw - tw * overlap));
      const y = Math.max(0, Math.floor(ty * th - th * overlap));
      const w = Math.min(canvas.width - x, Math.floor(tw * (1 + 2 * overlap)));
      const h = Math.min(canvas.height - y, Math.floor(th * (1 + 2 * overlap)));
      if (w < 40 || h < 40) continue;
      const tileData = ctx.getImageData(x, y, w, h);
      const r = tryDecodeRegion(reader, tileData);
      if (r) {
        const key = `${r.getBarcodeFormat()}:${r.getText()}`;
        if (!seen.has(key)) {
          seen.add(key);
          const pts =
            r
              .getResultPoints()
              ?.filter(Boolean)
              .map((p) => ({ x: p.getX() + x, y: p.getY() + y })) ?? [];
          const bbox =
            pts.length >= 2 ? pointsToBBox(pts) : { x, y, width: w, height: h };
          detections.push({
            id: key,
            type: BarcodeFormat[r.getBarcodeFormat()],
            value: r.getText(),
            bbox,
            points: pts,
            cropDataUrl: cropCanvas(canvas, bbox),
          });
        }
      }
      // QR per tile too
      const qrTile = jsQR(tileData.data, w, h, { inversionAttempts: "dontInvert" });
      if (qrTile) {
        const key = `QR:${qrTile.data}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const points = [
          qrTile.location.topLeftCorner,
          qrTile.location.topRightCorner,
          qrTile.location.bottomRightCorner,
          qrTile.location.bottomLeftCorner,
        ].map((p) => ({ x: p.x + x, y: p.y + y }));
        const bbox = pointsToBBox(points);
        detections.push({
          id: key,
          type: "QR_CODE",
          value: qrTile.data,
          bbox,
          points,
          cropDataUrl: cropCanvas(canvas, bbox),
        });
      }
    }
  }

  return detections.filter((d) => d.type !== "MICRO_QR_CODE");
}

export async function imageToCanvas(src: string | Blob): Promise<HTMLCanvasElement> {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const max = 1600;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally {
    if (typeof src !== "string") URL.revokeObjectURL(url);
  }
}

/**
 * Calls the image-processing API (Next proxy → FastAPI) for portrait extraction.
 * Falls back to client-side crop when the API is unavailable.
 */

export type PortraitMethod = 'face_haar' | 'slot_crop';

export interface PortraitProcessResult {
  photoDataUrl: string;
  method: PortraitMethod;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * POST multipart image to same-origin `/api/image/process`.
 * Returns null if the request fails (network, 4xx/5xx, invalid JSON).
 */
export async function processPortraitRemote(
  imageDataUrl: string,
  mode: 'auto' | 'slot' | 'face' = 'auto',
): Promise<PortraitProcessResult | null> {
  try {
    const blob = await dataUrlToBlob(imageDataUrl);
    const fd = new FormData();
    fd.append('image', blob, 'upload.png');
    const res = await fetch(`/api/image/process?mode=${encodeURIComponent(mode)}`, {
      method: 'POST',
      body: fd,
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { photo?: string; method?: PortraitMethod };
    if (!j.photo || typeof j.photo !== 'string') return null;
    const method = j.method === 'face_haar' || j.method === 'slot_crop' ? j.method : 'slot_crop';
    return {
      photoDataUrl: `data:image/png;base64,${j.photo}`,
      method,
    };
  } catch {
    return null;
  }
}

import { trimEmptyEdges } from "@/lib/face-crop";

/**
 * Runs in-browser segmentation after face crop so the portrait has a transparent backdrop (PNG alpha).
 *
 * After segmentation we auto-trim transparent and near-white rows/columns from
 * the edges to remove any thin sliver of card background that the model leaves
 * behind (a common artifact at the bottom edge near the shoulders).
 *
 * Note: `@imgly/background-removal` exposes `removeBackground` as a **named** ESM export only;
 * using `module.default` is undefined and caused a silent fallback to the opaque crop.
 */
export async function removePortraitBackground(dataUrl: string): Promise<string> {
  try {
    const { removeBackground } = await import("@imgly/background-removal");
    const blob = await removeBackground(dataUrl, {
      model: "isnet_fp16",
      /** Apply the mask at the source resolution (matches the cropped face bitmap). */
      rescale: true,
      output: { format: "image/png" },
    });
    const transparent = await blobToDataUrl(blob);
    return await trimEmptyEdges(transparent, { debug: true });
  } catch (e) {
    console.error("Portrait background removal failed; using opaque crop.", e);
    return dataUrl;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

import html2canvas from "html2canvas";

/**
 * Triggers the download of a DOM element as a high-quality PNG.
 */
export async function downloadNodeAsPng(
  element: HTMLDivElement,
  filename = "ethiopian-id.png",
  scale = 2,
): Promise<void> {
  await document.fonts.ready;
  
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    backgroundColor: null,
    logging: false,
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

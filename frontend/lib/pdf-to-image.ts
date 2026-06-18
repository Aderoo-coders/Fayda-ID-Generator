/**
 * Lazy-loads pdfjs-dist only in the browser to avoid import.meta errors during
 * server-side compilation. All exports here are async and client-only.
 */

async function getPdfjsLib() {
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  }
  return pdfjsLib;
}

/**
 * Renders a single page of a PDF to a data-URL image (PNG).
 * @param file - The uploaded PDF File object
 * @param pageNumber - 1-indexed page number
 * @param scale - Rendering scale (2 = retina-quality)
 */
export async function renderPdfPageToImage(
  file: File,
  pageNumber: number,
  scale = 2,
): Promise<string> {
  const pdfjsLib = await getPdfjsLib();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  if (pageNumber < 1 || pageNumber > pdf.numPages) {
    throw new Error(`Page ${pageNumber} out of range (1–${pdf.numPages})`);
  }

  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, canvas, viewport }).promise;

  return canvas.toDataURL('image/png');
}

/**
 * Returns the total page count of a PDF file.
 */
export async function getPdfPageCount(file: File): Promise<number> {
  const pdfjsLib = await getPdfjsLib();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}

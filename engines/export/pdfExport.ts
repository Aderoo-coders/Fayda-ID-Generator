import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Compiles front and back card visual nodes into a standard landscape PDF document.
 */
export async function downloadCardsAsPdf(
  frontElement: HTMLDivElement | null,
  backElement: HTMLDivElement | null,
  filename = "ethiopian-id-card.pdf",
  scale = 2,
): Promise<void> {
  await document.fonts.ready;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [85.6, 54],
  });

  const captureOptions = {
    scale,
    useCORS: true,
    backgroundColor: null,
    logging: false,
  };

  let frontAdded = false;

  if (frontElement) {
    const frontCanvas = await html2canvas(frontElement, captureOptions);
    pdf.addImage(frontCanvas.toDataURL("image/png"), "PNG", 0, 0, 85.6, 54);
    frontAdded = true;
  }

  if (backElement) {
    if (frontAdded) {
      pdf.addPage([85.6, 54], "landscape");
    }
    const backCanvas = await html2canvas(backElement, captureOptions);
    pdf.addImage(backCanvas.toDataURL("image/png"), "PNG", 0, 0, 85.6, 54);
  }

  pdf.save(filename);
}

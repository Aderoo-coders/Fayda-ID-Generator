import { downloadNodeAsPng } from "@/engines/export/pngExport";

/**
 * Downloads a batch of card references, triggering sequential PNG exports.
 */
export async function downloadBatchAsPng(
  cards: { element: HTMLDivElement; name: string }[],
  scale = 2,
): Promise<void> {
  for (const card of cards) {
    const filename = `${card.name.toLowerCase().replace(/[\s\-_]+/g, "-")}-id.png`;
    await downloadNodeAsPng(card.element, filename, scale);
  }
}

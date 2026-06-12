import QRCode from 'qrcode';

// White box bounds detected on the 1920x1170 back template.
const BOX = { x: 950, y: 220, w: 870, h: 776 };

// Use the public static path (Next.js serves from /public)
const TEMPLATE_URL = '/static/ID-back template.png';

// Debug mode: set to true to see visual guides (borders and measurements)
const DEBUG_MODE = true;

let cachedTemplate: HTMLImageElement | null = null;

async function loadTemplate(): Promise<HTMLImageElement> {
  if (cachedTemplate) return cachedTemplate;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = TEMPLATE_URL;
  });
  cachedTemplate = img;
  return img;
}

/**
 * Renders a QR code centered inside the white area of the ID-back template
 * with proper quiet zone (white border) on all sides. Returns a PNG data URL.
 */
export async function renderQrOnIdTemplate(value: string): Promise<string> {
  const tpl = await loadTemplate();
  const canvas = document.createElement('canvas');
  canvas.width = tpl.naturalWidth;
  canvas.height = tpl.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(tpl, 0, 0);

  // QR code quiet zone (margin in module units)
  const quietZoneModules = 4;
  
  // Generate QR code with no built-in margin (we'll handle it ourselves)
  const qrDataUrl = await QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    margin: 0,
    color: { dark: '#000000', light: '#ffffff' },
  });

  const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = qrDataUrl;
  });

  // Calculate quiet zone in pixels (approximately 20px per QR module at standard sizes)
  const quietZonePx = 25;
  
  // Position QR code centered within the BOX with equal margins on all sides
  const x = BOX.x + quietZonePx;
  const y = BOX.y + quietZonePx;
  const w = BOX.w - quietZonePx * 2;
  const h = BOX.h - quietZonePx * 2;

  // Draw the QR code
  ctx.drawImage(qrImg, x, y, w, h);

  // // DEBUG: Visual guides to see positioning
  // if (DEBUG_MODE) {
  //   // Draw template box border (the white box area on template)
  //   ctx.strokeStyle = '#FF0000';
  //   ctx.lineWidth = 4;
  //   ctx.strokeRect(BOX.x, BOX.y, BOX.w, BOX.h);
    
  //   // Draw QR placement box border
  //   ctx.strokeStyle = '#00FF00';
  //   ctx.lineWidth = 3;
  //   ctx.strokeRect(x, y, w, h);
    
  //   // Draw quiet zone indicators (red squares at corners)
  //   ctx.fillStyle = '#FF0000';
  //   const cornerSize = 15;
  //   // Top-left corner indicator
  //   ctx.fillRect(BOX.x, BOX.y, cornerSize, cornerSize);
  //   // Top-right corner indicator
  //   ctx.fillRect(BOX.x + BOX.w - cornerSize, BOX.y, cornerSize, cornerSize);
  //   // Bottom-left corner indicator
  //   ctx.fillRect(BOX.x, BOX.y + BOX.h - cornerSize, cornerSize, cornerSize);
  //   // Bottom-right corner indicator
  //   ctx.fillRect(BOX.x + BOX.w - cornerSize, BOX.y + BOX.h - cornerSize, cornerSize, cornerSize);
    
  //   // Add text labels for measurements
  //   ctx.fillStyle = '#FF0000';
  //   ctx.font = 'bold 24px Arial';
  //   ctx.fillText(`BOX: ${BOX.w}×${BOX.h}`, BOX.x + 10, BOX.y + 40);
  //   ctx.fillText(`QR: ${w}×${h}`, x + 10, y + 40);
  //   ctx.fillText(`Quiet Zone: ${quietZonePx}px`, x + 10, y + 70);
  // }

  return canvas.toDataURL('image/png');
}

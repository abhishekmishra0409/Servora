import QRCode from 'qrcode';

/**
 * Downloadable table QR artwork.
 *
 * Cards are composed on a canvas rather than screenshotting the DOM, so the
 * output is the same whatever the screen is doing and the QR is re-rendered at
 * print resolution instead of being upscaled from the on-screen preview.
 */

export interface TableQrCard {
  /** Outlet name, printed under the restaurant name. */
  outlet: string;
  /** Restaurant / tenant legal name. */
  brand: string;
  tableNo: string;
  /** Full customer URL the code encodes. */
  url: string;
}

const CARD_WIDTH = 900;
const CARD_HEIGHT = 1180;
const QR_SIZE = 620;

const FONT = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const INK = '#111c2d';
const MUTED = '#5f6b7a';

/** Draws one printable card and returns the canvas. */
export async function composeTableQrCard(card: TableQrCard): Promise<HTMLCanvasElement> {
  const qrDataUrl = await QRCode.toDataURL(card.url, {
    color: { dark: INK, light: '#ffffff' },
    errorCorrectionLevel: 'M',
    margin: 1,
    width: QR_SIZE,
  });

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not prepare the image for download.');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.textAlign = 'center';

  const centre = CARD_WIDTH / 2;

  ctx.fillStyle = MUTED;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(card.brand.toUpperCase(), centre, 110, CARD_WIDTH - 80);

  ctx.font = `400 30px ${FONT}`;
  ctx.fillText(card.outlet, centre, 160, CARD_WIDTH - 80);

  ctx.fillStyle = INK;
  ctx.font = `800 76px ${FONT}`;
  ctx.fillText(`Table ${card.tableNo}`, centre, 260, CARD_WIDTH - 80);

  const qrImage = await loadImage(qrDataUrl);
  ctx.drawImage(qrImage, (CARD_WIDTH - QR_SIZE) / 2, 320, QR_SIZE, QR_SIZE);

  ctx.fillStyle = INK;
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText('Scan to see the menu and order', centre, 1035, CARD_WIDTH - 80);

  ctx.fillStyle = MUTED;
  ctx.font = `400 22px ${FONT}`;
  ctx.fillText(truncate(ctx, card.url, CARD_WIDTH - 100), centre, 1090);

  return canvas;
}

export async function downloadTableQrPng(card: TableQrCard): Promise<void> {
  const canvas = await composeTableQrCard(card);
  const blob = await canvasToBlob(canvas, 'image/png');

  triggerDownload(blob, `${fileStem(card)}.png`);
}

/** One card per page, so each sheet can be cut out and put on its table. */
export async function downloadTableQrPdf(cards: TableQrCard[], filename: string): Promise<void> {
  const pages = await Promise.all(
    cards.map(async (card) => {
      const canvas = await composeTableQrCard(card);
      const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.92);

      return { bytes: new Uint8Array(await jpeg.arrayBuffer()), height: canvas.height, width: canvas.width };
    }),
  );

  const pdf = buildPdf(pages);

  // The cast satisfies lib.dom's BlobPart, which rejects a possibly
  // SharedArrayBuffer-backed view; this buffer is always a plain ArrayBuffer.
  triggerDownload(new Blob([pdf.buffer as ArrayBuffer], { type: 'application/pdf' }), filename);
}

// --- PDF ------------------------------------------------------------------

interface PdfImage {
  bytes: Uint8Array;
  height: number;
  width: number;
}

const A4 = { height: 841.89, width: 595.28 };
const PAGE_MARGIN = 36;

/**
 * Minimal single-purpose PDF writer.
 *
 * Each page holds one JPEG, which PDF can embed verbatim via DCTDecode — no
 * compression work and no dependency. Object offsets are tracked as bytes are
 * appended so the xref table is exact.
 */
function buildPdf(images: PdfImage[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const push = (chunk: Uint8Array | string): void => {
    const bytes = typeof chunk === 'string' ? latin1(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };

  // Objects: 1 catalog, 2 pages, then page/content/image per card.
  const objectCount = 2 + images.length * 3;
  const pageObjectId = (index: number): number => 3 + index * 3;

  const startObject = (id: number): void => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
  };

  push('%PDF-1.4\n');
  // Binary comment marks the file as containing binary data.
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  startObject(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  const kids = images.map((_, index) => `${pageObjectId(index)} 0 R`).join(' ');
  startObject(2);
  push(`<< /Type /Pages /Kids [${kids}] /Count ${images.length} >>\nendobj\n`);

  images.forEach((image, index) => {
    const pageId = pageObjectId(index);
    const contentId = pageId + 1;
    const imageId = pageId + 2;

    // Fit the card inside the printable area, preserving aspect ratio.
    const maxWidth = A4.width - PAGE_MARGIN * 2;
    const maxHeight = A4.height - PAGE_MARGIN * 2;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const x = (A4.width - drawWidth) / 2;
    const y = (A4.height - drawHeight) / 2;

    startObject(pageId);
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.width.toFixed(2)} ${A4.height.toFixed(2)}] ` +
        `/Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );

    const content = `q ${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q\n`;
    startObject(contentId);
    push(`<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);

    startObject(imageId);
    push(
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`,
    );
    push(image.bytes);
    push('\nendstream\nendobj\n');
  });

  const xrefOffset = length;
  push(`xref\n0 ${objectCount + 1}\n`);
  push('0000000000 65535 f \n');

  for (let id = 1; id <= objectCount; id += 1) {
    push(`${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`);
  }

  push(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let cursor = 0;

  for (const part of parts) {
    out.set(part, cursor);
    cursor += part.length;
  }

  return out;
}

// --- helpers --------------------------------------------------------------

/** PDF syntax is byte-oriented; only ASCII is written through this path. */
function latin1(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);

  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }

  return bytes;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not render the QR code.'));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not prepare the download.'))),
      type,
      quality,
    );
  });
}

function truncate(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string {
  if (ctx.measureText(value).width <= maxWidth) {
    return value;
  }

  let text = value;

  while (text.length > 4 && ctx.measureText(`${text}...`).width > maxWidth) {
    text = text.slice(0, -1);
  }

  return `${text}...`;
}

export function fileStem(card: TableQrCard): string {
  return `${slug(card.brand)}-${slug(card.outlet)}-table-${slug(card.tableNo)}`.replace(/^-+|-+$/g, '');
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

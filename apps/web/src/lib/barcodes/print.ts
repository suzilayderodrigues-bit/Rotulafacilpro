import PDFDocument from "pdfkit";
import { barcodeDownloadName } from "./download";
import { renderBarcodePng, type BarcodeRenderInput } from "./render";

export const barcodePrintLayout = {
  margin: 40,
  quietZone: 12,
  imageTop: 116
} as const;

/** Print the existing renderer's complete image, at its natural aspect ratio. */
export async function renderBarcodePrintPdf(barcode: BarcodeRenderInput, productName: string) {
  const png = await renderBarcodePng(barcode);
  const nativeWidth = png.readUInt32BE(16);
  const nativeHeight = png.readUInt32BE(20);
  const doc = new PDFDocument({ size: "A4", margin: barcodePrintLayout.margin, bufferPages: true,
    info: { Title: `Código de barras - ${productName}`, Subject: barcode.value, Creator: "Rótula Fácil Pro" } });
  const chunks: Buffer[] = [];
  const buffer = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const { margin, quietZone, imageTop } = barcodePrintLayout;
  const contentWidth = doc.page.width - 2 * margin;
  const width = Math.min(nativeWidth / 2, contentWidth - 2 * quietZone);
  const height = width * nativeHeight / nativeWidth;
  const image = { x: margin + quietZone, y: imageTop, width, height };
  const layout = { pageWidth: doc.page.width, pageHeight: doc.page.height, margin, quietZone, image, nativeWidth, nativeHeight };
  doc.font("Helvetica-Bold").fontSize(12).text(productName, margin, 40, { width: contentWidth, height: 36, ellipsis: true });
  doc.font("Helvetica").fontSize(8).text(barcode.type === "INTERNAL"
    ? "Código interno - não substitui GTIN oficial" : "Código oficial GTIN", margin, 86, { width: contentWidth });
  // The surrounding blank area is deliberately outside the complete PNG.
  doc.image(png, image.x, image.y, { width, height });
  if (image.y + image.height + quietZone > doc.page.height - margin || doc.bufferedPageRange().count !== 1) {
    doc.end(); await buffer;
    throw new Error("Não foi possível preparar o código completo em uma página.");
  }
  doc.end();
  return { buffer: await buffer, filename: barcodeDownloadName(barcode.value, "svg").replace(/\.svg$/, ".pdf"), layout };
}

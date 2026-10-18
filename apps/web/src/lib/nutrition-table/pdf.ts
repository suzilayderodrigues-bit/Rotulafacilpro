import PDFDocument from "pdfkit";
import type { FinalLabelPreview } from "@/lib/final-label/preview";
import type { NutritionTableViewModel } from "@/lib/regulatory/nutrition-table";
import { assessNutritionTablePdf } from "./export";
import { officialWarningArtwork } from "./official-warning-artwork";

export const nutritionTablePdfLayout = { width: 270, bodyFontSize: 8, titleFontSize: 10, footnoteFontSize: 6, rowHeight: 14 } as const;

export function nutritionTablePdfFilename(name: string) {
  const safe = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72).replace(/-+$/, "");
  return `tabela-nutricional-${safe || "produto"}.pdf`;
}

function drawTable(doc: PDFKit.PDFDocument, table: NutritionTableViewModel, x: number, top: number) {
  const { width, rowHeight } = nutritionTablePdfLayout;
  const pad = 4;
  const columns = [153, 40, 40, 29] as const;
  const totalWidth = width - pad * 2;
  const line = (y: number, weight: number) => doc.lineWidth(weight).moveTo(x + pad, y).lineTo(x + width - pad, y).stroke();
  const text = (value: string, left: number, y: number, cellWidth: number, size = 8, bold = false, align: "left" | "center" = "left") => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).fillColor("#000000");
    doc.text(value, left, y, { width: cellWidth, align, lineBreak: false });
  };
  let y = top + 5;
  text("INFORMAÇÃO NUTRICIONAL", x + pad, y, totalWidth, 10, true, "center");
  y += 15;
  line(y, 0.5);
  y += 3;
  doc.font("Helvetica").fontSize(8);
  if (!table.isIndividualPackage) {
    const servings = `Porções por embalagem: ${table.servingsPerPackageLabel}`;
    doc.text(servings, x + pad, y, { width: totalWidth });
    y += doc.heightOfString(servings, { width: totalWidth }) + 2;
  }
  const serving = `Porção: ${table.servingLabel} (${table.householdMeasure})`;
  doc.text(serving, x + pad, y, { width: totalWidth });
  y += doc.heightOfString(serving, { width: totalWidth }) + 5;
  line(y, 3);
  y += 5;
  const gridTop = y;
  let left = x + pad + columns[0];
  for (const [i, title] of [table.basisLabel, table.servingLabel!, "%VD*"].entries()) {
    text(title, left, y, columns[i + 1]!, 8, true, "center");
    left += columns[i + 1]!;
  }
  y += rowHeight;
  line(y - 3, 0.5);
  doc.font("Helvetica").fontSize(8);
  const indentWidth = doc.widthOfString("n");
  for (const row of table.rows) {
    const indent = row.nutrient === "addedSugarsG" ? indentWidth * 2 : row.indented ? indentWidth : 0;
    text(`${row.label} (${row.unit})`, x + pad + indent, y, columns[0] - indent);
    left = x + pad + columns[0];
    for (const [index, value] of [row.per100Value!, row.perServingValue!, row.hasEstablishedDailyValue ? row.dailyValuePercent! : ""].entries()) {
      text(value, left, y, columns[index + 1]!, 8, false, "center");
      left += columns[index + 1]!;
    }
    y += rowHeight;
    line(y - 3, 0.5);
  }
  let divider = x + pad;
  for (const width of columns.slice(0, -1)) {
    divider += width;
    doc.lineWidth(0.5).moveTo(divider, gridTop - 1).lineTo(divider, y - 3).stroke();
  }
  line(y - 3, 1);
  doc.font("Helvetica").fontSize(6).text(table.dailyValueFootnote, x + pad, y + 1, { width: totalWidth });
  y += doc.heightOfString(table.dailyValueFootnote, { width: totalWidth }) + 8;
  doc.rect(x, top, width, y - top).lineWidth(0.5).stroke();
  return y;
}

export function nutritionWarningArtwork(preview: FinalLabelPreview) {
  if (!preview.frontOfPack?.shouldDisplayOfficialWarning) return null;
  const selected = new Set(preview.frontOfPack.finalHighIn.map(item => item.nutrient));
  const key = ["addedSugars", "saturatedFat", "sodium"].filter(value => selected.has(value as "addedSugars" | "saturatedFat" | "sodium")).join("+");
  const art = officialWarningArtwork[key as keyof typeof officialWarningArtwork];
  if (!art) throw Error("Modelo oficial de lupa indisponível.");
  // IN 75, Anexo XVIII: occupation uses the real package panel, never a label preset.
  const panel = preview.mainPanelAreaCm2!;
  const blocks = selected.size + 1;
  const fraction = panel <= 100 ? blocks * 0.0175 : blocks * 0.01;
  const areaPoints = panel * fraction * (72 / 2.54) ** 2;
  const ratio = art.width / art.height;
  const widthFromArea = Math.sqrt(areaPoints * ratio);
  // Artwork's A cap is 114 px at 600 dpi (Arial Narrow Bold, cap height 0.716 em).
  const widthAtNinePoints = art.width * 9 * 0.716 / 114;
  const width = panel <= 100 ? Math.min(widthFromArea, widthAtNinePoints)
    : Math.min(Math.max(widthFromArea, widthAtNinePoints), widthAtNinePoints * 15 / 9);
  return { ...art, widthPt: width, heightPt: width / ratio };
}

export async function renderNutritionTablePdf(preview: FinalLabelPreview) {
  const assessment = assessNutritionTablePdf(preview);
  if (!assessment.allowed) return { status: "BLOCKED" as const, assessment };
  const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true, compress: true,
    info: { Title: `Tabela nutricional - ${preview.name}`, Creator: "Rótula Fácil Pro", Subject: "Tabela nutricional e rotulagem frontal" } });
  const chunks: Buffer[] = [];
  const buffer = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.font("Helvetica-Bold").fontSize(12).text(preview.name, 40, 35, { width: 515 });
  const tableTop = Math.max(75, doc.y + 15);
  const bottom = drawTable(doc, preview.nutritionTable!, 40, tableTop);
  const artwork = nutritionWarningArtwork(preview);
  if (artwork) {
    const y = bottom + 30;
    doc.font("Helvetica").fontSize(8).text("Rotulagem frontal - aplicar no painel principal da embalagem", 40, y, { width: 500 });
    doc.image(Buffer.from(artwork.png, "base64"), 40, y + 18, { width: artwork.widthPt, height: artwork.heightPt });
  }
  if (doc.bufferedPageRange().count !== 1) {
    doc.end();
    await buffer;
    throw Error("O PDF da tabela deve caber integralmente em uma página A4.");
  }
  doc.end();
  return { status: "READY" as const, assessment, buffer: await buffer, filename: nutritionTablePdfFilename(preview.name) };
}

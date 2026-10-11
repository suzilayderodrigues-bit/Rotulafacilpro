import PDFDocument from "pdfkit";
import { renderBarcodePng } from "@/lib/barcodes/render";
import type { NutritionTableRow } from "@/lib/regulatory";
import type { FinalLabelPreview } from "./preview";
import {
  labelFormats,
  type LabelFormat,
  type LabelTemplate
} from "./visual";

export const pointsPerInch = 72;
export const millimetersPerInch = 25.4;

export function millimetersToPoints(millimeters: number) {
  return millimeters * pointsPerInch / millimetersPerInch;
}

export function finalLabelPdfFilename(name: string) {
  const safeName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "");
  return `rotula-${safeName || "produto"}.pdf`;
}

export function nutritionPdfCell(value: string | null) {
  return value === null ? "—" : value;
}

export type FinalLabelPdfBlockCode = "INCOMPLETE" | "REQUIRES_REVIEW" | "CONTENT_OVERFLOW";
export type FinalLabelPdfAssessment =
  | { allowed: true; code: null; message: null }
  | { allowed: false; code: FinalLabelPdfBlockCode; message: string };

type PdfLayout = {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
  titleHeight: number;
  ingredientsHeight: number;
  declarationsHeight: number;
  nutritionHeight: number;
  frontOfPackHeight: number;
  barcodeHeight: number;
  requiredHeight: number;
};

const colors: Record<LabelTemplate, { accent: string; border: string; surface: string }> = {
  ESSENCIAL: { accent: "#303b40", border: "#303b40", surface: "#ffffff" },
  CLEAN: { accent: "#0abfbc", border: "#c4d6d6", surface: "#fbfdfd" },
  DESTAQUE: { accent: "#0abfbc", border: "#0abfbc", surface: "#ffffff" }
};

function disclosureLines(preview: FinalLabelPreview) {
  const lines: string[] = [];
  if (preview.allergenStatus === "UNKNOWN") lines.push("ALERGÊNICOS: informação não determinada; revisão necessária.");
  if (preview.allergens.length) lines.push(`ALÉRGICOS: CONTÉM ${preview.allergens.join(", ")}.`);
  lines.push(preview.glutenStatus === "CONTAINS" ? "CONTÉM GLÚTEN."
    : preview.glutenStatus === "DOES_NOT_CONTAIN" ? "NÃO CONTÉM GLÚTEN." : "GLÚTEN: revisão necessária.");
  lines.push(preview.lactoseStatus === "CONTAINS" ? "CONTÉM LACTOSE."
    : preview.lactoseStatus === "DOES_NOT_CONTAIN" ? "NÃO CONTÉM LACTOSE." : "LACTOSE: revisão necessária.");
  if (preview.crossContaminationRisk === "YES") {
    lines.push(`PODE CONTER: ${preview.crossContaminationAllergens.join(", ") || "informação pendente"}.`);
  }
  return lines;
}

function measureLayout(preview: FinalLabelPreview, format: LabelFormat): PdfLayout {
  const dimensions = labelFormats[format];
  const pageWidth = millimetersToPoints(dimensions.widthMm);
  const pageHeight = millimetersToPoints(dimensions.heightMm);
  const margin = millimetersToPoints(3);
  const contentWidth = pageWidth - margin * 2;
  const doc = new PDFDocument({ autoFirstPage: false });
  const height = (text: string, fontSize: number, font = "Helvetica") => {
    doc.font(font).fontSize(fontSize);
    return doc.heightOfString(text, { width: contentWidth, lineGap: 0.5 });
  };
  const titleHeight = height(preview.name, 9, "Helvetica-Bold") + 13;
  const ingredientsHeight = height(preview.ingredientsText ?? "", 4.8, "Helvetica-Bold") + 5;
  const declarationsHeight = height(disclosureLines(preview).join("\n"), 4.8) + 5;
  const nutritionHeight = preview.nutritionTable ? 19 + preview.nutritionTable.rows.length * 6.2 + 10 : 0;
  const frontOfPackHeight = preview.frontOfPack?.shouldDisplayOfficialWarning
    ? 14 + preview.frontOfPack.finalHighIn.length * 9
    : 9;
  const barcodeHeight = preview.barcode ? 40 : 0;
  const requiredHeight = margin * 2 + titleHeight + ingredientsHeight + declarationsHeight
    + nutritionHeight + frontOfPackHeight + barcodeHeight + 18;
  return {
    pageWidth, pageHeight, margin, contentWidth, titleHeight, ingredientsHeight,
    declarationsHeight, nutritionHeight, frontOfPackHeight, barcodeHeight, requiredHeight
  };
}

export function assessFinalLabelPdf(preview: FinalLabelPreview, format: LabelFormat): FinalLabelPdfAssessment {
  if (preview.allergenStatus === "UNKNOWN") {
    return { allowed: false, code: "REQUIRES_REVIEW", message: "Revise os alergênicos desconhecidos antes de baixar o PDF. Informação ausente não confirma ausência." };
  }
  if (preview.status === "INCOMPLETE") {
    return { allowed: false, code: "INCOMPLETE", message: "Complete as informações obrigatórias do rótulo antes de baixar o PDF." };
  }
  if (preview.status === "REQUIRES_REVIEW") {
    return { allowed: false, code: "REQUIRES_REVIEW", message: "Conclua os pontos marcados para revisão antes de baixar o PDF." };
  }
  const pdfLayout = measureLayout(preview, format);
  if (pdfLayout.requiredHeight > pdfLayout.pageHeight) {
    return { allowed: false, code: "CONTENT_OVERFLOW", message: "O conteúdo não cabe neste formato sem cortes. Escolha um formato maior ou reduza o conteúdo na receita." };
  }
  return { allowed: true, code: null, message: null };
}

function collectPdf(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function drawNutritionTable(doc: PDFKit.PDFDocument, rows: NutritionTableRow[], x: number, y: number, width: number) {
  const nameWidth = width * 0.42;
  const valueWidth = width * 0.19;
  doc.font("Helvetica-Bold").fontSize(5).fillColor("#000000")
    .text("INFORMAÇÃO NUTRICIONAL", x, y, { width });
  y += 7;
  doc.fontSize(4.2)
    .text("Nutriente", x, y, { width: nameWidth })
    .text("100 g/ml", x + nameWidth, y, { width: valueWidth, align: "right" })
    .text("Porção", x + nameWidth + valueWidth, y, { width: valueWidth, align: "right" })
    .text("%VD*", x + nameWidth + valueWidth * 2, y, { width: valueWidth, align: "right" });
  y += 6;
  for (const row of rows) {
    doc.font(row.indented ? "Helvetica" : "Helvetica-Bold").fontSize(4.2)
      .text(`${row.indented ? "  " : ""}${row.label} (${row.unit})`, x, y, { width: nameWidth, lineBreak: false })
      .font("Helvetica")
      .text(nutritionPdfCell(row.per100Value), x + nameWidth, y, { width: valueWidth, align: "right", lineBreak: false })
      .text(nutritionPdfCell(row.perServingValue), x + nameWidth + valueWidth, y, { width: valueWidth, align: "right", lineBreak: false })
      .text(row.hasEstablishedDailyValue ? nutritionPdfCell(row.dailyValuePercent) : "—", x + nameWidth + valueWidth * 2, y, { width: valueWidth, align: "right", lineBreak: false });
    y += 6.2;
  }
  return y;
}

export async function renderFinalLabelPdf(preview: FinalLabelPreview, format: LabelFormat, template: LabelTemplate) {
  const assessment = assessFinalLabelPdf(preview, format);
  if (!assessment.allowed) return { status: "BLOCKED" as const, assessment };

  const layout = measureLayout(preview, format);
  const palette = colors[template];
  const doc = new PDFDocument({
    autoFirstPage: false,
    bufferPages: true,
    compress: true,
    info: { Title: preview.name, Creator: "Rotula Fácil Pro" }
  });
  doc.addPage({ size: [layout.pageWidth, layout.pageHeight], margin: 0 });
  doc.rect(0, 0, layout.pageWidth, layout.pageHeight).fill(palette.surface);
  doc.rect(1, 1, layout.pageWidth - 2, layout.pageHeight - 2).lineWidth(1.2).stroke(palette.border);

  let y = layout.margin;
  doc.fillColor(palette.accent).rect(layout.margin, y, layout.contentWidth, 2).fill();
  y += 5;
  doc.fillColor("#111111").font(template === "DESTAQUE" ? "Helvetica-Bold" : "Helvetica")
    .fontSize(9).text(preview.name, layout.margin, y, { width: layout.contentWidth });
  y += layout.titleHeight - 7;
  doc.font("Helvetica-Bold").fontSize(5.5).text(preview.netQuantityLabel ?? "", layout.margin, y, { width: layout.contentWidth });
  y += 10;
  doc.font("Helvetica-Bold").fontSize(4.8).text(preview.ingredientsText ?? "", layout.margin, y, { width: layout.contentWidth, lineGap: 0.5 });
  y += layout.ingredientsHeight;
  doc.font("Helvetica").fontSize(4.8).text(disclosureLines(preview).join("\n"), layout.margin, y, { width: layout.contentWidth, lineGap: 0.5 });
  y += layout.declarationsHeight;

  if (preview.nutritionTable) {
    y = drawNutritionTable(doc, preview.nutritionTable.rows, layout.margin, y, layout.contentWidth);
    doc.font("Helvetica").fontSize(3.8).text(preview.nutritionTable.dailyValueFootnote, layout.margin, y + 1, { width: layout.contentWidth });
    y += 10;
  }

  if (preview.frontOfPack?.shouldDisplayOfficialWarning) {
    doc.roundedRect(layout.margin, y, layout.contentWidth, layout.frontOfPackHeight - 3, 2).fill("#000000");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(6)
      .text(`ALTO EM\n${preview.frontOfPack.finalHighIn.map((item) => item.label).join(" • ")}`, layout.margin + 4, y + 4, { width: layout.contentWidth - 8, align: "center" });
  } else {
    doc.fillColor("#111111").font("Helvetica").fontSize(4.5)
      .text("Sem lupa frontal para a decisão regulatória atual.", layout.margin, y, { width: layout.contentWidth });
  }
  y += layout.frontOfPackHeight;

  if (preview.barcode) {
    const png = await renderBarcodePng({ value: preview.barcode.value, type: preview.barcode.type, format: preview.barcode.format });
    const imageWidth = Math.min(layout.contentWidth, millimetersToPoints(38));
    doc.image(png, layout.margin + (layout.contentWidth - imageWidth) / 2, y, { fit: [imageWidth, 30], align: "center", valign: "center" });
  }

  const pageCount = doc.bufferedPageRange().count;
  if (pageCount !== 1) throw new Error("O PDF do rótulo deve conter exatamente uma página.");
  const buffer = await collectPdf(doc);
  return { status: "READY" as const, buffer, filename: finalLabelPdfFilename(preview.name), assessment };
}

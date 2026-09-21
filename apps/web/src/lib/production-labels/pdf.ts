import PDFDocument from "pdfkit";
import { millimetersToPoints } from "@/lib/final-label/pdf";
import {
  assessProductionLabelComposition,
  buildProductionLabelPreview,
  calculateProductionLabelA4Layout,
  parseProductionLabelQuantity,
  productionLabelA4Layout,
  productionLabelFormats,
  resolveProductionLabelFormat,
  validateProductionLabelInput,
  type ProductionLabelFormat,
  type ProductionLabelInput,
  type ProductionLabelPreview,
  type ProductionLabelRecipe
} from "./domain";

export type ProductionLabelPdfMode = "INDIVIDUAL" | "A4";

export type ProductionLabelPdfRequest = ProductionLabelInput & {
  format: string;
  quantity: string;
  mode: string;
};

export type ProductionLabelPdfBlockCode =
  | "INVALID_INPUT"
  | "INVALID_FORMAT"
  | "INVALID_QUANTITY"
  | "INVALID_MODE"
  | "CONTENT_OVERFLOW";

export type PreparedProductionLabelPdf = {
  recipe: ProductionLabelRecipe;
  input: ProductionLabelInput;
  preview: ProductionLabelPreview;
  format: ProductionLabelFormat;
  quantity: number;
  mode: ProductionLabelPdfMode;
};

export type ProductionLabelPdfPreparation =
  | { status: "READY"; value: PreparedProductionLabelPdf }
  | { status: "BLOCKED"; code: ProductionLabelPdfBlockCode; message: string };

export function prepareProductionLabelPdf(
  recipe: ProductionLabelRecipe,
  request: ProductionLabelPdfRequest
): ProductionLabelPdfPreparation {
  const format = resolveProductionLabelFormat(request.format);
  if (!format) return { status: "BLOCKED", code: "INVALID_FORMAT", message: "Escolha um formato de etiqueta válido." };

  const quantity = parseProductionLabelQuantity(request.quantity);
  if (quantity === null) return { status: "BLOCKED", code: "INVALID_QUANTITY", message: "Informe uma quantidade válida de etiquetas." };

  const mode = request.mode === "INDIVIDUAL" || request.mode === "A4" ? request.mode : null;
  if (!mode) return { status: "BLOCKED", code: "INVALID_MODE", message: "Escolha o modo de PDF." };

  const input: ProductionLabelInput = {
    recipeId: request.recipeId,
    lot: request.lot,
    manufacturedAt: request.manufacturedAt,
    expiresAt: request.expiresAt
  };
  const validation = validateProductionLabelInput([recipe], input);
  if (!validation.valid) {
    return { status: "BLOCKED", code: "INVALID_INPUT", message: Object.values(validation.errors)[0] ?? "Revise os dados da etiqueta." };
  }

  const preview = buildProductionLabelPreview([recipe], input);
  const composition = assessProductionLabelComposition(preview, format);
  if (composition.status === "CONTENT_OVERFLOW") {
    return { status: "BLOCKED", code: "CONTENT_OVERFLOW", message: composition.message };
  }

  return { status: "READY", value: { recipe, input, preview, format, quantity, mode } };
}

function safeFilenamePart(value: string) {
  return value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "") || "produto";
}

export function productionLabelPdfFilename(prepared: PreparedProductionLabelPdf) {
  const name = safeFilenamePart(prepared.recipe.name);
  if (prepared.mode === "A4") return `etiquetas-${name}-a4.pdf`;
  const option = productionLabelFormats[prepared.format];
  return `etiqueta-${name}-${option.widthMm}x${option.heightMm}mm.pdf`;
}

export function productionLabelContentDisposition(filename: string, intent: string | null) {
  return `${intent === "print" ? "inline" : "attachment"}; filename="${filename}"`;
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

function drawProductionLabel(
  doc: PDFKit.PDFDocument,
  preview: ProductionLabelPreview,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const inset = millimetersToPoints(1.5);
  const contentWidth = width - inset * 2;
  doc.save();
  doc.rect(x, y, width, height).lineWidth(0.35).stroke("#7b8589");
  doc.fillColor("#111111").font("Helvetica-Bold").fontSize(6)
    .text(preview.productName ?? "", x + inset, y + inset, { width: contentWidth, align: "center", lineGap: 0.2 });
  const detailsY = y + height - inset - millimetersToPoints(7.5);
  doc.font("Helvetica").fontSize(4.6)
    .text(`Lote: ${preview.lot}`, x + inset, detailsY, { width: contentWidth, lineBreak: false })
    .text(`Fab.: ${preview.manufacturedAt ?? ""}`, x + inset, detailsY + 6, { width: contentWidth, lineBreak: false })
    .text(`Val.: ${preview.expiresAt ?? ""}`, x + inset, detailsY + 12, { width: contentWidth, lineBreak: false });
  doc.restore();
}

export async function renderProductionLabelPdf(prepared: PreparedProductionLabelPdf) {
  const option = productionLabelFormats[prepared.format];
  const labelWidth = millimetersToPoints(option.widthMm);
  const labelHeight = millimetersToPoints(option.heightMm);
  const doc = new PDFDocument({ autoFirstPage: false, compress: true, info: { Title: prepared.recipe.name, Creator: "Rotula Fácil Pro" } });
  let pageCount = 0;
  let labelCount = 0;

  if (prepared.mode === "INDIVIDUAL") {
    doc.addPage({ size: [labelWidth, labelHeight], margin: 0 });
    pageCount = 1;
    labelCount = 1;
    drawProductionLabel(doc, prepared.preview, 0, 0, labelWidth, labelHeight);
  } else {
    const layout = calculateProductionLabelA4Layout(prepared.format, prepared.quantity);
    const pageWidth = millimetersToPoints(productionLabelA4Layout.widthMm);
    const pageHeight = millimetersToPoints(productionLabelA4Layout.heightMm);
    const margin = millimetersToPoints(layout.marginMm);
    const gap = millimetersToPoints(layout.gapMm);

    for (let index = 0; index < prepared.quantity; index += 1) {
      const pagePosition = index % layout.labelsPerPage;
      if (pagePosition === 0) {
        doc.addPage({ size: [pageWidth, pageHeight], margin: 0 });
        pageCount += 1;
      }
      const column = pagePosition % layout.columns;
      const row = Math.floor(pagePosition / layout.columns);
      const x = margin + column * (labelWidth + gap);
      const y = margin + row * (labelHeight + gap);
      drawProductionLabel(doc, prepared.preview, x, y, labelWidth, labelHeight);
      labelCount += 1;
    }
  }

  const buffer = await collectPdf(doc);
  return {
    buffer,
    filename: productionLabelPdfFilename(prepared),
    pageCount,
    labelCount,
    pageWidthMm: prepared.mode === "A4" ? productionLabelA4Layout.widthMm : option.widthMm,
    pageHeightMm: prepared.mode === "A4" ? productionLabelA4Layout.heightMm : option.heightMm
  };
}

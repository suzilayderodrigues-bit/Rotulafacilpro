import { snapshotBaseRotula, assertBaseRotulaPreserved } from "./base-rotula-preservation";
import assert from "node:assert/strict";
import { prisma } from "@rotula-facil-pro/db";
import { millimetersToPoints } from "../src/lib/final-label/pdf";
import {
  calculateProductionLabelA4Layout,
  productionLabelA4Layout,
  productionLabelFormats
} from "../src/lib/production-labels/domain";
import {
  prepareProductionLabelPdf,
  productionLabelContentDisposition,
  productionLabelPdfFilename,
  renderProductionLabelPdf,
  type PreparedProductionLabelPdf,
  type ProductionLabelPdfRequest
} from "../src/lib/production-labels/pdf";

const recipe = { id: "recipe-owned", name: "Palha Italiana / Edição São João!" };
const baseRequest: ProductionLabelPdfRequest = {
  recipeId: recipe.id,
  lot: "L240926",
  manufacturedAt: "2026-09-24",
  expiresAt: "2026-10-24",
  format: "PADRAO",
  quantity: "1",
  mode: "INDIVIDUAL"
};

function ready(request: Partial<ProductionLabelPdfRequest> = {}) {
  const result = prepareProductionLabelPdf(recipe, { ...baseRequest, ...request });
  if (result.status !== "READY") throw new Error(result.message);
  assert.equal(result.status, "READY");
  return result.value;
}

function blocked(code: string, request: Partial<ProductionLabelPdfRequest>) {
  const result = prepareProductionLabelPdf(recipe, { ...baseRequest, ...request });
  assert.equal(result.status, "BLOCKED");
  if (result.status !== "BLOCKED") throw new Error("A preparação deveria ter sido bloqueada.");
  assert.equal(result.code, code);
}

function mediaBox(buffer: Buffer) {
  const match = buffer.toString("latin1").match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
  assert(match, "MediaBox não encontrado.");
  return { width: Number(match[1]), height: Number(match[2]) };
}

function pdfPageCount(buffer: Buffer) {
  return (buffer.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length;
}

async function main() {
  const baseSnapshot = await snapshotBaseRotula();
  const before = await Promise.all([
    prisma.user.count(),
    prisma.recipe.count(),
    prisma.barcode.count(),
    prisma.barcodeUsage.count()
  ]);

  for (const format of Object.keys(productionLabelFormats) as Array<keyof typeof productionLabelFormats>) {
    const prepared = ready({ format });
    const result = await renderProductionLabelPdf(prepared);
    const option = productionLabelFormats[format];
    const box = mediaBox(result.buffer);
    assert.equal(result.buffer.subarray(0, 5).toString("ascii"), "%PDF-");
    assert(Math.abs(box.width - millimetersToPoints(option.widthMm)) < 0.01);
    assert(Math.abs(box.height - millimetersToPoints(option.heightMm)) < 0.01);
    assert.equal(result.pageCount, 1);
    assert.equal(result.labelCount, 1);
    assert.equal(pdfPageCount(result.buffer), 1);
  }

  const layout = calculateProductionLabelA4Layout("PADRAO", 41);
  assert.deepEqual(
    { columns: layout.columns, rows: layout.rows, labelsPerPage: layout.labelsPerPage, pageCount: layout.pageCount },
    { columns: 4, rows: 10, labelsPerPage: 40, pageCount: 2 }
  );
  const a4Prepared = ready({ mode: "A4", quantity: "41" });
  const a4 = await renderProductionLabelPdf(a4Prepared);
  const a4Box = mediaBox(a4.buffer);
  assert(Math.abs(a4Box.width - millimetersToPoints(210)) < 0.01);
  assert(Math.abs(a4Box.height - millimetersToPoints(297)) < 0.01);
  assert.equal(a4.pageCount, 2);
  assert.equal(a4.labelCount, 41);
  assert.equal(pdfPageCount(a4.buffer), 2);
  assert.equal(productionLabelA4Layout.marginMm, 10);
  assert.equal(productionLabelA4Layout.gapMm, 3);

  blocked("INVALID_INPUT", { lot: " " });
  blocked("INVALID_INPUT", { manufacturedAt: "2026-02-30" });
  blocked("INVALID_INPUT", { expiresAt: "data-inválida" });
  blocked("INVALID_INPUT", { expiresAt: "2026-09-23" });
  blocked("INVALID_INPUT", { recipeId: "recipe-other-user" });
  blocked("INVALID_FORMAT", { format: "INVENTADO" });
  blocked("INVALID_QUANTITY", { quantity: "0" });
  blocked("INVALID_QUANTITY", { quantity: "1.5" });
  blocked("INVALID_MODE", { mode: "OUTRO" });
  blocked("CONTENT_OVERFLOW", { format: "MINI", lot: "LOTE-DE-PRODUCAO-MUITO-LONGO" });

  const individualWithManyRequested = ready({ quantity: "999" });
  const individual = await renderProductionLabelPdf(individualWithManyRequested);
  assert.equal(individual.labelCount, 1, "O modo individual deve gerar somente uma etiqueta.");
  assert.equal(productionLabelPdfFilename(individualWithManyRequested), "etiqueta-palha-italiana-edicao-sao-joao-40x25mm.pdf");
  assert.equal(productionLabelPdfFilename({ ...a4Prepared } as PreparedProductionLabelPdf), "etiquetas-palha-italiana-edicao-sao-joao-a4.pdf");
  assert.equal(productionLabelContentDisposition("etiqueta.pdf", "download"), "attachment; filename=\"etiqueta.pdf\"");
  assert.equal(productionLabelContentDisposition("etiqueta.pdf", "print"), "inline; filename=\"etiqueta.pdf\"");

  const after = await Promise.all([
    prisma.user.count(),
    prisma.recipe.count(),
    prisma.barcode.count(),
    prisma.barcodeUsage.count()
  ]);
  assert.deepEqual(after, before, "Gerar etiquetas não pode persistir registros.");
  await assertBaseRotulaPreserved(baseSnapshot);
  console.log("PDF de etiquetas: 3 tamanhos, A4, paginação, validações, disposition e zero persistência: OK. BASE_ROTULA preservada.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

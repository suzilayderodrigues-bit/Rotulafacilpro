import { snapshotBaseRotula, assertBaseRotulaPreserved } from "./base-rotula-preservation";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { prisma } from "@rotula-facil-pro/db";
import type { FinalLabelPreview } from "../src/lib/final-label/preview";
import {
  assessFinalLabelPdf,
  finalLabelPdfFilename,
  millimetersToPoints,
  nutritionPdfCell,
  renderFinalLabelPdf
} from "../src/lib/final-label/pdf";

const rows = [
  "Valor energético", "Carboidratos", "Açúcares totais", "Açúcares adicionados", "Proteínas",
  "Gorduras totais", "Gorduras saturadas", "Gorduras trans", "Fibras alimentares", "Sódio"
].map((label, index) => ({
  nutrient: ["caloriesKcal", "carbohydratesG", "sugarsG", "addedSugarsG", "proteinsG", "totalFatG", "saturatedFatG", "transFatG", "fiberG", "sodiumMg"][index],
  label, unit: index === 0 ? "kcal" : index === 9 ? "mg" : "g", indented: [2, 3, 6, 7].includes(index),
  per100Value: index === 0 ? "100" : "1", perServingValue: index === 0 ? "50" : "0,5",
  dailyValuePercent: index === 2 ? null : "1", hasEstablishedDailyValue: index !== 2
})) as NonNullable<FinalLabelPreview["nutritionTable"]>["rows"];

const ready = {
  recipeId: "recipe-pdf", name: "Palha Italiana Clássica", physicalState: "SOLID_OR_SEMISOLID",
  netQuantityLabel: "PESO LÍQUIDO 100 g", ingredients: ["Leite", "Cacau"],
  ingredientsText: "INGREDIENTES: leite, cacau.", allergens: ["LEITE"], allergenStatus: "KNOWN",
  glutenStatus: "DOES_NOT_CONTAIN", lactoseStatus: "CONTAINS", crossContaminationRisk: "NO",
  crossContaminationAllergens: [], issues: [], status: "READY",
  barcode: {
    value: "RF-I-12345678-1234-1234-1234-123456789abc",
    type: "INTERNAL",
    format: "INTERNAL",
    display: { status: "READY", svg: "<svg xmlns=\"http://www.w3.org/2000/svg\"/>", symbology: "Code 128" }
  },
  frontOfPack: {
    shouldDisplayOfficialWarning: true,
    finalHighIn: [{ label: "AÇÚCAR ADICIONADO" }]
  } as unknown as FinalLabelPreview["frontOfPack"],
  nutritionTable: {
    status: "COMPLETE", statusMessage: "Completa", missingNutrients: [], configurationRequired: false,
    basisLabel: "100 g", servingLabel: "50 g", householdMeasure: "1 unidade",
    servingsPerPackageLabel: "2", isIndividualPackage: false, rows,
    dailyValueFootnote: "*Percentual de valores diários fornecidos pela porção.",
    regulatoryVersion: "BR-RDC429-IN75-v1", sourceReference: "Teste"
  }
} as FinalLabelPreview;

assert(Math.abs(millimetersToPoints(50) - 141.732283) < 0.001);
assert(Math.abs(millimetersToPoints(170) - 481.889764) < 0.001);
assert.equal(assessFinalLabelPdf(ready, "CINTA").allowed, true);
assert.equal(assessFinalLabelPdf({ ...ready, allergenStatus: "UNKNOWN" }, "CINTA").code, "REQUIRES_REVIEW");
assert.equal(assessFinalLabelPdf({ ...ready, status: "INCOMPLETE" }, "CINTA").code, "INCOMPLETE");
assert.equal(assessFinalLabelPdf({ ...ready, status: "REQUIRES_REVIEW" }, "CINTA").code, "REQUIRES_REVIEW");
assert.equal(assessFinalLabelPdf({ ...ready, ingredientsText: `INGREDIENTES: ${"ingrediente extenso, ".repeat(100)}` }, "CINTA").code, "CONTENT_OVERFLOW");
assert.equal(nutritionPdfCell(null), "—");
assert.notEqual(nutritionPdfCell(null), "0");
assert.equal(finalLabelPdfFilename("  Palha Italiana / Edição São João!  "), "rotula-palha-italiana-edicao-sao-joao.pdf");

async function main() {
  const baseSnapshot = await snapshotBaseRotula();
  const before = await Promise.all([
    prisma.barcode.count(),
    prisma.barcodeUsage.count(),
    prisma.billingCycle.aggregate({ _sum: { barcodeUsed: true } })
  ]);
  const generated = await renderFinalLabelPdf(ready, "CINTA", "ESSENCIAL");
  assert.equal(generated.status, "READY");
  if (generated.status !== "READY") throw new Error("PDF deveria estar pronto.");
  assert.equal(generated.buffer.subarray(0, 5).toString("ascii"), "%PDF-");
  const source = generated.buffer.toString("latin1");
  const mediaBox = source.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
  assert(mediaBox, "MediaBox não encontrado no PDF.");
  assert(Math.abs(Number(mediaBox[1]) - millimetersToPoints(50)) < 0.01);
  assert(Math.abs(Number(mediaBox[2]) - millimetersToPoints(170)) < 0.01);
  assert.equal((source.match(/\/Type\s*\/Page\b/g) ?? []).length, 1);
  const after = await Promise.all([
    prisma.barcode.count(),
    prisma.barcodeUsage.count(),
    prisma.billingCycle.aggregate({ _sum: { barcodeUsed: true } })
  ]);
  assert.deepEqual(after, before, "Exportar PDF não pode criar Barcode, Usage ou alterar barcodeUsed.");
  await assertBaseRotulaPreserved(baseSnapshot);
  if (process.env.PDF_SMOKE_OUTPUT) await writeFile(process.env.PDF_SMOKE_OUTPUT, generated.buffer);
  console.log("PDF: assinatura, MediaBox 50 × 170 mm, página única, bloqueios, null, filename e quota intacta: OK. BASE_ROTULA preservada.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

import assert from "node:assert/strict";
import type { FinalLabelPreview } from "../src/lib/final-label/preview";
import {
  finalLabelContentDisposition,
  finalLabelOrientation,
  prepareFinalLabelProduction
} from "../src/lib/final-label/production";

const ready = {
  recipeId: "receita impressão/a",
  name: "Palha Italiana",
  physicalState: "SOLID_OR_SEMISOLID",
  netQuantityLabel: "PESO LÍQUIDO 100 g",
  ingredients: ["Leite", "Cacau"],
  ingredientsText: "INGREDIENTES: leite, cacau.",
  allergens: ["LEITE"],
  glutenStatus: "DOES_NOT_CONTAIN",
  lactoseStatus: "CONTAINS",
  crossContaminationRisk: "NO",
  crossContaminationAllergens: [],
  issues: [],
  status: "READY",
  barcode: null,
  frontOfPack: { shouldDisplayOfficialWarning: false, finalHighIn: [] } as unknown as FinalLabelPreview["frontOfPack"],
  nutritionTable: {
    status: "COMPLETE",
    statusMessage: "Completa",
    missingNutrients: [],
    configurationRequired: false,
    basisLabel: "100 g",
    servingLabel: "50 g",
    householdMeasure: "1 unidade",
    servingsPerPackageLabel: "2",
    isIndividualPackage: false,
    rows: [],
    dailyValueFootnote: "*Percentual de valores diários fornecidos pela porção.",
    regulatoryVersion: "BR-RDC429-IN75-v1",
    sourceReference: "Teste"
  }
} as FinalLabelPreview;

const production = prepareFinalLabelProduction(ready, "CINTA", "ESSENCIAL");
assert.equal(production.allowed, true);
assert.equal(production.formatName, "Cinta");
assert.equal(production.widthMm, 50);
assert.equal(production.heightMm, 170);
assert.equal(production.orientation, "Retrato");
assert.equal(finalLabelOrientation(100, 70), "Paisagem");
assert.equal(finalLabelOrientation(100, 100), "Quadrado");
assert(production.downloadHref?.startsWith("/rotulo-final/receita%20impress%C3%A3o%2Fa/download?"));
assert.equal(production.downloadHref?.includes("mode=print"), false);
assert.equal(production.printHref, `${production.downloadHref}&mode=print`);
assert.equal(finalLabelContentDisposition("rotula-palha-italiana.pdf", null), "attachment; filename=\"rotula-palha-italiana.pdf\"");
assert.equal(finalLabelContentDisposition("rotula-palha-italiana.pdf", "print"), "inline; filename=\"rotula-palha-italiana.pdf\"");
assert.equal(finalLabelContentDisposition("rotula-palha-italiana.pdf", "unknown"), "attachment; filename=\"rotula-palha-italiana.pdf\"");

for (const status of ["INCOMPLETE", "REQUIRES_REVIEW"] as const) {
  const blocked = prepareFinalLabelProduction({ ...ready, status }, "CINTA", "ESSENCIAL");
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.assessment.code, status);
  assert.equal(blocked.downloadHref, null);
  assert.equal(blocked.printHref, null);
}

const overflow = prepareFinalLabelProduction({
  ...ready,
  ingredientsText: `INGREDIENTES: ${"ingrediente extenso, ".repeat(100)}`
}, "CINTA", "ESSENCIAL");
assert.equal(overflow.allowed, false);
assert.equal(overflow.assessment.code, "CONTENT_OVERFLOW");
assert.equal(overflow.downloadHref, null);
assert.equal(overflow.printHref, null);

console.log("Impressão: mesmo PDF protegido, tamanho/orientação, disposition e bloqueios: OK.");

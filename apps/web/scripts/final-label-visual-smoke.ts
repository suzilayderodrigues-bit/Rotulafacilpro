import assert from "node:assert/strict";
import type { FinalLabelPreview } from "../src/lib/final-label/preview";
import { assessLabelLayout, labelFormats, labelPreviewHref, labelTemplates, resolveLabelFormat, resolveLabelTemplate } from "../src/lib/final-label/visual";

const technical = {
  recipeId: "recipe-test", name: "Produto de teste", physicalState: "SOLID_OR_SEMISOLID",
  netQuantityLabel: "PESO LÍQUIDO 100 g", ingredients: ["Ingrediente 1", "Ingrediente 2"],
  ingredientsText: "INGREDIENTES: Ingrediente 1, Ingrediente 2.", allergens: [],
  glutenStatus: "DOES_NOT_CONTAIN", lactoseStatus: "DOES_NOT_CONTAIN", crossContaminationRisk: "NO",
  crossContaminationAllergens: [], nutritionTable: null, frontOfPack: null, barcode: null,
  issues: [], status: "READY"
} as FinalLabelPreview;

assert.deepEqual([labelFormats.CINTA.widthMm, labelFormats.CINTA.heightMm], [50, 170]);
assert.equal(labelFormats.CINTA.heightMm / labelFormats.CINTA.widthMm, 3.4);
assert(labelFormats.POTE.widthMm > 0 && labelFormats.POTE.heightMm > 0);
assert(labelFormats.POUCH.heightMm > labelFormats.POUCH.widthMm);
assert.deepEqual(Object.keys(labelTemplates), ["ESSENCIAL", "CLEAN", "DESTAQUE"]);
for (const format of Object.keys(labelFormats) as (keyof typeof labelFormats)[]) {
  for (const template of Object.keys(labelTemplates) as (keyof typeof labelTemplates)[]) {
    const url = new URL(labelPreviewHref(technical.recipeId, format, template), "http://localhost");
    assert.equal(resolveLabelFormat(url.searchParams.get("format") ?? undefined), format);
    assert.equal(resolveLabelTemplate(url.searchParams.get("template") ?? undefined), template);
    assert.equal(url.searchParams.get("recipeId"), technical.recipeId);
    assert.equal(technical.status, "READY");
  }
}
assert.equal(resolveLabelFormat("INVALID"), "CINTA");
assert.equal(resolveLabelTemplate("INVALID"), "ESSENCIAL");
const incomplete = { ...technical, status: "INCOMPLETE" as const };
const review = { ...technical, status: "REQUIRES_REVIEW" as const };
assert.equal(incomplete.status, "INCOMPLETE");
assert.equal(review.status, "REQUIRES_REVIEW");
const oversized = { ...technical, ingredientsText: `INGREDIENTES: ${"ingrediente composto, ".repeat(70)}` };
assert.equal(assessLabelLayout(oversized, "CINTA").warning, "CONTENT_OVERFLOW");
assert.equal(assessLabelLayout(oversized, "POTE").warning, "CONTENT_OVERFLOW");
assert.equal(assessLabelLayout(oversized, "POUCH").warning, "CONTENT_OVERFLOW");
assert.equal(assessLabelLayout(technical, "POUCH").warning, null);
console.log("Formatos, proporção, 3 modelos, query, estados técnicos e aviso de excesso: OK.");

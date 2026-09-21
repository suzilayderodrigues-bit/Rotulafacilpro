import assert from "node:assert/strict";
import {
  assessProductionLabelComposition,
  buildProductionLabelPreview,
  defaultProductionLabelFormat,
  findProductionLabelRecipe,
  formatProductionLabelCompactDate,
  formatProductionLabelDate,
  parseProductionLabelQuantity,
  productionLabelFormats,
  productionLabelSummary,
  validateProductionLabelInput
} from "../src/lib/production-labels/domain";

const recipes = [
  { id: "recipe-a", name: "Palha Italiana" },
  { id: "recipe-b", name: "Brownie" }
];

const validInput = {
  recipeId: "recipe-a",
  lot: "L240926",
  manufacturedAt: "2026-09-24",
  expiresAt: "2026-10-24"
};

assert.equal(validateProductionLabelInput(recipes, validInput).valid, true);
assert.equal(validateProductionLabelInput(recipes, { ...validInput, lot: "  " }).errors.lot, "Informe o lote.");
assert.equal(validateProductionLabelInput(recipes, { ...validInput, manufacturedAt: "2026-02-30" }).errors.manufacturedAt, "Informe uma data de fabricação válida.");
assert.equal(validateProductionLabelInput(recipes, { ...validInput, expiresAt: "data-inválida" }).errors.expiresAt, "Informe uma data de validade válida.");
assert.equal(validateProductionLabelInput(recipes, { ...validInput, expiresAt: "2026-09-23" }).errors.expiresAt, "A validade não pode ser anterior à fabricação.");
assert.equal(validateProductionLabelInput(recipes, { ...validInput, recipeId: "recipe-other-user" }).errors.recipeId, "Selecione um produto da sua conta.");
assert.equal(findProductionLabelRecipe(recipes, "recipe-other-user"), null);
assert.equal(formatProductionLabelDate("2026-09-24"), "24/09/2026");
assert.equal(formatProductionLabelCompactDate("2026-09-24"), "24/09/26");
assert.equal(formatProductionLabelDate("2026-02-30"), null);

const preview = buildProductionLabelPreview(recipes, validInput);
assert.deepEqual(preview, {
  productName: "Palha Italiana",
  lot: "L240926",
  manufacturedAt: "24/09/26",
  expiresAt: "24/10/26"
});
assert.equal(buildProductionLabelPreview(recipes, { ...validInput, lot: "LOTE-001" }).lot, "LOTE-001");
assert.equal(buildProductionLabelPreview(recipes, { ...validInput, recipeId: "recipe-b" }).productName, "Brownie");

assert.deepEqual(Object.keys(productionLabelFormats), ["MINI", "COMPACTA", "PADRAO"]);
assert.deepEqual(productionLabelFormats.MINI, { name: "Mini", widthMm: 30, heightMm: 20, maxNameCharactersPerLine: 16, maxNameLines: 2, maxLotCharacters: 14 });
assert.equal(productionLabelFormats.COMPACTA.widthMm, 35);
assert.equal(productionLabelFormats.COMPACTA.heightMm, 25);
assert.equal(productionLabelFormats.PADRAO.widthMm, 40);
assert.equal(productionLabelFormats.PADRAO.heightMm, 25);
assert.equal(defaultProductionLabelFormat, "PADRAO");
assert.equal(productionLabelFormats.MINI.widthMm / productionLabelFormats.MINI.heightMm, 30 / 20);
assert.equal(productionLabelFormats.COMPACTA.widthMm / productionLabelFormats.COMPACTA.heightMm, 35 / 25);
assert.equal(productionLabelFormats.PADRAO.widthMm / productionLabelFormats.PADRAO.heightMm, 40 / 25);
assert.equal(parseProductionLabelQuantity("1"), 1);
assert.equal(parseProductionLabelQuantity("30"), 30);
for (const invalidQuantity of ["", "0", "-1", "1.5", "texto", "1000"]) assert.equal(parseProductionLabelQuantity(invalidQuantity), null);
assert.equal(productionLabelSummary(1, "PADRAO"), "1 etiqueta • 40 × 25 mm");
assert.equal(productionLabelSummary(30, "PADRAO"), "30 etiquetas • 40 × 25 mm");
assert.equal(validInput.manufacturedAt, "2026-09-24", "A data original não pode ser modificada pela apresentação.");
assert.equal(assessProductionLabelComposition(preview, "PADRAO").status, "READY");
assert.equal(assessProductionLabelComposition(preview, "MINI").status, "READY");
const longContent = buildProductionLabelPreview(recipes, { ...validInput, lot: "LOTE-DE-PRODUCAO-MUITO-LONGO" });
assert.equal(assessProductionLabelComposition(longContent, "MINI").status, "CONTENT_OVERFLOW");
assert.equal(longContent.lot, "LOTE-DE-PRODUCAO-MUITO-LONGO", "Overflow não pode truncar o conteúdo.");
const longName = buildProductionLabelPreview([{ id: "long", name: "Palha Italiana Artesanal Especial de Chocolate" }], { ...validInput, recipeId: "long" });
assert.equal(assessProductionLabelComposition(longName, "MINI").status, "CONTENT_OVERFLOW");
assert.equal(longName.productName, "Palha Italiana Artesanal Especial de Chocolate");

console.log("Etiquetas: 3 formatos, quantidade, resumo, datas compactas, proporção e overflow: OK.");

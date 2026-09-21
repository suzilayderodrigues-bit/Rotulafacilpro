import assert from "node:assert/strict";
import {
  buildProductionLabelPreview,
  findProductionLabelRecipe,
  formatProductionLabelDate,
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
assert.equal(formatProductionLabelDate("2026-02-30"), null);

const preview = buildProductionLabelPreview(recipes, validInput);
assert.deepEqual(preview, {
  productName: "Palha Italiana",
  lot: "L240926",
  manufacturedAt: "24/09/2026",
  expiresAt: "24/10/2026"
});
assert.equal(buildProductionLabelPreview(recipes, { ...validInput, lot: "LOTE-001" }).lot, "LOTE-001");
assert.equal(buildProductionLabelPreview(recipes, { ...validInput, recipeId: "recipe-b" }).productName, "Brownie");

console.log("Etiquetas: ownership por lista, validações, datas brasileiras e prévia reativa: OK.");

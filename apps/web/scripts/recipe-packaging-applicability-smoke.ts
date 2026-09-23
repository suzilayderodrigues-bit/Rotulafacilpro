import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FrontOfPackPackagingCondition } from "@rotula-facil-pro/db";
import {
  evaluateFrontOfPackApplicability,
  frontOfPackPackagingConditionOptions
} from "../src/lib/regulatory";
import {
  RecipeValidationError,
  validateRecipeInformationInput,
  validateRecipeInput
} from "../src/lib/recipes/domain";
import { calculateMainPanelAreaCm2 } from "../src/lib/recipes/main-panel";

const baseInformation = {
  regulatoryCategory: "OUTSIDE_ANNEX_XVI",
  packagingCondition: "PACKAGED_IN_ABSENCE_OF_CONSUMER",
  mainPanelWidthCm: "5",
  mainPanelHeightCm: "5",
  glutenStatus: "DOES_NOT_CONTAIN",
  lactoseStatus: "DOES_NOT_CONTAIN",
  crossContaminationRisk: "NO",
  reviewed: true
} as const;

const enumValues = Object.values(FrontOfPackPackagingCondition).sort();
const optionValues = frontOfPackPackagingConditionOptions.map(({ value }) => value).sort();
assert.deepEqual(optionValues, enumValues, "A interface deve reutilizar exatamente a taxonomia da 7J.");

const packaged = validateRecipeInformationInput(baseInformation);
assert.equal(packaged.packagingCondition, "PACKAGED_IN_ABSENCE_OF_CONSUMER");
assert.equal(packaged.mainPanelWidthCm, 5);
assert.equal(packaged.mainPanelHeightCm, 5);
assert.equal(calculateMainPanelAreaCm2(packaged.mainPanelWidthCm!, packaged.mainPanelHeightCm!), 25);
assert.equal(calculateMainPanelAreaCm2(5, 17), 85);

for (const invalid of ["0", "-1", "texto"]) {
  assert.throws(
    () => validateRecipeInformationInput({ ...baseInformation, mainPanelWidthCm: invalid }),
    (error: unknown) => error instanceof RecipeValidationError && error.code === "invalid-main-panel-dimensions"
  );
}
assert.throws(
  () => validateRecipeInformationInput({ ...baseInformation, mainPanelHeightCm: "" }),
  (error: unknown) => error instanceof RecipeValidationError && error.code === "invalid-main-panel-dimensions"
);

for (const packagingCondition of [
  "NOT_PACKAGED_IN_ABSENCE_OF_CONSUMER",
  "PACKED_AT_POINT_OF_SALE_AT_CONSUMER_REQUEST",
  "PREPARED_OR_PORTIONED_AND_SOLD_ON_PREMISES"
] as const) {
  const other = validateRecipeInformationInput({
    ...baseInformation,
    packagingCondition,
    mainPanelWidthCm: "5",
    mainPanelHeightCm: "17"
  });
  assert.equal(other.mainPanelWidthCm, null, `${packagingCondition} deve limpar a largura.`);
  assert.equal(other.mainPanelHeightCm, null, `${packagingCondition} deve limpar a altura.`);
}

const legacy = validateRecipeInput({
  name: "Receita antiga",
  foodCategory: "Palha italiana",
  physicalState: "SOLID_OR_SEMISOLID",
  finalYieldUnit: "GRAM"
});
assert.equal(legacy.regulatoryCategory, null);

const smallPanel = evaluateFrontOfPackApplicability({
  regulatoryCategory: "OUTSIDE_ANNEX_XVI",
  packagingCondition: packaged.packagingCondition,
  mainPanelAreaCm2: calculateMainPanelAreaCm2(packaged.mainPanelWidthCm!, packaged.mainPanelHeightCm!)
});
assert.equal(smallPanel.status, "NOT_APPLICABLE");
assert.equal(smallPanel.reasonCode, "OPTIONAL_SMALL_MAIN_PANEL");

const largePanel = evaluateFrontOfPackApplicability({
  regulatoryCategory: "OUTSIDE_ANNEX_XVI",
  packagingCondition: "PACKAGED_IN_ABSENCE_OF_CONSUMER",
  mainPanelAreaCm2: calculateMainPanelAreaCm2(5, 17)
});
assert.equal(largePanel.status, "APPLICABLE");

const conditional = evaluateFrontOfPackApplicability({
  regulatoryCategory: "CHEESE",
  packagingCondition: "PACKAGED_IN_ABSENCE_OF_CONSUMER",
  mainPanelAreaCm2: 85
});
assert.equal(conditional.status, "REQUIRES_REVIEW");
assert.equal(conditional.reasonCode, "ANNEX_XVI_CONDITIONAL_REVIEW");

const componentSource = readFileSync(
  new URL("../src/app/receitas/[recipeId]/informacoes/regulatory-packaging-fields.tsx", import.meta.url),
  "utf8"
);
const previewSource = readFileSync(new URL("../src/lib/final-label/preview.ts", import.meta.url), "utf8");
const summarySource = readFileSync(new URL("../src/app/receitas/[recipeId]/page.tsx", import.meta.url), "utf8");
const migrationSource = readFileSync(
  new URL("../../../packages/db/prisma/migrations/20260923120000_recipe_packaging_condition_panel/migration.sql", import.meta.url),
  "utf8"
);

assert(componentSource.includes("setWidthCm(\"\")") && componentSource.includes("setHeightCm(\"\")"));
assert(!componentSource.includes("labelFormats") && !componentSource.includes("CINTA"));
assert(previewSource.includes("packagingCondition: recipe.packagingCondition"));
assert(previewSource.includes("mainPanelAreaCm2: deriveRecipeMainPanelAreaCm2(recipe)"));
assert(summarySource.includes("mainPanelAreaCm2: deriveRecipeMainPanelAreaCm2(recipe)"));
assert(!migrationSource.includes("NOT NULL"));
assert(!migrationSource.match(/UPDATE|DELETE|DROP TABLE/i));

console.log("Comercialização e painel: validação, limpeza, área derivada e integração 7J: OK.");

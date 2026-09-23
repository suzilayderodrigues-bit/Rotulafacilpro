import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { NutritionCalculationResult, NutritionNutrientField } from "../src/lib/nutrition";
import { nutritionNutrientFields } from "../src/lib/nutrition";
import {
  composeFrontOfPackDecision,
  conditionalAnnexXviCategories,
  evaluateFrontOfPack,
  evaluateFrontOfPackApplicability,
  primaryFrontOfPackRegulatoryCategoryOptions,
  specialFrontOfPackRegulatoryCategoryOptions
} from "../src/lib/regulatory";
import { validateRecipeInformationInput } from "../src/lib/recipes/domain";

function nutritionResult(values: Partial<Record<NutritionNutrientField, number>>): NutritionCalculationResult {
  const nutrients = nutritionNutrientFields.reduce<NutritionCalculationResult["nutrients"]>((acc, field) => {
    const hasValue = Object.hasOwn(values, field);
    const per100 = hasValue ? values[field]! : 0;
    acc[field] = { recipeTotal: per100 * 5, per100, perUnit: null, isComplete: true };
    return acc;
  }, {} as NutritionCalculationResult["nutrients"]);
  return { basis: "100g", finalYieldAmount: 500, finalYieldUnit: "GRAM", unitWeight: null, nutrients };
}

const packaged = {
  packagingCondition: "PACKAGED_IN_ABSENCE_OF_CONSUMER" as const,
  mainPanelAreaCm2: 85
};
const allNo = {
  addedSugarsAddition: "NO" as const,
  saturatedFatAddition: "NO" as const,
  sodiumAddition: "NO" as const
};

assert(primaryFrontOfPackRegulatoryCategoryOptions.some(({ value }) => value === "OUTSIDE_ANNEX_XVI"));
assert.equal(primaryFrontOfPackRegulatoryCategoryOptions.length, 7);
assert.equal(specialFrontOfPackRegulatoryCategoryOptions.length, 13);

for (const category of conditionalAnnexXviCategories) {
  const review = evaluateFrontOfPackApplicability({ regulatoryCategory: category, ...packaged });
  assert.equal(review.status, "REQUIRES_REVIEW", `${category} deve solicitar as respostas especiais.`);
}

const common = evaluateFrontOfPackApplicability({
  regulatoryCategory: "OUTSIDE_ANNEX_XVI",
  ...packaged
});
assert.equal(common.status, "APPLICABLE");
assert.deepEqual(common.evaluatedNutrients, ["addedSugars", "saturatedFat", "sodium"]);

const noneAdded = evaluateFrontOfPackApplicability({
  regulatoryCategory: "CHEESE",
  ...packaged,
  ...allNo
});
assert.equal(noneAdded.status, "NOT_APPLICABLE");
assert.equal(noneAdded.reasonCode, "ANNEX_XVI_CONDITIONAL_NO_ADDITION");

const unknown = evaluateFrontOfPackApplicability({
  regulatoryCategory: "CHEESE",
  ...packaged,
  ...allNo,
  sodiumAddition: "UNKNOWN"
});
assert.equal(unknown.status, "REQUIRES_REVIEW");

const cases = [
  ["addedSugars", "addedSugarsAddition", "addedSugarsG", 15],
  ["saturatedFat", "saturatedFatAddition", "saturatedFatG", 6],
  ["sodium", "sodiumAddition", "sodiumMg", 600]
] as const;

for (const [nutrient, field, nutritionField, threshold] of cases) {
  const applicability = evaluateFrontOfPackApplicability({
    regulatoryCategory: "CHEESE",
    ...packaged,
    ...allNo,
    [field]: "YES"
  });
  assert.equal(applicability.status, "APPLICABLE");
  assert.deepEqual(applicability.evaluatedNutrients, [nutrient]);

  const high = composeFrontOfPackDecision(
    applicability,
    evaluateFrontOfPack(nutritionResult({
      addedSugarsG: 99,
      saturatedFatG: 99,
      sodiumMg: 999,
      [nutritionField]: threshold
    }))
  );
  assert.equal(high.status, "SHOW_WARNING");
  assert.deepEqual(high.finalHighIn.map(({ nutrient: value }) => value), [nutrient]);

  const below = composeFrontOfPackDecision(
    applicability,
    evaluateFrontOfPack(nutritionResult({ [nutritionField]: threshold - 0.01 }))
  );
  assert.equal(below.status, "NO_WARNING");
  assert.equal(below.finalHighIn.length, 0);
}

const validated = validateRecipeInformationInput({
  regulatoryCategory: "CHEESE",
  packagingCondition: "PACKAGED_IN_ABSENCE_OF_CONSUMER",
  mainPanelWidthCm: 5,
  mainPanelHeightCm: 17,
  ...allNo,
  addedSugarsAddition: "YES",
  glutenStatus: "DOES_NOT_CONTAIN",
  lactoseStatus: "CONTAINS",
  crossContaminationRisk: "NO",
  reviewed: true
});
assert.equal(validated.addedSugarsAddition, "YES");
assert.equal(validated.saturatedFatAddition, "NO");
assert.equal(validated.sodiumAddition, "NO");

const smallPanel = evaluateFrontOfPackApplicability({
  regulatoryCategory: "OUTSIDE_ANNEX_XVI",
  packagingCondition: "PACKAGED_IN_ABSENCE_OF_CONSUMER",
  mainPanelAreaCm2: 25
});
const largePanel = evaluateFrontOfPackApplicability({
  regulatoryCategory: "OUTSIDE_ANNEX_XVI",
  packagingCondition: "PACKAGED_IN_ABSENCE_OF_CONSUMER",
  mainPanelAreaCm2: 85
});
assert.equal(smallPanel.reasonCode, "OPTIONAL_SMALL_MAIN_PANEL");
assert.equal(largePanel.status, "APPLICABLE");

const uiSource = readFileSync(
  new URL("../src/app/receitas/[recipeId]/informacoes/regulatory-category-fields.tsx", import.meta.url),
  "utf8"
);
assert(uiSource.includes("Seu produto se encaixa em alguma destas opções?"));
assert(uiSource.includes("Meu produto é de outro tipo especial"));
assert(uiSource.includes("Só precisamos confirmar uma informação"));
assert(!uiSource.includes("RDC 429") && !uiSource.includes("IN 75") && !uiSource.includes("relevantNutrientAddition"));

console.log("Finalização inteligente e exceções regulatórias por nutriente: OK.");

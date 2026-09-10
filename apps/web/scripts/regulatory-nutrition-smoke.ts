import { prisma } from "@rotula-facil-pro/db";
import {
  nutritionNutrientFields,
  type NutritionCalculationResult,
  type NutritionNutrientField
} from "../src/lib/nutrition";
import {
  calculateNutritionPerServing,
  getServingSuggestion,
  RegulatoryNutritionError,
  validateDailyValueRules
} from "../src/lib/regulatory";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertClose(actual: number | null, expected: number, message: string) {
  if (actual === null || Math.abs(actual - expected) > 0.000001) {
    throw new Error(`${message} Esperado ${expected}, recebido ${actual}.`);
  }
}

function nutritionResult(
  basis: NutritionCalculationResult["basis"],
  values: Partial<Record<NutritionNutrientField, number>> = {},
  incomplete: NutritionNutrientField[] = [],
  unitWeight: number | null = null
): NutritionCalculationResult {
  const nutrients = nutritionNutrientFields.reduce<NutritionCalculationResult["nutrients"]>((acc, field) => {
    const per100 = values[field] ?? 0;
    acc[field] = {
      recipeTotal: per100 * 5,
      per100,
      perUnit: unitWeight === null ? null : (per100 * unitWeight) / 100,
      isComplete: !incomplete.includes(field)
    };
    return acc;
  }, {} as NutritionCalculationResult["nutrients"]);

  return {
    basis,
    finalYieldAmount: 500,
    finalYieldUnit: basis === "100ml" ? "MILLILITER" : "GRAM",
    unitWeight,
    nutrients
  };
}

function expectIncompatibleUnit(run: () => unknown) {
  try {
    run();
  } catch (error) {
    assert(error instanceof RegulatoryNutritionError && error.code === "incompatible-serving-unit", "Erro de unidade incompatível não identificado.");
    return;
  }

  throw new Error("Unidade incompatível deveria bloquear o cálculo.");
}

async function main() {
  const dailyValueValidation = validateDailyValueRules();
  assert(dailyValueValidation.ruleCount === 11, "Devem existir 11 VDs oficiais para os nutrientes suportados.");

  const solid = nutritionResult("100g", { carbohydratesG: 20 }, [], 25);
  const solidBefore = JSON.stringify(solid);
  const solidResult = calculateNutritionPerServing(solid, 40, "GRAM");
  assertClose(solidResult.nutrients.carbohydratesG.perServing, 8, "Cálculo sólido por porção incorreto.");
  assertClose(solidResult.nutrients.carbohydratesG.dailyValuePercent, (8 / 300) * 100, "Cálculo bruto de %VD incorreto.");
  assert(solidResult.nutrients.carbohydratesG.dailyValueRule?.regulatoryVersion === "BR-RDC429-IN75-v1", "Rastreabilidade regulatória ausente.");
  assert(solidResult.nutrients.carbohydratesG.perServing !== solid.nutrients.carbohydratesG.perUnit, "servingSize não pode ser substituído por unitWeight.");
  assert(JSON.stringify(solid) === solidBefore, "O cálculo puro não pode alterar nem persistir o valor nutricional de entrada.");

  const liquid = nutritionResult("100ml", { carbohydratesG: 10 });
  const liquidResult = calculateNutritionPerServing(liquid, 200, "MILLILITER");
  assertClose(liquidResult.nutrients.carbohydratesG.perServing, 20, "Cálculo líquido por porção incorreto.");

  const withoutServing = calculateNutritionPerServing(solid, null, "GRAM");
  assert(withoutServing.servingSize === null, "Porção ausente deve permanecer ausente.");
  assert(withoutServing.nutrients.carbohydratesG.perServing === null, "Porção ausente não pode gerar perServing.");
  assert(withoutServing.nutrients.carbohydratesG.dailyValuePercent === null, "Porção ausente não pode gerar %VD.");

  const incomplete = nutritionResult("100g", { addedSugarsG: 9 }, ["addedSugarsG"]);
  const incompleteResult = calculateNutritionPerServing(incomplete, 40, "GRAM");
  assert(incompleteResult.nutrients.addedSugarsG.per100 === null, "Nutriente incompleto deve permanecer null.");
  assert(incompleteResult.nutrients.addedSugarsG.perServing === null, "Null não pode virar zero por porção.");

  const explicitZero = calculateNutritionPerServing(nutritionResult("100g", { transFatG: 0 }), 40, "GRAM");
  assert(explicitZero.nutrients.transFatG.perServing === 0, "Zero explícito deve permanecer zero.");
  assert(explicitZero.nutrients.transFatG.dailyValuePercent === 0, "Zero explícito deve produzir %VD bruto igual a zero.");

  const totalSugars = solidResult.nutrients.sugarsG;
  assert(!totalSugars.hasEstablishedDailyValue, "Açúcares totais não possuem VD no Anexo II.");
  assert(totalSugars.dailyValue === null && totalSugars.dailyValuePercent === null, "Nutriente sem VD não pode mostrar 0%.");

  expectIncompatibleUnit(() => calculateNutritionPerServing(solid, 40, "MILLILITER"));

  const preparationSuggestion = getServingSuggestion("Pós para preparar bolos e tortas", "SOLID_OR_SEMISOLID");
  assert(!preparationSuggestion.matched && preparationSuggestion.reason === "non-fixed-rule", "Regra PREPARATION_BASED não pode fornecer massa inventada.");
  const preparationWithoutServing = calculateNutritionPerServing(solid, null, "GRAM");
  assert(preparationWithoutServing.nutrients.carbohydratesG.perServing === null, "Regra baseada em preparo sem porção efetiva não pode calcular.");

  const baseRotula = await prisma.ingredient.count({ where: { source: "BASE_ROTULA" } });
  assert(baseRotula === 15, "BASE_ROTULA deve permanecer com 15 registros.");

  console.log(JSON.stringify({
    dailyValueRules: dailyValueValidation.ruleCount,
    solid: "OK",
    liquid: "OK",
    missingServing: "OK",
    nullPreserved: "OK",
    explicitZeroPreserved: "OK",
    dailyValue: "OK",
    nutrientWithoutDailyValue: "OK",
    incompatibleUnitBlocked: "OK",
    servingSizeIndependentFromUnitWeight: "OK",
    preparationBasedWithoutInventedWeight: "OK",
    noPersistence: "OK",
    baseRotula
  }, null, 2));
}

main().finally(() => prisma.$disconnect());

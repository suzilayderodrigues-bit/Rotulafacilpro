import { prisma } from "@rotula-facil-pro/db";
import {
  nutritionNutrientFields,
  type NutritionCalculationResult,
  type NutritionNutrientField
} from "../src/lib/nutrition";
import {
  calculateNutritionPerServing,
  formatDeclaredNutrientValue,
  formatNutritionForDeclaration,
  validateNutrientDeclarationRules
} from "../src/lib/regulatory";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function nutritionResult(
  values: Partial<Record<NutritionNutrientField, number>> = {},
  incomplete: NutritionNutrientField[] = []
): NutritionCalculationResult {
  const nutrients = nutritionNutrientFields.reduce<NutritionCalculationResult["nutrients"]>((acc, field) => {
    const per100 = values[field] ?? 0;
    acc[field] = {
      recipeTotal: per100 * 5,
      per100,
      perUnit: null,
      isComplete: !incomplete.includes(field)
    };
    return acc;
  }, {} as NutritionCalculationResult["nutrients"]);

  return {
    basis: "100g",
    finalYieldAmount: 500,
    finalYieldUnit: "GRAM",
    unitWeight: null,
    nutrients
  };
}

async function main() {
  const validation = validateNutrientDeclarationRules();
  assert(validation.ruleCount === 12, "Devem existir regras para os 12 nutrientes suportados.");
  assert(validation.rangeCount === 6, "As faixas de g e mg devem estar completas e sem sobreposição.");
  assert(validation.regulatoryVersion === "BR-RDC429-IN75-v1", "Versão regulatória divergente.");

  assert(formatDeclaredNutrientValue("caloriesKcal", 99.5).declaredNumericValue === 100, "Energia deve ser declarada em número inteiro.");
  assert(formatDeclaredNutrientValue("carbohydratesG", 1.05).displayValue === "1,1", "Arredondamento em g entre 1 e 10 incorreto.");
  assert(formatDeclaredNutrientValue("sodiumMg", 0.095).displayValue === "0,1", "Arredondamento em mg abaixo de 1 incorreto.");
  assert(formatDeclaredNutrientValue("sodiumMg", 12.5).declaredNumericValue === 13, "Arredondamento em mg acima de 10 incorreto.");

  const belowThreshold = formatDeclaredNutrientValue("sodiumMg", 4.9, true);
  const atThreshold = formatDeclaredNutrientValue("sodiumMg", 5, true);
  const aboveThreshold = formatDeclaredNutrientValue("sodiumMg", 5.01, true);
  assert(belowThreshold.declaredNumericValue === 0 && belowThreshold.nonSignificantApplied, "Valor abaixo do limite qualificado deve ser declarado zero.");
  assert(atThreshold.declaredNumericValue === 0 && atThreshold.nonSignificantApplied, "Valor no limite qualificado deve ser declarado zero.");
  assert(aboveThreshold.declaredNumericValue === 5 && !aboveThreshold.nonSignificantApplied, "Valor acima do limite não pode receber zero regulatório.");

  const pendingContext = formatDeclaredNutrientValue("totalFatG", 0.04);
  assert(pendingContext.declaredNumericValue === null && pendingContext.requiresNonSignificantReview, "Valor pequeno não pode virar zero sem qualificação explícita.");

  const explicitZero = formatDeclaredNutrientValue("transFatG", 0);
  assert(explicitZero.rawValue === 0 && explicitZero.declaredNumericValue === 0, "Zero explícito deve ser preservado.");

  const absent = formatDeclaredNutrientValue("fiberG", null);
  assert(absent.rawValue === null && absent.declaredNumericValue === null, "Null deve permanecer null.");

  const rawNutrition = calculateNutritionPerServing(
    nutritionResult({ carbohydratesG: 8.04, sugarsG: 7, sodiumMg: 12.49 }, ["fiberG"]),
    100,
    "GRAM"
  );
  rawNutrition.nutrients.sodiumMg.perServing = 1.05;
  rawNutrition.nutrients.sodiumMg.dailyValuePercent = (1.05 / 2000) * 100;
  const before = JSON.stringify(rawNutrition);
  const declared = formatNutritionForDeclaration(rawNutrition, { transFatG: true });

  assert(declared.nutrients.carbohydratesG.per100.declaredNumericValue === 8, "Valor por 100 deve ser arredondado separadamente.");
  assert(declared.nutrients.sodiumMg.per100.declaredNumericValue === 12, "Faixa por 100 em mg incorreta.");
  assert(declared.nutrients.sodiumMg.perServing.declaredNumericValue === 1.1, "Faixa por porção em mg incorreta.");
  assert(declared.nutrients.carbohydratesG.dailyValuePercent.rawValue === rawNutrition.nutrients.carbohydratesG.dailyValuePercent, "%VD bruto deve ser preservado.");
  assert(declared.nutrients.carbohydratesG.dailyValuePercent.declaredNumericValue === 3, "%VD deve usar o valor por porção declarado e ser inteiro.");
  assert(!declared.nutrients.sugarsG.hasEstablishedDailyValue, "Açúcares totais continuam sem VD estabelecido.");
  assert(declared.nutrients.sugarsG.dailyValuePercent.rawValue === null, "Nutriente sem VD deve manter %VD bruto null.");
  assert(declared.nutrients.sugarsG.dailyValuePercent.declaredNumericValue === null, "Nutriente sem VD não pode gerar 0%.");
  assert(declared.nutrients.fiberG.per100.declaredNumericValue === null, "Nutriente incompleto deve continuar null.");
  assert(JSON.stringify(rawNutrition) === before, "O formatador não pode alterar a entrada bruta.");

  const baseRotula = await prisma.ingredient.count({ where: { source: "BASE_ROTULA" } });
  assert(baseRotula === 15, "BASE_ROTULA deve permanecer com 15 registros.");

  console.log(JSON.stringify({
    declarationRules: validation.ruleCount,
    roundingRanges: validation.rangeCount,
    energy: "OK",
    grams: "OK",
    milligrams: "OK",
    dailyValuePercent: "OK",
    thresholds: "OK",
    nullPreserved: "OK",
    explicitZeroPreserved: "OK",
    missingDailyValuePreserved: "OK",
    rawInputImmutable: "OK",
    per100AndPerServingIndependent: "OK",
    baseRotula
  }, null, 2));
}

main().finally(() => prisma.$disconnect());

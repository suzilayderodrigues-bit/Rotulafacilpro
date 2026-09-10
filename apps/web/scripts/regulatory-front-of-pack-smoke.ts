import { readFileSync } from "node:fs";
import { prisma } from "@rotula-facil-pro/db";
import {
  nutritionNutrientFields,
  type NutritionCalculationResult,
  type NutritionNutrientField
} from "../src/lib/nutrition";
import {
  evaluateFrontOfPack,
  frontOfPackRules,
  regulatoryServingVersion
} from "../src/lib/regulatory";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function nutritionResult(
  basis: NutritionCalculationResult["basis"],
  values: Partial<Record<NutritionNutrientField, number>>,
  incomplete: NutritionNutrientField[] = []
): NutritionCalculationResult {
  const nutrients = nutritionNutrientFields.reduce<NutritionCalculationResult["nutrients"]>((acc, field) => {
    const per100 = values[field] ?? 0;
    acc[field] = {
      recipeTotal: per100 * 5,
      per100,
      perUnit: 999,
      isComplete: !incomplete.includes(field)
    };
    return acc;
  }, {} as NutritionCalculationResult["nutrients"]);

  return {
    basis,
    finalYieldAmount: 500,
    finalYieldUnit: basis === "100ml" ? "MILLILITER" : "GRAM",
    unitWeight: 50,
    nutrients
  };
}

function statuses(
  basis: NutritionCalculationResult["basis"],
  addedSugarsG: number,
  saturatedFatG: number,
  sodiumMg: number
) {
  return evaluateFrontOfPack(nutritionResult(basis, {
    addedSugarsG,
    saturatedFatG,
    sodiumMg
  })).nutrients;
}

async function main() {
  assert(frontOfPackRules.length === 3, "Devem existir três regras de rotulagem frontal.");
  assert(
    frontOfPackRules.every((rule) => rule.regulatoryVersion === regulatoryServingVersion),
    "Versão regulatória divergente."
  );
  assert(
    frontOfPackRules.map((rule) => rule.label).join("|") ===
      "AÇÚCAR ADICIONADO|GORDURA SATURADA|SÓDIO",
    "Grafia oficial das advertências divergente."
  );

  const solidBelow = statuses("100g", 14.99, 5.99, 599.99);
  assert(Object.values(solidBelow).every((item) => item.status === "NOT_HIGH"), "Valores sólidos abaixo do limite não podem gerar lupa.");
  const solidEqual = statuses("100g", 15, 6, 600);
  assert(Object.values(solidEqual).every((item) => item.status === "HIGH"), "Limites sólidos exatos devem gerar lupa.");
  const solidAbove = statuses("100g", 15.01, 6.01, 600.01);
  assert(Object.values(solidAbove).every((item) => item.status === "HIGH"), "Valores sólidos acima do limite devem gerar lupa.");

  const liquidBelow = statuses("100ml", 7.49, 2.99, 299.99);
  assert(Object.values(liquidBelow).every((item) => item.status === "NOT_HIGH"), "Valores líquidos abaixo do limite não podem gerar lupa.");
  const liquidEqual = statuses("100ml", 7.5, 3, 300);
  assert(Object.values(liquidEqual).every((item) => item.status === "HIGH"), "Limites líquidos exatos devem gerar lupa.");
  const liquidAbove = statuses("100ml", 7.51, 3.01, 300.01);
  assert(Object.values(liquidAbove).every((item) => item.status === "HIGH"), "Valores líquidos acima do limite devem gerar lupa.");

  const zero = statuses("100g", 0, 0, 0);
  assert(Object.values(zero).every((item) => item.status === "NOT_HIGH"), "Zero explícito deve permanecer NOT_HIGH.");

  const unknown = evaluateFrontOfPack(
    nutritionResult("100g", { addedSugarsG: 999, saturatedFatG: 0, sodiumMg: 0 }, ["addedSugarsG"])
  );
  assert(unknown.nutrients.addedSugars.status === "UNKNOWN", "Nutriente incompleto deve ser UNKNOWN.");
  assert(unknown.nutrients.addedSugars.rawValue === null, "Nutriente incompleto não pode expor soma parcial como valor regulatório.");

  const one = evaluateFrontOfPack(nutritionResult("100g", { addedSugarsG: 15 }));
  const two = evaluateFrontOfPack(nutritionResult("100g", { addedSugarsG: 15, saturatedFatG: 6 }));
  const three = evaluateFrontOfPack(nutritionResult("100g", { addedSugarsG: 15, saturatedFatG: 6, sodiumMg: 600 }));
  const none = evaluateFrontOfPack(nutritionResult("100g", {}));
  assert(one.highIn.length === 1, "Deve suportar uma advertência.");
  assert(two.highIn.length === 2, "Deve suportar duas advertências.");
  assert(three.highIn.length === 3, "Deve suportar três advertências.");
  assert(!none.hasAnyHighIn && !none.hasUnknownData, "Deve suportar ausência de advertências.");

  const highAndUnknown = evaluateFrontOfPack(
    nutritionResult("100g", { addedSugarsG: 15, saturatedFatG: 999 }, ["saturatedFatG"])
  );
  assert(highAndUnknown.hasAnyHighIn && highAndUnknown.hasUnknownData, "HIGH e UNKNOWN devem coexistir.");

  assert(solidEqual.addedSugars.rawValue === 15 && solidEqual.addedSugars.threshold === 15, "A comparação sólida deve usar o valor bruto por 100 g.");
  assert(liquidEqual.addedSugars.rawValue === 7.5 && liquidEqual.addedSugars.threshold === 7.5, "A comparação líquida deve usar o valor bruto por 100 ml.");
  assert(one.nutrients.addedSugars.rawValue !== 999, "unitWeight/perUnit não pode ser usado na avaliação.");

  const componentSource = readFileSync(
    new URL("../src/components/nutrition/front-of-pack-nutrition-preview.tsx", import.meta.url),
    "utf8"
  );
  assert(!componentSource.includes("evaluateFrontOfPack"), "O componente visual não pode recalcular a avaliação.");
  assert(!componentSource.includes("Math."), "O componente visual não pode calcular ou arredondar valores.");
  assert(!/7\.5|14\.99|15\.01|299\.99|300\.01|599\.99|600\.01/.test(componentSource), "Limites não podem estar no componente visual.");

  const baseRotula = await prisma.ingredient.count({ where: { source: "BASE_ROTULA" } });
  assert(baseRotula === 15, "BASE_ROTULA deve permanecer com 15 registros.");

  console.log(JSON.stringify({
    solidBelowEqualAbove: "OK",
    liquidBelowEqualAbove: "OK",
    nullUnknown: "OK",
    explicitZero: "OK",
    oneTwoThreeWarnings: "OK",
    noWarnings: "OK",
    highAndUnknown: "OK",
    rawPer100Basis: "OK",
    noServingOrUnitConversion: "OK",
    componentWithoutCalculation: "OK",
    regulatoryVersion: regulatoryServingVersion,
    baseRotula
  }, null, 2));
}

main().finally(() => prisma.$disconnect());

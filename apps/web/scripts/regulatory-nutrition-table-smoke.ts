import { snapshotBaseRotula, assertBaseRotulaPreserved } from "./base-rotula-preservation";
import { readFileSync } from "node:fs";
import { prisma } from "@rotula-facil-pro/db";
import {
  nutritionNutrientFields,
  type NutritionCalculationResult,
  type NutritionNutrientField
} from "../src/lib/nutrition";
import {
  buildNutritionTableViewModel,
  calculateNutritionPerServing,
  formatNutritionForDeclaration,
  mandatoryNutritionTableNutrients,
  nutritionTableDailyValueFootnote
} from "../src/lib/regulatory";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function nutritionResult(
  basis: NutritionCalculationResult["basis"],
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
    basis,
    finalYieldAmount: 500,
    finalYieldUnit: basis === "100ml" ? "MILLILITER" : "GRAM",
    unitWeight: null,
    nutrients
  };
}

function tableModel(
  basis: NutritionCalculationResult["basis"],
  servingSize: number | null,
  options: {
    incomplete?: NutritionNutrientField[];
    individual?: boolean;
    servingsPerPackage?: number | null;
  } = {}
) {
  const unit = basis === "100ml" ? "MILLILITER" : "GRAM";
  const raw = nutritionResult(basis, { carbohydratesG: 12.49, sugarsG: 4.2 }, options.incomplete);
  const regulatory = calculateNutritionPerServing(raw, servingSize, unit);
  const declared = formatNutritionForDeclaration(regulatory);

  return {
    declared,
    model: buildNutritionTableViewModel(declared, {
      householdMeasure: "1 unidade",
      servingsPerPackage: options.servingsPerPackage ?? 10,
      isIndividualPackage: options.individual ?? false
    })
  };
}

async function main() {
  const baseSnapshot = await snapshotBaseRotula();
  const solid = tableModel("100g", 50);
  assert(solid.model.basisLabel === "100 g", "Receita sólida deve usar a coluna 100 g.");
  assert(solid.model.servingLabel === "50 g", "Porção sólida incorreta.");
  assert(solid.model.householdMeasure === "1 unidade", "Medida caseira não foi preservada.");
  assert(solid.model.servingsPerPackageLabel === "10", "Porções por embalagem persistidas não foram exibidas.");
  assert(solid.model.status === "COMPLETE", "Tabela com nutrientes obrigatórios completos deve ser COMPLETE.");

  const liquid = tableModel("100ml", 200, { servingsPerPackage: 2.5 });
  assert(liquid.model.basisLabel === "100 ml", "Receita líquida deve usar a coluna 100 ml.");
  assert(liquid.model.servingLabel === "200 ml", "Porção líquida incorreta.");
  assert(liquid.model.servingsPerPackageLabel === "Cerca de 3", "Expressão de porções persistidas incorreta.");

  const individual = tableModel("100g", 50, { individual: true, servingsPerPackage: 1.5 });
  assert(individual.model.isIndividualPackage, "Embalagem individual não foi preservada.");
  assert(individual.model.servingsPerPackageLabel === null, "Embalagem individual não deve declarar porções por embalagem.");

  assert(
    solid.model.rows.map((row) => row.nutrient).join(",") === mandatoryNutritionTableNutrients.join(","),
    "Nutrientes não estão na ordem regulatória definida."
  );
  const carbohydrates = solid.model.rows.find((row) => row.nutrient === "carbohydratesG");
  assert(
    carbohydrates?.per100Value === solid.declared.nutrients.carbohydratesG.per100.displayValue,
    "A tabela deve consumir o valor declarado da Sprint 7G."
  );

  const totalSugars = solid.model.rows.find((row) => row.nutrient === "sugarsG");
  assert(totalSugars?.hasEstablishedDailyValue === false, "Açúcares totais não possuem VD estabelecido.");
  assert(totalSugars.dailyValuePercent === null, "Açúcares totais não podem receber %VD inventado.");
  assert(!solid.model.rows.some((row) => row.nutrient === ("calciumMg" as NutritionNutrientField)), "Cálcio não deve entrar automaticamente.");
  assert(!solid.model.rows.some((row) => row.nutrient === ("ironMg" as NutritionNutrientField)), "Ferro não deve entrar automaticamente.");

  const incomplete = tableModel("100g", 50, { incomplete: ["fiberG"] });
  const fiber = incomplete.model.rows.find((row) => row.nutrient === "fiberG");
  assert(incomplete.model.status === "INCOMPLETE", "Nutriente obrigatório null deve produzir INCOMPLETE.");
  assert(fiber?.per100Value === null && fiber.perServingValue === null, "Null não pode virar zero na tabela.");

  const withoutServing = tableModel("100g", null);
  assert(withoutServing.model.configurationRequired, "Porção ausente deve exigir configuração.");
  assert(withoutServing.model.status === "INCOMPLETE", "Tabela sem porção não pode ser completa.");
  assert(
    withoutServing.model.statusMessage === "Defina a porção e os dados da embalagem para gerar a tabela nutricional.",
    "Mensagem de configuração ausente."
  );

  assert(
    nutritionTableDailyValueFootnote === "*Percentual de valores diários fornecidos pela porção.",
    "Nota oficial de %VD divergente."
  );

  const componentSource = readFileSync(
    new URL("../src/components/nutrition/nutrition-facts-table.tsx", import.meta.url),
    "utf8"
  );
  assert(!componentSource.includes("Math."), "O componente visual não pode recalcular ou arredondar valores.");
  assert(!componentSource.includes("formatNutritionForDeclaration"), "O componente deve receber um view model pronto.");
  assert(componentSource.includes("overflow-x-auto"), "A tabela deve preservar todas as colunas no mobile.");

  const baseRotula = await prisma.ingredient.count({ where: { source: "BASE_ROTULA" } });
  await assertBaseRotulaPreserved(baseSnapshot);

  console.log(JSON.stringify({
    solidBasis: "OK",
    liquidBasis: "OK",
    servingAndHouseholdMeasure: "OK",
    servingsPerPackage: "OK",
    individualPackage: "OK",
    nutrientOrder: "OK",
    declaredValuesConsumed: "OK",
    totalSugarsWithoutDailyValue: "OK",
    calciumAndIronExcluded: "OK",
    nullPreserved: "OK",
    completeAndIncompleteStatus: "OK",
    missingServingState: "OK",
    componentWithoutCalculation: "OK",
    responsiveOverflow: "OK",
    baseRotula
  }, null, 2));
}

main().finally(() => prisma.$disconnect());

import { snapshotBaseRotula, assertBaseRotulaPreserved } from "./base-rotula-preservation";
import { prisma } from "@rotula-facil-pro/db";
import {
  nutritionNutrientFields,
  type NutritionCalculationResult,
  type NutritionNutrientField
} from "../src/lib/nutrition";
import {
  buildNutritionTableViewModel,
  calculateNutritionPerServing,
  formatNutritionForDeclaration
} from "../src/lib/regulatory";
import { RecipeValidationError, validateRecipePackagingInput } from "../src/lib/recipes/domain";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertClose(actual: number | null, expected: number, message: string) {
  if (actual === null || Math.abs(actual - expected) > 0.000001) {
    throw new Error(`${message} Esperado ${expected}, recebido ${actual}.`);
  }
}

function nutritionResult(
  values: Partial<Record<NutritionNutrientField, number>>,
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

function expectUnitMismatch(run: () => unknown) {
  try {
    run();
  } catch (error) {
    assert(
      error instanceof RecipeValidationError && error.code === "invalid-yield-unit",
      "A unidade incompatível deve ser rejeitada pelo domínio."
    );
    return;
  }

  throw new Error("A unidade incompatível não foi rejeitada.");
}

async function main() {
  const baseSnapshot = await snapshotBaseRotula();
  const individual = validateRecipePackagingInput(
    {
      netQuantity: 500,
      netQuantityUnit: "GRAM",
      servingSize: 250,
      servingUnit: "GRAM",
      householdMeasure: "2 unidades"
    },
    "SOLID_OR_SEMISOLID"
  );
  assert(individual.isIndividualPackage, "Razão 2 deve resultar em embalagem individual.");
  assert(individual.servingSize === 500, "A porção individual deve usar todo o conteúdo da embalagem.");
  assert(individual.servingsPerPackage === 1, "A embalagem individual deve conter uma porção.");
  assert(individual.householdMeasure === "1 embalagem", "A medida caseira individual deve ser a embalagem.");

  const regular = validateRecipePackagingInput(
    {
      netQuantity: 500,
      netQuantityUnit: "GRAM",
      servingSize: 200,
      servingUnit: "GRAM",
      householdMeasure: "2 unidades"
    },
    "SOLID_OR_SEMISOLID"
  );
  assert(!regular.isIndividualPackage, "Razão 2,5 não deve resultar em embalagem individual.");
  assert(regular.servingSize === 200, "A porção não individual deve permanecer inalterada.");
  assertClose(regular.servingsPerPackage, 2.5, "A quantidade de porções não individual está incorreta.");
  assert(regular.householdMeasure === "2 unidades", "A medida caseira não individual deve ser preservada.");

  const liquid = validateRecipePackagingInput(
    {
      netQuantity: 300,
      netQuantityUnit: "MILLILITER",
      servingSize: 150,
      servingUnit: "MILLILITER",
      householdMeasure: "1 copo"
    },
    "LIQUID"
  );
  assert(liquid.servingSize === 300, "A porção individual líquida deve usar todo o conteúdo.");
  assert(liquid.servingUnit === "MILLILITER", "A unidade líquida deve permanecer em mililitros.");
  assert(liquid.servingsPerPackage === 1, "A embalagem individual líquida deve conter uma porção.");

  expectUnitMismatch(() =>
    validateRecipePackagingInput(
      {
        netQuantity: 300,
        netQuantityUnit: "MILLILITER",
        servingSize: 150,
        servingUnit: "GRAM",
        householdMeasure: "1 copo"
      },
      "LIQUID"
    )
  );

  const raw = nutritionResult({ carbohydratesG: 20, saturatedFatG: 0 });
  const perServing = calculateNutritionPerServing(raw, individual.servingSize, individual.servingUnit);
  assertClose(perServing.nutrients.carbohydratesG.perServing, 100, "O cálculo deve usar todo o conteúdo individual.");
  assertClose(
    perServing.nutrients.carbohydratesG.dailyValuePercent,
    (100 / 300) * 100,
    "O %VD deve usar a mesma porção individual."
  );
  assert(perServing.nutrients.saturatedFatG.perServing === 0, "Zero nutricional explícito deve permanecer zero.");

  const table = buildNutritionTableViewModel(formatNutritionForDeclaration(perServing), {
    householdMeasure: individual.householdMeasure,
    servingsPerPackage: individual.servingsPerPackage,
    isIndividualPackage: individual.isIndividualPackage
  });
  assert(table.servingLabel === "500 g", "A tabela deve exibir a porção equivalente ao conteúdo total.");
  assert(table.householdMeasure === "1 embalagem", "A tabela deve exibir a medida caseira individual.");
  assert(table.servingsPerPackageLabel === null, "A tabela individual não deve exibir porções por embalagem.");

  const incompleteRaw = nutritionResult({ addedSugarsG: 10, saturatedFatG: 0 }, ["addedSugarsG"]);
  const incomplete = calculateNutritionPerServing(
    incompleteRaw,
    individual.servingSize,
    individual.servingUnit
  );
  assert(incomplete.nutrients.addedSugarsG.perServing === null, "Nutriente ausente não pode virar zero.");
  assert(incomplete.nutrients.saturatedFatG.perServing === 0, "Zero explícito deve continuar disponível.");

  const baseRotula = await prisma.ingredient.count({ where: { source: "BASE_ROTULA" } });
  await assertBaseRotulaPreserved(baseSnapshot);

  console.log(
    JSON.stringify(
      {
        individualSolid: "OK",
        nonIndividual: "OK",
        exactBoundary: "OK",
        individualLiquid: "OK",
        unitMismatchBlocked: "OK",
        perServingUsesFullPackage: "OK",
        dailyValueUsesFullPackage: "OK",
        tableUsesFullPackage: "OK",
        individualServingsPerPackage: "OK",
        nonIndividualPreserved: "OK",
        nullAndZeroPreserved: "OK",
        baseRotula
      },
      null,
      2
    )
  );
}

main().finally(() => prisma.$disconnect());

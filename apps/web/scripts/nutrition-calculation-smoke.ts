import { prisma } from "@rotula-facil-pro/db";
import {
  calculateRecipeNutrition,
  NutritionCalculationError,
  nutritionNutrientFields,
  type NutritionIngredient,
  type NutritionRecipe
} from "../src/lib/nutrition";
import { addRecipeIngredient, createRecipe, findRecipeForNutrition, updateRecipeYield } from "../src/lib/recipes/repository";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function assertClose(actual: number, expected: number, message: string) {
  if (Math.abs(actual - expected) > 0.000001) {
    throw new Error(message + ` Expected ${expected}, got ${actual}`);
  }
}

function expectNutritionError(code: string, run: () => unknown) {
  try {
    run();
  } catch (error) {
    if (error instanceof NutritionCalculationError && error.code === code) return true;
    throw error;
  }

  throw new Error("Expected nutrition error: " + code);
}

function ingredient(overrides: Partial<NutritionIngredient>): NutritionIngredient {
  const base = nutritionNutrientFields.reduce<Record<string, null>>((acc, field) => {
    acc[field] = null;
    return acc;
  }, {});

  return {
    ...base,
    id: overrides.id ?? "ingredient",
    name: overrides.name ?? "Ingredient",
    baseUnit: overrides.baseUnit ?? "GRAM",
    ...overrides
  } as NutritionIngredient;
}

function recipe(overrides: Partial<NutritionRecipe>): NutritionRecipe {
  return {
    id: "recipe",
    physicalState: "SOLID_OR_SEMISOLID",
    finalYieldAmount: 500,
    finalYieldUnit: "GRAM",
    unitWeight: null,
    ingredients: [],
    ...overrides
  };
}

async function runMathTests() {
  const caseA = calculateRecipeNutrition(recipe({
    ingredients: [
      { id: "a", amount: 250, unit: "GRAM", ingredient: ingredient({ carbohydratesG: 20 }) }
    ]
  }));
  assertClose(caseA.nutrients.carbohydratesG.recipeTotal, 50, "Case A carbohydrate total failed.");

  const caseB = calculateRecipeNutrition(recipe({
    ingredients: [
      { id: "a", amount: 100, unit: "GRAM", ingredient: ingredient({ id: "a", proteinsG: 10 }) },
      { id: "b", amount: 200, unit: "GRAM", ingredient: ingredient({ id: "b", proteinsG: 20 }) }
    ]
  }));
  assertClose(caseB.nutrients.proteinsG.recipeTotal, 50, "Case B protein total failed.");

  const caseC = calculateRecipeNutrition(recipe({
    finalYieldAmount: 500,
    ingredients: [
      { id: "a", amount: 250, unit: "GRAM", ingredient: ingredient({ carbohydratesG: 20 }) }
    ]
  }));
  assertClose(caseC.nutrients.carbohydratesG.per100, 10, "Case C per100 failed.");

  const caseD = calculateRecipeNutrition(recipe({
    finalYieldAmount: 500,
    unitWeight: 50,
    ingredients: [
      { id: "a", amount: 250, unit: "GRAM", ingredient: ingredient({ carbohydratesG: 20 }) }
    ]
  }));
  assertClose(caseD.nutrients.carbohydratesG.perUnit!, 5, "Case D perUnit failed.");

  const caseE = calculateRecipeNutrition(recipe({
    ingredients: [
      { id: "a", amount: 100, unit: "GRAM", ingredient: ingredient({ id: "a", fiberG: 2 }) },
      { id: "b", amount: 100, unit: "GRAM", ingredient: ingredient({ id: "b", fiberG: null }) }
    ]
  }));
  assertClose(caseE.nutrients.fiberG.recipeTotal, 2, "Case E known fiber contribution failed.");
  assert(caseE.nutrients.fiberG.isComplete === false, "Case E should be incomplete.");

  const caseF = calculateRecipeNutrition(recipe({
    ingredients: [
      { id: "a", amount: 100, unit: "GRAM", ingredient: ingredient({ id: "a", transFatG: 0 }) },
      { id: "b", amount: 200, unit: "GRAM", ingredient: ingredient({ id: "b", transFatG: 0 }) }
    ]
  }));
  assertClose(caseF.nutrients.transFatG.recipeTotal, 0, "Case F explicit zero failed.");
  assert(caseF.nutrients.transFatG.isComplete === true, "Case F should be complete.");

  const caseG = calculateRecipeNutrition(recipe({
    finalYieldAmount: 500,
    ingredients: [
      { id: "a", amount: 600, unit: "GRAM", ingredient: ingredient({ carbohydratesG: 10 }) }
    ]
  }));
  assertClose(caseG.nutrients.carbohydratesG.recipeTotal, 60, "Case G total failed.");
  assertClose(caseG.nutrients.carbohydratesG.per100, 12, "Case G should use final yield 500, not ingredient sum 600.");

  expectNutritionError("invalid-final-yield", () => calculateRecipeNutrition(recipe({ finalYieldAmount: 0, ingredients: [{ id: "a", amount: 100, unit: "GRAM", ingredient: ingredient({ caloriesKcal: 10 }) }] })));
  expectNutritionError("invalid-ingredient-amount", () => calculateRecipeNutrition(recipe({ ingredients: [{ id: "a", amount: -1, unit: "GRAM", ingredient: ingredient({ caloriesKcal: 10 }) }] })));
  expectNutritionError("invalid-final-yield", () => calculateRecipeNutrition(recipe({ finalYieldAmount: Number.NaN, ingredients: [{ id: "a", amount: 100, unit: "GRAM", ingredient: ingredient({ caloriesKcal: 10 }) }] })));
  expectNutritionError("invalid-nutrient-value", () => calculateRecipeNutrition(recipe({ ingredients: [{ id: "a", amount: 100, unit: "GRAM", ingredient: ingredient({ caloriesKcal: Number.POSITIVE_INFINITY }) }] })));
}

async function runRealDataSmoke() {
  const createdUserIds: string[] = [];
  const createdRecipeIds: string[] = [];

  try {
    const baseRotulaBefore = await prisma.ingredient.count({ where: { source: "BASE_ROTULA" } });
    const baseIngredient = await prisma.ingredient.findFirst({ where: { source: "BASE_ROTULA" }, orderBy: { name: "asc" } });

    assert(baseRotulaBefore === 15, "BASE_ROTULA before should be 15.");
    assert(baseIngredient, "Expected one BASE_ROTULA ingredient.");

    const user = await prisma.user.create({
      data: {
        name: "Sprint 7A Nutrition Smoke",
        email: "sprint-7a-" + Date.now() + "@example.test",
        passwordHash: "temporary-test-hash"
      }
    });
    createdUserIds.push(user.id);

    const createdRecipe = await createRecipe(user.id, {
      name: "Receita teste Sprint 7A",
      foodCategory: "Teste",
      physicalState: baseIngredient!.baseUnit === "MILLILITER" ? "LIQUID" : "SOLID_OR_SEMISOLID",
      finalYieldAmount: null,
      finalYieldUnit: baseIngredient!.baseUnit,
      unitsProduced: null,
      unitWeight: null
    });
    createdRecipeIds.push(createdRecipe.id);

    await addRecipeIngredient(user.id, createdRecipe.id, {
      ingredientId: baseIngredient!.id,
      amount: "100",
      unit: baseIngredient!.baseUnit
    });
    await updateRecipeYield(user.id, createdRecipe.id, {
      finalYieldAmount: "100",
      unitsProduced: "1",
      unitWeight: "100"
    });

    const hydratedRecipe = await findRecipeForNutrition(user.id, createdRecipe.id);
    assert(hydratedRecipe, "Expected hydrated recipe for nutrition.");

    const result = calculateRecipeNutrition(hydratedRecipe!);
    assert(result.finalYieldAmount === 100, "Real data smoke should use saved final yield.");
    assert(result.unitWeight === 100, "Real data smoke should calculate per unit.");
    assert(result.basis === (baseIngredient!.baseUnit === "MILLILITER" ? "100ml" : "100g"), "Real data smoke basis failed.");

    const baseRotulaAfter = await prisma.ingredient.count({ where: { source: "BASE_ROTULA" } });
    assert(baseRotulaAfter === 15, "BASE_ROTULA after should be 15.");

    return {
      baseRotulaBefore,
      ingredientUsed: baseIngredient!.name,
      basis: result.basis,
      calculatedNutrients: nutritionNutrientFields.length,
      incompleteNutrients: nutritionNutrientFields.filter((field) => !result.nutrients[field].isComplete).length,
      baseRotulaAfter
    };
  } finally {
    const recipeIngredientIds = createdRecipeIds.length
      ? await prisma.recipeIngredient.findMany({ where: { recipeId: { in: createdRecipeIds } }, select: { id: true } })
      : [];
    await prisma.recipeIngredient.deleteMany({ where: { id: { in: recipeIngredientIds.map((item) => item.id) } } });
    await prisma.recipe.deleteMany({ where: { id: { in: createdRecipeIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
}

async function main() {
  await runMathTests();
  const realData = await runRealDataSmoke();
  const baseRotulaFinal = await prisma.ingredient.count({ where: { source: "BASE_ROTULA" } });

  console.log(JSON.stringify({
    mathTests: "OK",
    realData,
    baseRotulaFinal
  }, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});

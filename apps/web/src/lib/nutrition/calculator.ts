export const nutritionNutrientFields = [
  "caloriesKcal",
  "carbohydratesG",
  "proteinsG",
  "totalFatG",
  "saturatedFatG",
  "transFatG",
  "fiberG",
  "sodiumMg",
  "sugarsG",
  "addedSugarsG",
  "calciumMg",
  "ironMg"
] as const;

export type NutritionNutrientField = (typeof nutritionNutrientFields)[number];
export type NutritionPhysicalState = "SOLID_OR_SEMISOLID" | "LIQUID";
export type NutritionUnit = "GRAM" | "MILLILITER";
export type NumericLike = number | string | { toString(): string } | null | undefined;

export type NutritionIngredient = Record<NutritionNutrientField, NumericLike> & {
  id: string;
  name: string;
  baseUnit: NutritionUnit;
};

export type NutritionRecipeIngredient = {
  id: string;
  amount: NumericLike;
  unit: NutritionUnit;
  ingredient: NutritionIngredient;
};

export type NutritionRecipe = {
  id: string;
  physicalState: NutritionPhysicalState;
  finalYieldAmount: NumericLike;
  finalYieldUnit: NutritionUnit;
  unitWeight?: NumericLike;
  ingredients: NutritionRecipeIngredient[];
};

export type NutritionCalculatedNutrient = {
  recipeTotal: number;
  per100: number;
  perUnit: number | null;
  isComplete: boolean;
};

export type NutritionCalculationResult = {
  basis: "100g" | "100ml";
  finalYieldAmount: number;
  finalYieldUnit: NutritionUnit;
  unitWeight: number | null;
  nutrients: Record<NutritionNutrientField, NutritionCalculatedNutrient>;
};

export type NutritionCalculationErrorCode =
  | "recipe-has-no-ingredients"
  | "invalid-final-yield"
  | "invalid-unit-weight"
  | "invalid-ingredient-amount"
  | "invalid-ingredient-unit"
  | "invalid-yield-unit"
  | "invalid-nutrient-value";

export class NutritionCalculationError extends Error {
  constructor(public readonly code: NutritionCalculationErrorCode) {
    super(code);
  }
}

function toNumber(value: NumericLike, errorCode: NutritionCalculationErrorCode) {
  if (value === null || value === undefined || value === "") {
    throw new NutritionCalculationError(errorCode);
  }

  const parsed = typeof value === "number" ? value : Number(value.toString().replace(",", "."));

  if (!Number.isFinite(parsed)) {
    throw new NutritionCalculationError(errorCode);
  }

  return parsed;
}

function toOptionalNumber(value: NumericLike, errorCode: NutritionCalculationErrorCode) {
  if (value === null || value === undefined || value === "") return null;

  return toNumber(value, errorCode);
}

function validatePositive(value: number, errorCode: NutritionCalculationErrorCode) {
  if (value <= 0) {
    throw new NutritionCalculationError(errorCode);
  }

  return value;
}

function validateYieldUnit(recipe: NutritionRecipe) {
  if (recipe.physicalState === "SOLID_OR_SEMISOLID" && recipe.finalYieldUnit !== "GRAM") {
    throw new NutritionCalculationError("invalid-yield-unit");
  }

  if (recipe.physicalState === "LIQUID" && recipe.finalYieldUnit !== "MILLILITER") {
    throw new NutritionCalculationError("invalid-yield-unit");
  }
}

function nutrientValue(value: NumericLike) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = typeof value === "number" ? value : Number(value.toString().replace(",", "."));

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new NutritionCalculationError("invalid-nutrient-value");
  }

  return parsed;
}

export function calculateRecipeNutrition(recipe: NutritionRecipe): NutritionCalculationResult {
  if (recipe.ingredients.length === 0) {
    throw new NutritionCalculationError("recipe-has-no-ingredients");
  }

  validateYieldUnit(recipe);

  const finalYieldAmount = validatePositive(
    toNumber(recipe.finalYieldAmount, "invalid-final-yield"),
    "invalid-final-yield"
  );
  const unitWeight = toOptionalNumber(recipe.unitWeight, "invalid-unit-weight");

  if (unitWeight !== null) {
    validatePositive(unitWeight, "invalid-unit-weight");
  }

  const nutrients = nutritionNutrientFields.reduce<Record<NutritionNutrientField, NutritionCalculatedNutrient>>(
    (acc, field) => {
      acc[field] = {
        recipeTotal: 0,
        per100: 0,
        perUnit: unitWeight === null ? null : 0,
        isComplete: true
      };
      return acc;
    },
    {} as Record<NutritionNutrientField, NutritionCalculatedNutrient>
  );

  for (const item of recipe.ingredients) {
    const amount = validatePositive(
      toNumber(item.amount, "invalid-ingredient-amount"),
      "invalid-ingredient-amount"
    );

    if (item.unit !== item.ingredient.baseUnit) {
      throw new NutritionCalculationError("invalid-ingredient-unit");
    }

    for (const field of nutritionNutrientFields) {
      const per100Ingredient = nutrientValue(item.ingredient[field]);

      if (per100Ingredient === null) {
        nutrients[field].isComplete = false;
        continue;
      }

      nutrients[field].recipeTotal += (per100Ingredient * amount) / 100;
    }
  }

  for (const field of nutritionNutrientFields) {
    const per100 = (nutrients[field].recipeTotal * 100) / finalYieldAmount;
    nutrients[field].per100 = per100;
    nutrients[field].perUnit = unitWeight === null ? null : (per100 * unitWeight) / 100;
  }

  return {
    basis: recipe.finalYieldUnit === "MILLILITER" ? "100ml" : "100g",
    finalYieldAmount,
    finalYieldUnit: recipe.finalYieldUnit,
    unitWeight,
    nutrients
  };
}

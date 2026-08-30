import type { IngredientBaseUnit, RecipePhysicalState } from "@rotula-facil-pro/db";

export type RecipeInput = {
  name: string;
  foodCategory?: string | null;
  physicalState: RecipePhysicalState;
  finalYieldAmount?: number | string | null;
  finalYieldUnit: IngredientBaseUnit;
  unitsProduced?: number | string | null;
  unitWeight?: number | string | null;
};

export type RecipeIngredientInput = {
  ingredientId: string;
  amount: number | string;
  unit: IngredientBaseUnit;
};

export type RecipeValidationErrorCode =
  | "name-required"
  | "invalid-physical-state"
  | "invalid-yield-unit"
  | "invalid-final-yield"
  | "invalid-units-produced"
  | "invalid-unit-weight"
  | "invalid-amount"
  | "unit-mismatch"
  | "recipe-not-found"
  | "ingredient-not-found";

export class RecipeValidationError extends Error {
  constructor(public readonly code: RecipeValidationErrorCode) {
    super(code);
  }
}

function parseOptionalPositiveDecimal(
  value: number | string | null | undefined,
  errorCode: RecipeValidationErrorCode
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new RecipeValidationError(errorCode);
  }

  return parsed;
}

function parsePositiveDecimal(value: number | string, errorCode: RecipeValidationErrorCode) {
  const parsed = typeof value === "number" ? value : Number(value.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new RecipeValidationError(errorCode);
  }

  return parsed;
}

function parseOptionalPositiveInteger(
  value: number | string | null | undefined,
  errorCode: RecipeValidationErrorCode
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new RecipeValidationError(errorCode);
  }

  return parsed;
}

function validatePhysicalState(value: RecipePhysicalState) {
  if (value !== "SOLID_OR_SEMISOLID" && value !== "LIQUID") {
    throw new RecipeValidationError("invalid-physical-state");
  }

  return value;
}

function validateYieldUnit(physicalState: RecipePhysicalState, unit: IngredientBaseUnit) {
  if (physicalState === "SOLID_OR_SEMISOLID" && unit !== "GRAM") {
    throw new RecipeValidationError("invalid-yield-unit");
  }

  if (physicalState === "LIQUID" && unit !== "MILLILITER") {
    throw new RecipeValidationError("invalid-yield-unit");
  }

  return unit;
}

export function validateRecipeInput(input: RecipeInput) {
  const name = input.name.trim();
  const physicalState = validatePhysicalState(input.physicalState);

  if (!name) {
    throw new RecipeValidationError("name-required");
  }

  return {
    name,
    foodCategory: input.foodCategory?.trim() || null,
    physicalState,
    finalYieldAmount: parseOptionalPositiveDecimal(input.finalYieldAmount, "invalid-final-yield"),
    finalYieldUnit: validateYieldUnit(physicalState, input.finalYieldUnit),
    unitsProduced: parseOptionalPositiveInteger(input.unitsProduced, "invalid-units-produced"),
    unitWeight: parseOptionalPositiveDecimal(input.unitWeight, "invalid-unit-weight")
  };
}

export function validateRecipeIngredientInput(input: RecipeIngredientInput) {
  if (input.unit !== "GRAM" && input.unit !== "MILLILITER") {
    throw new RecipeValidationError("invalid-yield-unit");
  }

  return {
    ingredientId: input.ingredientId,
    amount: parsePositiveDecimal(input.amount, "invalid-amount"),
    unit: input.unit
  };
}

export function assertMatchingIngredientUnit(
  ingredientUnit: IngredientBaseUnit,
  recipeIngredientUnit: IngredientBaseUnit
) {
  if (ingredientUnit !== recipeIngredientUnit) {
    throw new RecipeValidationError("unit-mismatch");
  }
}

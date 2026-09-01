import type {
  IngredientBaseUnit,
  RecipeCrossContaminationRisk,
  RecipeDisclosureStatus,
  RecipePhysicalState
} from "@rotula-facil-pro/db";

export type RecipeYieldInput = {
  finalYieldAmount?: number | string | null;
  unitsProduced?: number | string | null;
  unitWeight?: number | string | null;
};

export type RecipeInput = RecipeYieldInput & {
  name: string;
  foodCategory?: string | null;
  physicalState: RecipePhysicalState;
  finalYieldUnit: IngredientBaseUnit;
};

export type RecipeIngredientInput = {
  ingredientId: string;
  amount: number | string;
  unit: IngredientBaseUnit;
};

export type RecipeInformationInput = {
  confirmedAllergens?: string[] | string | null;
  additionalAllergens?: string | null;
  glutenStatus?: string | null;
  lactoseStatus?: string | null;
  crossContaminationRisk?: string | null;
  crossContaminationAllergens?: string | null;
  reviewed?: string | boolean | null;
};

export type RecipeValidationErrorCode =
  | "name-required"
  | "invalid-physical-state"
  | "invalid-yield-unit"
  | "invalid-final-yield"
  | "invalid-units-produced"
  | "invalid-unit-weight"
  | "inconsistent-yield"
  | "recipe-has-no-ingredients"
  | "invalid-information"
  | "missing-review-confirmation"
  | "invalid-amount"
  | "unit-mismatch"
  | "duplicate-ingredient"
  | "recipe-not-found"
  | "ingredient-not-found";

export class RecipeValidationError extends Error {
  constructor(public readonly code: RecipeValidationErrorCode) {
    super(code);
  }
}

const YIELD_TOLERANCE = 0.01;
const DISCLOSURE_STATUSES = ["CONTAINS", "DOES_NOT_CONTAIN", "NEEDS_REVIEW"] as const;
const CROSS_CONTAMINATION_RISKS = ["YES", "NO", "UNKNOWN"] as const;

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

function valuesAreClose(left: number, right: number) {
  return Math.abs(left - right) <= YIELD_TOLERANCE;
}

function nullableCount(values: Array<number | null>) {
  return values.filter((value) => value === null).length;
}

function normalizeTextList(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => (value ?? "").split(","))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function normalizeFormList(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return normalizeTextList(value);
  return normalizeTextList([value]);
}

function validateDisclosureStatus(value: string | null | undefined): RecipeDisclosureStatus {
  if (DISCLOSURE_STATUSES.includes(value as RecipeDisclosureStatus)) {
    return value as RecipeDisclosureStatus;
  }

  throw new RecipeValidationError("invalid-information");
}

function validateCrossContaminationRisk(value: string | null | undefined): RecipeCrossContaminationRisk {
  if (CROSS_CONTAMINATION_RISKS.includes(value as RecipeCrossContaminationRisk)) {
    return value as RecipeCrossContaminationRisk;
  }

  throw new RecipeValidationError("invalid-information");
}

export function resolveRecipeYieldValues(input: {
  finalYieldAmount: number | null;
  unitsProduced: number | null;
  unitWeight: number | null;
}) {
  const { finalYieldAmount, unitsProduced, unitWeight } = input;
  const missing = nullableCount([finalYieldAmount, unitsProduced, unitWeight]);

  if (missing === 0) {
    if (!valuesAreClose(finalYieldAmount!, unitsProduced! * unitWeight!)) {
      throw new RecipeValidationError("inconsistent-yield");
    }

    return input;
  }

  if (missing !== 1) {
    return input;
  }

  if (finalYieldAmount === null && unitsProduced !== null && unitWeight !== null) {
    return {
      finalYieldAmount: unitsProduced * unitWeight,
      unitsProduced,
      unitWeight
    };
  }

  if (unitsProduced === null && finalYieldAmount !== null && unitWeight !== null) {
    const calculatedUnits = finalYieldAmount / unitWeight;
    const roundedUnits = Math.round(calculatedUnits);

    if (!valuesAreClose(calculatedUnits, roundedUnits) || roundedUnits <= 0) {
      throw new RecipeValidationError("inconsistent-yield");
    }

    return {
      finalYieldAmount,
      unitsProduced: roundedUnits,
      unitWeight
    };
  }

  if (unitWeight === null && finalYieldAmount !== null && unitsProduced !== null) {
    return {
      finalYieldAmount,
      unitsProduced,
      unitWeight: finalYieldAmount / unitsProduced
    };
  }

  return input;
}

export function validateRecipeYieldInput(input: RecipeYieldInput) {
  const finalYieldAmount = parseOptionalPositiveDecimal(input.finalYieldAmount, "invalid-final-yield");
  const unitsProduced = parseOptionalPositiveInteger(input.unitsProduced, "invalid-units-produced");
  const unitWeight = parseOptionalPositiveDecimal(input.unitWeight, "invalid-unit-weight");

  return resolveRecipeYieldValues({ finalYieldAmount, unitsProduced, unitWeight });
}

export function validateRecipeInput(input: RecipeInput) {
  const name = input.name.trim();
  const physicalState = validatePhysicalState(input.physicalState);
  const resolvedYield = validateRecipeYieldInput(input);

  if (!name) {
    throw new RecipeValidationError("name-required");
  }

  return {
    name,
    foodCategory: input.foodCategory?.trim() || null,
    physicalState,
    ...resolvedYield,
    finalYieldUnit: validateYieldUnit(physicalState, input.finalYieldUnit)
  };
}

export function validateRecipeInformationInput(input: RecipeInformationInput) {
  if (input.reviewed !== true && input.reviewed !== "on") {
    throw new RecipeValidationError("missing-review-confirmation");
  }

  const confirmedAllergens = normalizeTextList([
    ...normalizeFormList(input.confirmedAllergens),
    input.additionalAllergens
  ]);
  const crossContaminationRisk = validateCrossContaminationRisk(input.crossContaminationRisk);

  return {
    confirmedAllergens,
    glutenStatus: validateDisclosureStatus(input.glutenStatus),
    lactoseStatus: validateDisclosureStatus(input.lactoseStatus),
    crossContaminationRisk,
    crossContaminationAllergens:
      crossContaminationRisk === "YES" ? normalizeTextList([input.crossContaminationAllergens]) : [],
    informationReviewedAt: new Date()
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

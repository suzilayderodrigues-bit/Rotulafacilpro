import type {
  FrontOfPackPackagingCondition,
  FrontOfPackRegulatoryCategory,
  FrontOfPackNutrientAdditionStatus,
  IngredientBaseUnit,
  RecipeCrossContaminationRisk,
  RecipeDisclosureStatus,
  RecipePhysicalState
} from "@rotula-facil-pro/db";
import { calculateMainPanelAreaCm2 } from "./main-panel";

export type RecipeYieldInput = {
  yieldMode?: string;
  finalYieldAmount?: number | string | null;
  unitsProduced?: number | string | null;
  unitWeight?: number | string | null;
};

export type RecipeInput = RecipeYieldInput & {
  name: string;
  foodCategory?: string | null;
  regulatoryCategory?: string | null;
  physicalState: RecipePhysicalState;
  finalYieldUnit: IngredientBaseUnit;
};

export type RecipeIngredientInput = {
  ingredientId: string;
  amount: number | string;
  unit: IngredientBaseUnit;
};

export type RecipeInformationInput = {
  regulatoryCategory?: string | null;
  packagingCondition?: string | null;
  mainPanelWidthCm?: number | string | null;
  mainPanelHeightCm?: number | string | null;
  addedSugarsAddition?: string | null;
  saturatedFatAddition?: string | null;
  sodiumAddition?: string | null;
  confirmedAllergens?: string[] | string | null;
  additionalAllergens?: string | null;
  glutenStatus?: string | null;
  lactoseStatus?: string | null;
  crossContaminationRisk?: string | null;
  crossContaminationAllergens?: string | null;
  reviewed?: string | boolean | null;
};

export type RecipePackagingInput = {
  netQuantity: number | string;
  netQuantityUnit: IngredientBaseUnit;
  servingSize: number | string;
  servingUnit: IngredientBaseUnit;
  householdMeasure: string;
};

export type RecipeValidationErrorCode =
  | "name-required"
  | "invalid-physical-state"
  | "invalid-yield-unit"
  | "invalid-final-yield"
  | "invalid-units-produced"
  | "invalid-unit-weight"
  | "invalid-net-quantity"
  | "invalid-serving-size"
  | "invalid-household-measure"
  | "inconsistent-yield"
  | "recipe-has-no-ingredients"
  | "invalid-information"
  | "invalid-regulatory-category"
  | "invalid-packaging-condition"
  | "invalid-main-panel-dimensions"
  | "invalid-nutrient-addition-status"
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
const REGULATORY_CATEGORIES: readonly FrontOfPackRegulatoryCategory[] = [
  "OUTSIDE_ANNEX_XVI",
  "PLAIN_PLANT_FOOD",
  "FLOUR",
  "MEAT_OR_FISH",
  "EGG",
  "FERMENTED_MILK",
  "CHEESE",
  "MAMMAL_MILK",
  "MILK_POWDER",
  "OLIVE_OR_OTHER_VEGETABLE_OIL",
  "SALT",
  "INFANT_FORMULA",
  "ENTERAL_FORMULA",
  "WEIGHT_CONTROL_FOOD",
  "DIETARY_SUPPLEMENT",
  "ALCOHOLIC_BEVERAGE",
  "INDUSTRIAL_PROCESSING_ONLY",
  "FOOD_SERVICE_ONLY",
  "FOOD_ADDITIVE_OR_PROCESSING_AID",
  "DIETARY_FORMULA_FOR_INBORN_ERRORS"
];
const PACKAGING_CONDITIONS: readonly FrontOfPackPackagingCondition[] = [
  "PACKAGED_IN_ABSENCE_OF_CONSUMER",
  "NOT_PACKAGED_IN_ABSENCE_OF_CONSUMER",
  "PACKED_AT_POINT_OF_SALE_AT_CONSUMER_REQUEST",
  "PREPARED_OR_PORTIONED_AND_SOLD_ON_PREMISES"
];
const NUTRIENT_ADDITION_STATUSES: readonly FrontOfPackNutrientAdditionStatus[] = ["YES", "NO", "UNKNOWN"];
const CONDITIONAL_REGULATORY_CATEGORIES: readonly FrontOfPackRegulatoryCategory[] = [
  "PLAIN_PLANT_FOOD",
  "FLOUR",
  "MEAT_OR_FISH",
  "EGG",
  "FERMENTED_MILK",
  "CHEESE"
];

export function validateRegulatoryCategory(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (REGULATORY_CATEGORIES.includes(value as FrontOfPackRegulatoryCategory)) {
    return value as FrontOfPackRegulatoryCategory;
  }
  throw new RecipeValidationError("invalid-regulatory-category");
}

export function validatePackagingCondition(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (PACKAGING_CONDITIONS.includes(value as FrontOfPackPackagingCondition)) {
    return value as FrontOfPackPackagingCondition;
  }
  throw new RecipeValidationError("invalid-packaging-condition");
}

export function validateNutrientAdditionStatus(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (NUTRIENT_ADDITION_STATUSES.includes(value as FrontOfPackNutrientAdditionStatus)) {
    return value as FrontOfPackNutrientAdditionStatus;
  }
  throw new RecipeValidationError("invalid-nutrient-addition-status");
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
  if (input.yieldMode === "UNITS") {
    const unitsProduced = parseOptionalPositiveInteger(input.unitsProduced, "invalid-units-produced");
    const unitWeight = parseOptionalPositiveDecimal(input.unitWeight, "invalid-unit-weight");
    if (unitsProduced === null) throw new RecipeValidationError("invalid-units-produced");
    if (unitWeight === null) throw new RecipeValidationError("invalid-unit-weight");
    const finalYieldAmount = unitsProduced * unitWeight;
    if (!Number.isFinite(finalYieldAmount)) throw new RecipeValidationError("invalid-final-yield");
    return { finalYieldAmount, unitsProduced, unitWeight };
  }
  if (input.yieldMode === "BULK") {
    const finalYieldAmount = parseOptionalPositiveDecimal(input.finalYieldAmount, "invalid-final-yield");
    if (finalYieldAmount === null) throw new RecipeValidationError("invalid-final-yield");
    return { finalYieldAmount, unitsProduced: null, unitWeight: null };
  }
  if (input.yieldMode) throw new RecipeValidationError("inconsistent-yield");
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
    regulatoryCategory: validateRegulatoryCategory(input.regulatoryCategory) ?? null,
    physicalState,
    ...resolvedYield,
    finalYieldUnit: validateYieldUnit(physicalState, input.finalYieldUnit)
  };
}

export function validateRecipeInformationInput(input: RecipeInformationInput) {
  if (input.reviewed !== true && input.reviewed !== "on") {
    throw new RecipeValidationError("missing-review-confirmation");
  }

  const regulatoryCategory = validateRegulatoryCategory(input.regulatoryCategory);
  if (!regulatoryCategory) {
    throw new RecipeValidationError("invalid-regulatory-category");
  }

  const packagingCondition = validatePackagingCondition(input.packagingCondition);
  if (!packagingCondition) {
    throw new RecipeValidationError("invalid-packaging-condition");
  }

  const conditionalCategory = CONDITIONAL_REGULATORY_CATEGORIES.includes(regulatoryCategory);
  const addedSugarsAddition = validateNutrientAdditionStatus(input.addedSugarsAddition);
  const saturatedFatAddition = validateNutrientAdditionStatus(input.saturatedFatAddition);
  const sodiumAddition = validateNutrientAdditionStatus(input.sodiumAddition);

  if (
    conditionalCategory &&
    (!addedSugarsAddition || !saturatedFatAddition || !sodiumAddition)
  ) {
    throw new RecipeValidationError("invalid-nutrient-addition-status");
  }

  let mainPanelWidthCm: number | null = null;
  let mainPanelHeightCm: number | null = null;
  if (packagingCondition === "PACKAGED_IN_ABSENCE_OF_CONSUMER") {
    mainPanelWidthCm = parseOptionalPositiveDecimal(input.mainPanelWidthCm, "invalid-main-panel-dimensions");
    mainPanelHeightCm = parseOptionalPositiveDecimal(input.mainPanelHeightCm, "invalid-main-panel-dimensions");
    if (
      mainPanelWidthCm === null ||
      mainPanelHeightCm === null ||
      calculateMainPanelAreaCm2(mainPanelWidthCm, mainPanelHeightCm) === null
    ) {
      throw new RecipeValidationError("invalid-main-panel-dimensions");
    }
  }

  const confirmedAllergens = normalizeTextList([
    ...normalizeFormList(input.confirmedAllergens),
    input.additionalAllergens
  ]);
  const crossContaminationRisk = validateCrossContaminationRisk(input.crossContaminationRisk);

  return {
    regulatoryCategory,
    packagingCondition,
    mainPanelWidthCm,
    mainPanelHeightCm,
    addedSugarsAddition: conditionalCategory ? addedSugarsAddition : null,
    saturatedFatAddition: conditionalCategory ? saturatedFatAddition : null,
    sodiumAddition: conditionalCategory ? sodiumAddition : null,
    confirmedAllergens,
    glutenStatus: validateDisclosureStatus(input.glutenStatus),
    lactoseStatus: validateDisclosureStatus(input.lactoseStatus),
    crossContaminationRisk,
    crossContaminationAllergens:
      crossContaminationRisk === "YES" ? normalizeTextList([input.crossContaminationAllergens]) : [],
    informationReviewedAt: new Date()
  };
}

export function calculateServingsPerPackage(netQuantity: number, servingSize: number) {
  const value = netQuantity / servingSize;
  const isIndividualPackage = value <= 2;
  const roundedForDisplay = Math.round(value);

  return {
    value,
    isIndividualPackage,
    roundedForDisplay,
    isInteger: Number.isInteger(value)
  };
}

export function formatServingsPerPackageLabel(input: { value: number; isIndividualPackage: boolean }) {
  if (input.isIndividualPackage) return null;

  return Number.isInteger(input.value) ? String(input.value) : "Cerca de " + Math.round(input.value);
}

export function validateRecipePackagingInput(input: RecipePackagingInput, physicalState: RecipePhysicalState) {
  const netQuantity = parsePositiveDecimal(input.netQuantity, "invalid-net-quantity");
  const servingSize = parsePositiveDecimal(input.servingSize, "invalid-serving-size");
  const householdMeasure = input.householdMeasure.trim();
  const netQuantityUnit = validateYieldUnit(physicalState, input.netQuantityUnit);
  const servingUnit = validateYieldUnit(physicalState, input.servingUnit);
  const servings = calculateServingsPerPackage(netQuantity, servingSize);

  if (servingSize > netQuantity) {
    throw new RecipeValidationError("invalid-serving-size");
  }

  if (servings.isIndividualPackage) {
    return {
      netQuantity,
      netQuantityUnit,
      servingSize: netQuantity,
      servingUnit: netQuantityUnit,
      householdMeasure: "1 embalagem",
      servingsPerPackage: 1,
      isIndividualPackage: true
    };
  }

  if (!householdMeasure) {
    throw new RecipeValidationError("invalid-household-measure");
  }

  return {
    netQuantity,
    netQuantityUnit,
    servingSize,
    servingUnit,
    householdMeasure,
    servingsPerPackage: servings.value,
    isIndividualPackage: false
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

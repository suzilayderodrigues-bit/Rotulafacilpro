import type { NutritionNutrientField } from "@/lib/nutrition";
import type { DailyValueUnit } from "./daily-values";
import {
  findDeclarationRoundingRange,
  findNutrientDeclarationRule,
  type NutrientDeclarationRule
} from "./declaration-rules";
import type { RegulatoryNutrientResult, RegulatoryNutritionResult } from "./nutrition-per-serving";
import type { RegulatoryServingVersion } from "./serving-rules-types";

export type NonSignificantQualifications = Partial<Record<NutritionNutrientField, boolean>>;

export type DeclaredNutritionValue = {
  rawValue: number | null;
  declaredNumericValue: number | null;
  displayValue: string | null;
  nonSignificantApplied: boolean;
  requiresNonSignificantReview: boolean;
};

export type DeclaredDailyValuePercent = {
  rawValue: number | null;
  declaredNumericValue: number | null;
  displayValue: string | null;
};

export type DeclaredNutrientResult = {
  nutrient: NutritionNutrientField;
  unit: DailyValueUnit;
  per100: DeclaredNutritionValue;
  perServing: DeclaredNutritionValue;
  dailyValuePercent: DeclaredDailyValuePercent;
  hasEstablishedDailyValue: boolean;
  isComplete: boolean;
  declarationRule: {
    regulatoryVersion: RegulatoryServingVersion;
    sourceReference: string;
    nonSignificantSourceReference: string | null;
  };
};

export type NutritionDeclarationResult = {
  basis: RegulatoryNutritionResult["basis"];
  servingSize: number | null;
  servingUnit: RegulatoryNutritionResult["servingUnit"];
  nutrients: Record<NutritionNutrientField, DeclaredNutrientResult>;
};

function roundHalfUp(value: number, decimalPlaces: number) {
  const factor = 10 ** decimalPlaces;
  return Math.floor(value * factor + 0.5 + Number.EPSILON * factor) / factor;
}

function formatDecimal(value: number, decimalPlaces: number): string | null {
  if (decimalPlaces === 0) return value.toFixed(0);

  const fixed = value.toFixed(decimalPlaces);
  const minimumDecimalPlaces = decimalPlaces === 2 ? 1 : 0;
  const [integer, decimal = ""] = fixed.split(".");
  if (integer === undefined) return null;

  const trimmed = decimal.replace(/0+$/, "");

  if (!trimmed && minimumDecimalPlaces === 0) return integer;

  return `${integer},${trimmed.padEnd(minimumDecimalPlaces, "0")}`;
}

function decimalPlacesFor(rule: NutrientDeclarationRule, rawValue: number) {
  if (rule.roundingClass === "ENERGY") return 0;

  const unit = rule.roundingClass === "GRAM" ? "g" : "mg";
  const range = findDeclarationRoundingRange(unit, rawValue);
  if (!range) throw new Error(`Faixa de arredondamento ausente para ${rule.nutrient}.`);

  return range.decimalPlaces;
}

export function formatDeclaredNutrientValue(
  nutrient: NutritionNutrientField,
  rawValue: number | null,
  nonSignificantQualified?: boolean
): DeclaredNutritionValue {
  if (rawValue === null) {
    return {
      rawValue: null,
      declaredNumericValue: null,
      displayValue: null,
      nonSignificantApplied: false,
      requiresNonSignificantReview: false
    };
  }

  if (!Number.isFinite(rawValue) || rawValue < 0) throw new Error(`${nutrient}: valor nutricional inválido.`);

  const rule = findNutrientDeclarationRule(nutrient);
  if (!rule) throw new Error(`${nutrient}: regra de declaração ausente.`);

  if (rawValue === 0) {
    return {
      rawValue,
      declaredNumericValue: 0,
      displayValue: "0",
      nonSignificantApplied: false,
      requiresNonSignificantReview: false
    };
  }

  const isWithinNonSignificantThreshold =
    rule.nonSignificantThreshold !== null && rawValue <= rule.nonSignificantThreshold;

  if (nonSignificantQualified === true && isWithinNonSignificantThreshold) {
    return {
      rawValue,
      declaredNumericValue: 0,
      displayValue: "0",
      nonSignificantApplied: true,
      requiresNonSignificantReview: false
    };
  }

  const decimalPlaces = decimalPlacesFor(rule, rawValue);
  const declaredNumericValue = roundHalfUp(rawValue, decimalPlaces);
  const requiresNonSignificantReview =
    nonSignificantQualified === undefined && isWithinNonSignificantThreshold;

  if (declaredNumericValue === 0 && requiresNonSignificantReview) {
    return {
      rawValue,
      declaredNumericValue: null,
      displayValue: null,
      nonSignificantApplied: false,
      requiresNonSignificantReview: true
    };
  }

  return {
    rawValue,
    declaredNumericValue,
    displayValue: formatDecimal(declaredNumericValue, decimalPlaces),
    nonSignificantApplied: false,
    requiresNonSignificantReview
  };
}

function bothValuesQualifyAsNonSignificant(
  nutrient: RegulatoryNutrientResult,
  rule: NutrientDeclarationRule,
  qualification: boolean | undefined
) {
  if (qualification !== true || rule.nonSignificantThreshold === null) return qualification;
  if (nutrient.per100 === null || nutrient.perServing === null) return false;

  return nutrient.per100 <= rule.nonSignificantThreshold && nutrient.perServing <= rule.nonSignificantThreshold;
}

function declaredDailyValuePercent(
  nutrient: RegulatoryNutrientResult,
  declaredPerServing: DeclaredNutritionValue
): DeclaredDailyValuePercent {
  if (
    !nutrient.hasEstablishedDailyValue ||
    nutrient.dailyValuePercent === null ||
    nutrient.dailyValue === null ||
    declaredPerServing.declaredNumericValue === null
  ) {
    return {
      rawValue: nutrient.dailyValuePercent,
      declaredNumericValue: null,
      displayValue: null
    };
  }

  const percentFromDeclaredServing = (declaredPerServing.declaredNumericValue / nutrient.dailyValue) * 100;
  const declaredNumericValue = roundHalfUp(percentFromDeclaredServing, 0);

  return {
    rawValue: nutrient.dailyValuePercent,
    declaredNumericValue,
    displayValue: declaredNumericValue.toFixed(0)
  };
}

export function formatNutritionForDeclaration(
  nutrition: RegulatoryNutritionResult,
  nonSignificantQualifications: NonSignificantQualifications = {}
): NutritionDeclarationResult {
  const nutrients = Object.fromEntries(
    Object.entries(nutrition.nutrients).map(([field, nutrient]) => {
      const nutrientField = field as NutritionNutrientField;
      const rule = findNutrientDeclarationRule(nutrientField);
      if (!rule) throw new Error(`${nutrientField}: regra de declaração ausente.`);

      const qualification = bothValuesQualifyAsNonSignificant(
        nutrient,
        rule,
        nonSignificantQualifications[nutrientField]
      );
      const per100 = formatDeclaredNutrientValue(nutrientField, nutrient.per100, qualification);
      const perServing = formatDeclaredNutrientValue(nutrientField, nutrient.perServing, qualification);

      return [
        nutrientField,
        {
          nutrient: nutrientField,
          unit: nutrient.unit,
          per100,
          perServing,
          dailyValuePercent: declaredDailyValuePercent(nutrient, perServing),
          hasEstablishedDailyValue: nutrient.hasEstablishedDailyValue,
          isComplete: nutrient.isComplete,
          declarationRule: {
            regulatoryVersion: rule.regulatoryVersion,
            sourceReference: rule.sourceReference,
            nonSignificantSourceReference: rule.nonSignificantSourceReference
          }
        }
      ];
    })
  ) as Record<NutritionNutrientField, DeclaredNutrientResult>;

  return {
    basis: nutrition.basis,
    servingSize: nutrition.servingSize,
    servingUnit: nutrition.servingUnit,
    nutrients
  };
}

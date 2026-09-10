import {
  nutritionNutrientFields,
  type NumericLike,
  type NutritionCalculationResult,
  type NutritionNutrientField,
  type NutritionUnit
} from "@/lib/nutrition";
import { findDailyValueRule, nutrientUnits, type DailyValueUnit } from "./daily-values";
import type { RegulatoryServingVersion } from "./serving-rules-types";

export type RegulatoryNutrientResult = {
  nutrient: NutritionNutrientField;
  unit: DailyValueUnit;
  per100: number | null;
  perServing: number | null;
  dailyValue: number | null;
  dailyValuePercent: number | null;
  hasEstablishedDailyValue: boolean;
  isComplete: boolean;
  dailyValueRule: {
    regulatoryVersion: RegulatoryServingVersion;
    sourceReference: string;
  } | null;
};

export type RegulatoryNutritionResult = {
  basis: NutritionCalculationResult["basis"];
  servingSize: number | null;
  servingUnit: NutritionUnit;
  nutrients: Record<NutritionNutrientField, RegulatoryNutrientResult>;
};

export type RegulatoryNutritionErrorCode = "invalid-serving-size" | "incompatible-serving-unit";

export class RegulatoryNutritionError extends Error {
  constructor(public readonly code: RegulatoryNutritionErrorCode) {
    super(code);
  }
}

function parseServingSize(value: NumericLike) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = typeof value === "number" ? value : Number(value.toString().replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) throw new RegulatoryNutritionError("invalid-serving-size");

  return parsed;
}

function expectedServingUnit(basis: NutritionCalculationResult["basis"]): NutritionUnit {
  return basis === "100ml" ? "MILLILITER" : "GRAM";
}

export function calculateNutritionPerServing(
  nutrition: NutritionCalculationResult,
  servingSizeInput: NumericLike,
  servingUnit: NutritionUnit
): RegulatoryNutritionResult {
  const servingSize = parseServingSize(servingSizeInput);

  if (servingUnit !== expectedServingUnit(nutrition.basis)) {
    throw new RegulatoryNutritionError("incompatible-serving-unit");
  }

  const nutrients = nutritionNutrientFields.reduce<Record<NutritionNutrientField, RegulatoryNutrientResult>>(
    (acc, nutrient) => {
      const rawNutrient = nutrition.nutrients[nutrient];
      const per100 = rawNutrient.isComplete ? rawNutrient.per100 : null;
      const perServing = per100 === null || servingSize === null ? null : (per100 * servingSize) / 100;
      const dailyValueRule = findDailyValueRule(nutrient);
      const dailyValue = dailyValueRule?.dailyValue ?? null;

      acc[nutrient] = {
        nutrient,
        unit: nutrientUnits[nutrient],
        per100,
        perServing,
        dailyValue,
        dailyValuePercent: perServing === null || dailyValue === null ? null : (perServing / dailyValue) * 100,
        hasEstablishedDailyValue: Boolean(dailyValueRule),
        isComplete: rawNutrient.isComplete,
        dailyValueRule: dailyValueRule
          ? {
              regulatoryVersion: dailyValueRule.regulatoryVersion,
              sourceReference: dailyValueRule.sourceReference
            }
          : null
      };

      return acc;
    },
    {} as Record<NutritionNutrientField, RegulatoryNutrientResult>
  );

  return {
    basis: nutrition.basis,
    servingSize,
    servingUnit,
    nutrients
  };
}

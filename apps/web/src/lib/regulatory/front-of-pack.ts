import type {
  NutritionCalculationResult,
  NutritionNutrientField
} from "@/lib/nutrition";
import {
  regulatoryServingVersion,
  type RegulatoryServingVersion
} from "./serving-rules-types";

export const frontOfPackSourceReference =
  "RDC 429/2020, arts. 18, 19 e 21; IN 75/2020, Anexos XV, XVII e XVIII";

export const frontOfPackNutrients = [
  "addedSugars",
  "saturatedFat",
  "sodium"
] as const;

export type FrontOfPackNutrient = (typeof frontOfPackNutrients)[number];
export type FrontOfPackStatus = "HIGH" | "NOT_HIGH" | "UNKNOWN";

type FrontOfPackRule = {
  nutrient: FrontOfPackNutrient;
  nutrientField: NutritionNutrientField;
  label: string;
  unit: "g" | "mg";
  solidThreshold: number;
  liquidThreshold: number;
  regulatoryVersion: RegulatoryServingVersion;
  sourceReference: string;
};

export type FrontOfPackNutrientEvaluation = {
  nutrient: FrontOfPackNutrient;
  label: string;
  unit: "g" | "mg";
  rawValue: number | null;
  threshold: number;
  status: FrontOfPackStatus;
};

export type FrontOfPackEvaluation = {
  basis: NutritionCalculationResult["basis"];
  regulatoryVersion: RegulatoryServingVersion;
  sourceReference: string;
  nutrients: Record<FrontOfPackNutrient, FrontOfPackNutrientEvaluation>;
  highIn: FrontOfPackNutrientEvaluation[];
  hasAnyHighIn: boolean;
  hasUnknownData: boolean;
};

export const frontOfPackRules: readonly FrontOfPackRule[] = [
  {
    nutrient: "addedSugars",
    nutrientField: "addedSugarsG",
    label: "AÇÚCAR ADICIONADO",
    unit: "g",
    solidThreshold: 15,
    liquidThreshold: 7.5,
    regulatoryVersion: regulatoryServingVersion,
    sourceReference: frontOfPackSourceReference
  },
  {
    nutrient: "saturatedFat",
    nutrientField: "saturatedFatG",
    label: "GORDURA SATURADA",
    unit: "g",
    solidThreshold: 6,
    liquidThreshold: 3,
    regulatoryVersion: regulatoryServingVersion,
    sourceReference: frontOfPackSourceReference
  },
  {
    nutrient: "sodium",
    nutrientField: "sodiumMg",
    label: "SÓDIO",
    unit: "mg",
    solidThreshold: 600,
    liquidThreshold: 300,
    regulatoryVersion: regulatoryServingVersion,
    sourceReference: frontOfPackSourceReference
  }
] as const;

function evaluateRule(
  result: NutritionCalculationResult,
  rule: FrontOfPackRule
): FrontOfPackNutrientEvaluation {
  const nutrient = result.nutrients[rule.nutrientField];
  const threshold = result.basis === "100ml" ? rule.liquidThreshold : rule.solidThreshold;
  const rawValue = nutrient.isComplete ? nutrient.per100 : null;

  return {
    nutrient: rule.nutrient,
    label: rule.label,
    unit: rule.unit,
    rawValue,
    threshold,
    status: rawValue === null ? "UNKNOWN" : rawValue >= threshold ? "HIGH" : "NOT_HIGH"
  };
}

export function evaluateFrontOfPack(
  result: NutritionCalculationResult
): FrontOfPackEvaluation {
  const evaluations = frontOfPackRules.map((rule) => evaluateRule(result, rule));
  const nutrients = Object.fromEntries(
    evaluations.map((evaluation) => [evaluation.nutrient, evaluation])
  ) as Record<FrontOfPackNutrient, FrontOfPackNutrientEvaluation>;
  const highIn = evaluations.filter((evaluation) => evaluation.status === "HIGH");

  return {
    basis: result.basis,
    regulatoryVersion: regulatoryServingVersion,
    sourceReference: frontOfPackSourceReference,
    nutrients,
    highIn,
    hasAnyHighIn: highIn.length > 0,
    hasUnknownData: evaluations.some((evaluation) => evaluation.status === "UNKNOWN")
  };
}

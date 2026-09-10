import type { IngredientBaseUnit, RecipePhysicalState } from "@rotula-facil-pro/db";

export const regulatoryServingVersion = "BR-RDC429-IN75-v1" as const;

export type RegulatoryServingVersion = typeof regulatoryServingVersion;

export type RegulatoryServingRule = {
  regulatoryVersion: RegulatoryServingVersion;
  categoryCode: string;
  categoryName: string;
  aliases: string[];
  physicalState: RecipePhysicalState;
  servingSize: number;
  servingUnit: IngredientBaseUnit;
  householdMeasure: string;
  notes?: string;
  sourceReference: string;
};

export type ServingSuggestion =
  | {
      matched: true;
      categoryCode: string;
      categoryName: string;
      servingSize: number;
      servingUnit: IngredientBaseUnit;
      householdMeasure: string;
      regulatoryVersion: RegulatoryServingVersion;
      sourceReference: string;
      notes?: string;
    }
  | {
      matched: false;
      regulatoryVersion: RegulatoryServingVersion;
      reason: "no-category" | "no-rule" | "incompatible-unit";
    };

export const regulatoryServingRules: RegulatoryServingRule[] = [];

function normalizeCategory(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function unitForPhysicalState(physicalState: RecipePhysicalState): IngredientBaseUnit {
  return physicalState === "LIQUID" ? "MILLILITER" : "GRAM";
}

export function resolveServingSuggestion(
  category: string | null | undefined,
  physicalState: RecipePhysicalState,
  rules: RegulatoryServingRule[] = regulatoryServingRules
): ServingSuggestion {
  const normalizedCategory = normalizeCategory(category ?? "");

  if (!normalizedCategory) {
    return {
      matched: false,
      regulatoryVersion: regulatoryServingVersion,
      reason: "no-category"
    };
  }

  const rule = rules.find((item) => {
    const names = [item.categoryName, item.categoryCode, ...item.aliases];
    return names.some((name) => normalizeCategory(name) === normalizedCategory);
  });

  if (!rule) {
    return {
      matched: false,
      regulatoryVersion: regulatoryServingVersion,
      reason: "no-rule"
    };
  }

  if (rule.physicalState !== physicalState || rule.servingUnit !== unitForPhysicalState(physicalState)) {
    return {
      matched: false,
      regulatoryVersion: regulatoryServingVersion,
      reason: "incompatible-unit"
    };
  }

  return {
    matched: true,
    categoryCode: rule.categoryCode,
    categoryName: rule.categoryName,
    servingSize: rule.servingSize,
    servingUnit: rule.servingUnit,
    householdMeasure: rule.householdMeasure,
    regulatoryVersion: rule.regulatoryVersion,
    sourceReference: rule.sourceReference,
    notes: rule.notes
  };
}

export function getServingSuggestion(category: string | null | undefined, physicalState: RecipePhysicalState) {
  return resolveServingSuggestion(category, physicalState);
}

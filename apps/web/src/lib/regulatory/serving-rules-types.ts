import type { IngredientBaseUnit, RecipePhysicalState } from "@rotula-facil-pro/db";

export const regulatoryServingVersion = "BR-RDC429-IN75-v1" as const;

export type RegulatoryServingVersion = typeof regulatoryServingVersion;
export type RegulatoryServingMode = "FIXED" | "PREPARATION_BASED" | "ALTERNATIVE" | "SPECIAL";
export type RegulatoryPreparedReferenceUnit = IngredientBaseUnit | "TABLESPOON";

type RegulatoryServingRuleBase = {
  regulatoryVersion: RegulatoryServingVersion;
  groupCode: string;
  groupName: string;
  categoryCode: string;
  categoryName: string;
  aliases: string[];
  householdMeasureSuggestion: string;
  sourceReference: string;
  notes?: string;
};

export type FixedRegulatoryServingRule = RegulatoryServingRuleBase & {
  servingMode: "FIXED";
  physicalState: RecipePhysicalState;
  servingSize: number;
  servingUnit: IngredientBaseUnit;
};

export type PreparationBasedRegulatoryServingRule = RegulatoryServingRuleBase & {
  servingMode: "PREPARATION_BASED";
  servingText: string;
  preparedReferenceQuantity: number;
  preparedReferenceUnit: RegulatoryPreparedReferenceUnit;
};

export type AlternativeRegulatoryServingRule = RegulatoryServingRuleBase & {
  servingMode: "ALTERNATIVE";
  servingText: string;
  alternatives: Array<{
    servingSize: number;
    servingUnit: IngredientBaseUnit;
  }>;
};

export type SpecialRegulatoryServingRule = RegulatoryServingRuleBase & {
  servingMode: "SPECIAL";
  servingText: string;
};

export type RegulatoryServingRule =
  | FixedRegulatoryServingRule
  | PreparationBasedRegulatoryServingRule
  | AlternativeRegulatoryServingRule
  | SpecialRegulatoryServingRule;

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
      reason: "no-category" | "no-rule" | "incompatible-unit" | "non-fixed-rule";
    };

export type RegulatoryServingValidationSummary = {
  ruleCount: number;
  groupCount: number;
  fixedRuleCount: number;
  preparationBasedRuleCount: number;
  alternativeRuleCount: number;
  specialRuleCount: number;
};

import type { RecipePhysicalState } from "@rotula-facil-pro/db";
import { regulatoryServingRules } from "./serving-rules-data";
import {
  regulatoryServingVersion,
  type RegulatoryServingRule,
  type RegulatoryServingValidationSummary,
  type ServingSuggestion
} from "./serving-rules-types";

function normalizeCategory(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function unitForPhysicalState(physicalState: RecipePhysicalState) {
  return physicalState === "LIQUID" ? "MILLILITER" : "GRAM";
}

export function findServingRule(
  category: string | null | undefined,
  rules: RegulatoryServingRule[] = regulatoryServingRules
) {
  const normalizedCategory = normalizeCategory(category ?? "");
  if (!normalizedCategory) return undefined;

  return rules.find((rule) => {
    const names = [rule.categoryName, rule.categoryCode, ...rule.aliases];
    return names.some((name) => normalizeCategory(name) === normalizedCategory);
  });
}

export function resolveServingSuggestion(
  category: string | null | undefined,
  physicalState: RecipePhysicalState,
  rules: RegulatoryServingRule[] = regulatoryServingRules
): ServingSuggestion {
  if (!normalizeCategory(category ?? "")) {
    return {
      matched: false,
      regulatoryVersion: regulatoryServingVersion,
      reason: "no-category"
    };
  }

  const rule = findServingRule(category, rules);

  if (!rule) {
    return {
      matched: false,
      regulatoryVersion: regulatoryServingVersion,
      reason: "no-rule"
    };
  }

  if (rule.servingMode !== "FIXED") {
    return {
      matched: false,
      regulatoryVersion: regulatoryServingVersion,
      reason: "non-fixed-rule"
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
    householdMeasure: rule.householdMeasureSuggestion,
    regulatoryVersion: rule.regulatoryVersion,
    sourceReference: rule.sourceReference,
    notes: rule.notes
  };
}

export function getServingSuggestion(category: string | null | undefined, physicalState: RecipePhysicalState) {
  return resolveServingSuggestion(category, physicalState);
}

export function validateRegulatoryServingRules(
  rules: RegulatoryServingRule[] = regulatoryServingRules
): RegulatoryServingValidationSummary {
  const errors: string[] = [];
  const categoryCodes = new Set<string>();
  const groups = new Set<string>();

  for (const rule of rules) {
    if (categoryCodes.has(rule.categoryCode)) errors.push(`categoryCode duplicado: ${rule.categoryCode}`);
    categoryCodes.add(rule.categoryCode);
    groups.add(rule.groupCode);

    if (!rule.regulatoryVersion.trim()) errors.push(`${rule.categoryCode}: regulatoryVersion ausente`);
    if (!rule.sourceReference.trim()) errors.push(`${rule.categoryCode}: sourceReference ausente`);
    if (!rule.groupName.trim()) errors.push(`${rule.categoryCode}: groupName vazio`);
    if (!rule.categoryName.trim()) errors.push(`${rule.categoryCode}: categoryName vazio`);
    if (!rule.householdMeasureSuggestion.trim()) errors.push(`${rule.categoryCode}: medida caseira sugerida vazia`);

    if (rule.servingMode === "FIXED") {
      if (!Number.isFinite(rule.servingSize) || rule.servingSize <= 0) {
        errors.push(`${rule.categoryCode}: servingSize inválido`);
      }
      if (!rule.servingUnit) errors.push(`${rule.categoryCode}: servingUnit ausente`);
      if (rule.servingUnit !== unitForPhysicalState(rule.physicalState)) {
        errors.push(`${rule.categoryCode}: unidade incompatível com o estado físico`);
      }
    }

    if (rule.servingMode === "PREPARATION_BASED") {
      if (!Number.isFinite(rule.preparedReferenceQuantity) || rule.preparedReferenceQuantity <= 0) {
        errors.push(`${rule.categoryCode}: referência de preparo inválida`);
      }
      if (!rule.preparedReferenceUnit) errors.push(`${rule.categoryCode}: unidade da referência de preparo ausente`);
      if (!rule.servingText.trim()) errors.push(`${rule.categoryCode}: regra de preparo sem texto oficial`);
      if ("servingSize" in rule) errors.push(`${rule.categoryCode}: regra de preparo não pode inventar servingSize`);
    }

    if (rule.servingMode === "ALTERNATIVE") {
      if (!rule.servingText.trim() || rule.alternatives.length < 2) {
        errors.push(`${rule.categoryCode}: alternativas incompletas`);
      }
      for (const option of rule.alternatives) {
        if (!Number.isFinite(option.servingSize) || option.servingSize <= 0 || !option.servingUnit) {
          errors.push(`${rule.categoryCode}: alternativa inválida`);
        }
      }
    }

    if (rule.servingMode === "SPECIAL" && !rule.servingText.trim()) {
      errors.push(`${rule.categoryCode}: exceção textual vazia`);
    }
  }

  if (errors.length) {
    throw new Error(`Dataset regulatório inválido:\n${errors.join("\n")}`);
  }

  return {
    ruleCount: rules.length,
    groupCount: groups.size,
    fixedRuleCount: rules.filter((rule) => rule.servingMode === "FIXED").length,
    preparationBasedRuleCount: rules.filter((rule) => rule.servingMode === "PREPARATION_BASED").length,
    alternativeRuleCount: rules.filter((rule) => rule.servingMode === "ALTERNATIVE").length,
    specialRuleCount: rules.filter((rule) => rule.servingMode === "SPECIAL").length
  };
}

export { regulatoryServingRules, regulatoryServingVersion };
export type {
  RegulatoryPreparedReferenceUnit,
  RegulatoryServingMode,
  RegulatoryServingRule,
  RegulatoryServingValidationSummary,
  RegulatoryServingVersion,
  ServingSuggestion
} from "./serving-rules-types";

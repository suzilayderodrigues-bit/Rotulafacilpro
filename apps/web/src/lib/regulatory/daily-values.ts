import type { NutritionNutrientField } from "@/lib/nutrition";
import { regulatoryServingVersion, type RegulatoryServingVersion } from "./serving-rules-types";

export type DailyValueUnit = "kcal" | "g" | "mg";

export type DailyValueRule = {
  nutrient: NutritionNutrientField;
  dailyValue: number;
  unit: DailyValueUnit;
  regulatoryVersion: RegulatoryServingVersion;
  sourceReference: string;
  notes?: string;
};

const dailyValueSource = "IN nº 75/2020, Anexo II — VDR para fins de rotulagem nutricional dos alimentos em geral";

export const nutrientUnits: Record<NutritionNutrientField, DailyValueUnit> = {
  caloriesKcal: "kcal",
  carbohydratesG: "g",
  proteinsG: "g",
  totalFatG: "g",
  saturatedFatG: "g",
  transFatG: "g",
  fiberG: "g",
  sodiumMg: "mg",
  sugarsG: "g",
  addedSugarsG: "g",
  calciumMg: "mg",
  ironMg: "mg"
};

export const dailyValueRules: DailyValueRule[] = [
  { nutrient: "caloriesKcal", dailyValue: 2000, unit: "kcal", regulatoryVersion: regulatoryServingVersion, sourceReference: dailyValueSource },
  { nutrient: "carbohydratesG", dailyValue: 300, unit: "g", regulatoryVersion: regulatoryServingVersion, sourceReference: dailyValueSource },
  { nutrient: "proteinsG", dailyValue: 50, unit: "g", regulatoryVersion: regulatoryServingVersion, sourceReference: dailyValueSource },
  { nutrient: "totalFatG", dailyValue: 65, unit: "g", regulatoryVersion: regulatoryServingVersion, sourceReference: dailyValueSource },
  { nutrient: "saturatedFatG", dailyValue: 20, unit: "g", regulatoryVersion: regulatoryServingVersion, sourceReference: dailyValueSource },
  { nutrient: "transFatG", dailyValue: 2, unit: "g", regulatoryVersion: regulatoryServingVersion, sourceReference: dailyValueSource },
  { nutrient: "fiberG", dailyValue: 25, unit: "g", regulatoryVersion: regulatoryServingVersion, sourceReference: dailyValueSource },
  { nutrient: "sodiumMg", dailyValue: 2000, unit: "mg", regulatoryVersion: regulatoryServingVersion, sourceReference: dailyValueSource },
  { nutrient: "addedSugarsG", dailyValue: 50, unit: "g", regulatoryVersion: regulatoryServingVersion, sourceReference: dailyValueSource },
  { nutrient: "calciumMg", dailyValue: 1000, unit: "mg", regulatoryVersion: regulatoryServingVersion, sourceReference: dailyValueSource },
  { nutrient: "ironMg", dailyValue: 14, unit: "mg", regulatoryVersion: regulatoryServingVersion, sourceReference: dailyValueSource }
];

export function findDailyValueRule(nutrient: NutritionNutrientField) {
  return dailyValueRules.find((rule) => rule.nutrient === nutrient);
}

export function validateDailyValueRules(rules: DailyValueRule[] = dailyValueRules) {
  const errors: string[] = [];
  const nutrients = new Set<NutritionNutrientField>();

  for (const rule of rules) {
    if (nutrients.has(rule.nutrient)) errors.push(`VD duplicado: ${rule.nutrient}`);
    nutrients.add(rule.nutrient);

    if (!Number.isFinite(rule.dailyValue) || rule.dailyValue <= 0) errors.push(`${rule.nutrient}: VD inválido`);
    if (rule.unit !== nutrientUnits[rule.nutrient]) errors.push(`${rule.nutrient}: unidade incompatível`);
    if (!rule.regulatoryVersion.trim()) errors.push(`${rule.nutrient}: regulatoryVersion ausente`);
    if (!rule.sourceReference.trim()) errors.push(`${rule.nutrient}: sourceReference ausente`);
  }

  if (errors.length) throw new Error(`Dataset de valores diários inválido:\n${errors.join("\n")}`);

  return { ruleCount: rules.length, nutrientsWithoutDailyValue: ["sugarsG"] satisfies NutritionNutrientField[] };
}

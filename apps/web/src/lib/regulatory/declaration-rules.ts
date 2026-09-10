import { nutritionNutrientFields, type NutritionNutrientField } from "@/lib/nutrition";
import { nutrientUnits, type DailyValueUnit } from "./daily-values";
import { regulatoryServingVersion, type RegulatoryServingVersion } from "./serving-rules-types";

export type DeclarationRoundingClass = "ENERGY" | "GRAM" | "MILLIGRAM";

export type DeclarationRoundingRange = {
  id: string;
  unit: "g" | "mg";
  minInclusive: number;
  maxExclusive: number | null;
  decimalPlaces: number;
  regulatoryVersion: RegulatoryServingVersion;
  sourceReference: string;
};

export type NutrientDeclarationRule = {
  nutrient: NutritionNutrientField;
  unit: DailyValueUnit;
  roundingClass: DeclarationRoundingClass;
  nonSignificantThreshold: number | null;
  requiresExplicitNonSignificantQualification: boolean;
  regulatoryVersion: RegulatoryServingVersion;
  sourceReference: string;
  nonSignificantSourceReference: string | null;
};

const roundingSource = "IN nº 75/2020 consolidada, Anexo III";
const nonSignificantSource = "RDC nº 429/2020, art. 7º, e IN nº 75/2020 consolidada, Anexo IV";

export const declarationRoundingRanges: DeclarationRoundingRange[] = [
  {
    id: "g-below-1",
    unit: "g",
    minInclusive: 0,
    maxExclusive: 1,
    decimalPlaces: 1,
    regulatoryVersion: regulatoryServingVersion,
    sourceReference: roundingSource
  },
  {
    id: "g-from-1-below-10",
    unit: "g",
    minInclusive: 1,
    maxExclusive: 10,
    decimalPlaces: 1,
    regulatoryVersion: regulatoryServingVersion,
    sourceReference: roundingSource
  },
  {
    id: "g-from-10",
    unit: "g",
    minInclusive: 10,
    maxExclusive: null,
    decimalPlaces: 0,
    regulatoryVersion: regulatoryServingVersion,
    sourceReference: roundingSource
  },
  {
    id: "mg-below-1",
    unit: "mg",
    minInclusive: 0,
    maxExclusive: 1,
    decimalPlaces: 2,
    regulatoryVersion: regulatoryServingVersion,
    sourceReference: roundingSource
  },
  {
    id: "mg-from-1-below-10",
    unit: "mg",
    minInclusive: 1,
    maxExclusive: 10,
    decimalPlaces: 1,
    regulatoryVersion: regulatoryServingVersion,
    sourceReference: roundingSource
  },
  {
    id: "mg-from-10",
    unit: "mg",
    minInclusive: 10,
    maxExclusive: null,
    decimalPlaces: 0,
    regulatoryVersion: regulatoryServingVersion,
    sourceReference: roundingSource
  }
];

const rule = (
  nutrient: NutritionNutrientField,
  roundingClass: DeclarationRoundingClass,
  nonSignificantThreshold: number | null
): NutrientDeclarationRule => ({
  nutrient,
  unit: nutrientUnits[nutrient],
  roundingClass,
  nonSignificantThreshold,
  requiresExplicitNonSignificantQualification: nonSignificantThreshold !== null,
  regulatoryVersion: regulatoryServingVersion,
  sourceReference: roundingSource,
  nonSignificantSourceReference: nonSignificantThreshold === null ? null : nonSignificantSource
});

export const nutrientDeclarationRules: NutrientDeclarationRule[] = [
  rule("caloriesKcal", "ENERGY", 4),
  rule("carbohydratesG", "GRAM", 0.5),
  rule("proteinsG", "GRAM", 0.5),
  rule("totalFatG", "GRAM", 0.5),
  rule("saturatedFatG", "GRAM", 0.1),
  rule("transFatG", "GRAM", 0.1),
  rule("fiberG", "GRAM", 0.5),
  rule("sodiumMg", "MILLIGRAM", 5),
  rule("sugarsG", "GRAM", 0.5),
  rule("addedSugarsG", "GRAM", null),
  rule("calciumMg", "MILLIGRAM", null),
  rule("ironMg", "MILLIGRAM", null)
];

export function findNutrientDeclarationRule(nutrient: NutritionNutrientField) {
  return nutrientDeclarationRules.find((candidate) => candidate.nutrient === nutrient);
}

export function findDeclarationRoundingRange(unit: "g" | "mg", value: number) {
  return declarationRoundingRanges.find(
    (range) => range.unit === unit && value >= range.minInclusive && (range.maxExclusive === null || value < range.maxExclusive)
  );
}

export function validateNutrientDeclarationRules(
  rules: NutrientDeclarationRule[] = nutrientDeclarationRules,
  ranges: DeclarationRoundingRange[] = declarationRoundingRanges
) {
  const errors: string[] = [];
  const nutrients = new Set<NutritionNutrientField>();

  for (const current of rules) {
    if (nutrients.has(current.nutrient)) errors.push(`Regra duplicada: ${current.nutrient}`);
    nutrients.add(current.nutrient);

    if (current.unit !== nutrientUnits[current.nutrient]) errors.push(`${current.nutrient}: unidade incompatível`);
    if (current.nonSignificantThreshold !== null && (!Number.isFinite(current.nonSignificantThreshold) || current.nonSignificantThreshold <= 0)) {
      errors.push(`${current.nutrient}: limite não significativo inválido`);
    }
    if (!current.regulatoryVersion.trim()) errors.push(`${current.nutrient}: regulatoryVersion ausente`);
    if (!current.sourceReference.trim()) errors.push(`${current.nutrient}: sourceReference ausente`);
    if (current.requiresExplicitNonSignificantQualification && !current.nonSignificantSourceReference?.trim()) {
      errors.push(`${current.nutrient}: referência de valor não significativo ausente`);
    }
  }

  for (const nutrient of nutritionNutrientFields) {
    if (!nutrients.has(nutrient)) errors.push(`Regra ausente: ${nutrient}`);
  }

  for (const unit of ["g", "mg"] as const) {
    const unitRanges = ranges.filter((range) => range.unit === unit).sort((a, b) => a.minInclusive - b.minInclusive);
    let expectedMinimum = 0;

    for (const range of unitRanges) {
      if (range.minInclusive !== expectedMinimum) errors.push(`${unit}: lacuna ou sobreposição antes de ${range.id}`);
      if (range.maxExclusive !== null && range.maxExclusive <= range.minInclusive) errors.push(`${range.id}: faixa inválida`);
      if (!Number.isInteger(range.decimalPlaces) || range.decimalPlaces < 0) errors.push(`${range.id}: casas decimais inválidas`);
      if (!range.regulatoryVersion.trim()) errors.push(`${range.id}: regulatoryVersion ausente`);
      if (!range.sourceReference.trim()) errors.push(`${range.id}: sourceReference ausente`);
      if (range.maxExclusive !== null) expectedMinimum = range.maxExclusive;
    }

    if (!unitRanges.length || unitRanges.at(-1)?.maxExclusive !== null) errors.push(`${unit}: faixa final aberta ausente`);
  }

  if (errors.length) throw new Error(`Regras de declaração nutricional inválidas:\n${errors.join("\n")}`);

  return {
    ruleCount: rules.length,
    rangeCount: ranges.length,
    regulatoryVersion: regulatoryServingVersion
  };
}

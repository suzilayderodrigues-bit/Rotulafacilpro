import type { NumericLike, NutritionNutrientField } from "@/lib/nutrition";
import type { DailyValueUnit } from "./daily-values";
import type { NutritionDeclarationResult } from "./nutrition-declaration";
import { regulatoryServingVersion, type RegulatoryServingVersion } from "./serving-rules-types";

export const nutritionTableSourceReference =
  "RDC nº 429/2020, arts. 5º, 10, 12, 15 e 16; IN nº 75/2020 consolidada, Anexos IX, XI e XII";
export const nutritionTableDailyValueFootnote = "*Percentual de valores diários fornecidos pela porção.";

export const mandatoryNutritionTableNutrients = [
  "caloriesKcal",
  "carbohydratesG",
  "sugarsG",
  "addedSugarsG",
  "proteinsG",
  "totalFatG",
  "saturatedFatG",
  "transFatG",
  "fiberG",
  "sodiumMg"
] as const satisfies readonly NutritionNutrientField[];

type MandatoryNutritionTableNutrient = (typeof mandatoryNutritionTableNutrients)[number];

type NutritionTableRowDefinition = {
  nutrient: MandatoryNutritionTableNutrient;
  label: string;
  indented: boolean;
};

const nutritionTableRowDefinitions: NutritionTableRowDefinition[] = [
  { nutrient: "caloriesKcal", label: "Valor energético", indented: false },
  { nutrient: "carbohydratesG", label: "Carboidratos", indented: false },
  { nutrient: "sugarsG", label: "Açúcares totais", indented: true },
  { nutrient: "addedSugarsG", label: "Açúcares adicionados", indented: true },
  { nutrient: "proteinsG", label: "Proteínas", indented: false },
  { nutrient: "totalFatG", label: "Gorduras totais", indented: false },
  { nutrient: "saturatedFatG", label: "Gorduras saturadas", indented: true },
  { nutrient: "transFatG", label: "Gorduras trans", indented: true },
  { nutrient: "fiberG", label: "Fibras alimentares", indented: false },
  { nutrient: "sodiumMg", label: "Sódio", indented: false }
];

export type NutritionTableStatus = "COMPLETE" | "INCOMPLETE";

export type NutritionTableRow = {
  nutrient: MandatoryNutritionTableNutrient;
  label: string;
  unit: DailyValueUnit;
  indented: boolean;
  per100Value: string | null;
  perServingValue: string | null;
  dailyValuePercent: string | null;
  hasEstablishedDailyValue: boolean;
};

export type NutritionTableViewModel = {
  status: NutritionTableStatus;
  statusMessage: string;
  missingNutrients: string[];
  configurationRequired: boolean;
  basisLabel: "100 g" | "100 ml";
  servingLabel: string | null;
  householdMeasure: string | null;
  servingsPerPackageLabel: string | null;
  isIndividualPackage: boolean;
  rows: NutritionTableRow[];
  dailyValueFootnote: string;
  regulatoryVersion: RegulatoryServingVersion;
  sourceReference: string;
};

export type NutritionTableRecipeMetadata = {
  householdMeasure: string | null;
  servingsPerPackage: NumericLike;
  isIndividualPackage: boolean;
};

function numericValue(value: NumericLike) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = typeof value === "number" ? value : Number(value.toString().replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function formatPersistedServingsPerPackage(value: NumericLike, isIndividualPackage: boolean) {
  if (isIndividualPackage) return null;

  const parsed = numericValue(value);
  if (parsed === null) return null;

  return Number.isInteger(parsed) ? String(parsed) : `Cerca de ${Math.round(parsed)}`;
}

function nutrientIsComplete(
  nutrient: NutritionDeclarationResult["nutrients"][NutritionNutrientField]
) {
  const dailyValueIsComplete =
    !nutrient.hasEstablishedDailyValue || nutrient.dailyValuePercent.declaredNumericValue !== null;

  return (
    nutrient.isComplete &&
    nutrient.per100.declaredNumericValue !== null &&
    nutrient.per100.displayValue !== null &&
    nutrient.perServing.declaredNumericValue !== null &&
    nutrient.perServing.displayValue !== null &&
    !nutrient.per100.requiresNonSignificantReview &&
    !nutrient.perServing.requiresNonSignificantReview &&
    dailyValueIsComplete
  );
}

export function evaluateNutritionTableStatus(declaration: NutritionDeclarationResult): NutritionTableStatus {
  if (declaration.servingSize === null) return "INCOMPLETE";

  return mandatoryNutritionTableNutrients.every((nutrient) => nutrientIsComplete(declaration.nutrients[nutrient]))
    ? "COMPLETE"
    : "INCOMPLETE";
}

export function buildNutritionTableViewModel(
  declaration: NutritionDeclarationResult,
  recipe: NutritionTableRecipeMetadata
): NutritionTableViewModel {
  const configurationRequired = declaration.servingSize === null;
  const status = evaluateNutritionTableStatus(declaration);
  const servingUnitLabel = declaration.servingUnit === "MILLILITER" ? "ml" : "g";
  const rows = nutritionTableRowDefinitions.map<NutritionTableRow>((definition) => {
    const nutrient = declaration.nutrients[definition.nutrient];

    return {
      nutrient: definition.nutrient,
      label: definition.label,
      unit: nutrient.unit,
      indented: definition.indented,
      per100Value: nutrient.per100.displayValue,
      perServingValue: nutrient.perServing.displayValue,
      dailyValuePercent: nutrient.hasEstablishedDailyValue
        ? nutrient.dailyValuePercent.displayValue
        : null,
      hasEstablishedDailyValue: nutrient.hasEstablishedDailyValue
    };
  });

  return {
    status,
    missingNutrients: configurationRequired
      ? []
      : nutritionTableRowDefinitions
          .filter((definition) => !nutrientIsComplete(declaration.nutrients[definition.nutrient]))
          .map((definition) => definition.label),
    statusMessage: configurationRequired
      ? "Defina a porção e os dados da embalagem para gerar a tabela nutricional."
      : status === "COMPLETE"
        ? "Dados nutricionais completos para gerar a tabela."
        : "Há dados nutricionais ausentes ou declarações que precisam de revisão regulatória. Confira as pendências de cada nutriente.",
    configurationRequired,
    basisLabel: declaration.basis === "100ml" ? "100 ml" : "100 g",
    servingLabel:
      declaration.servingSize === null
        ? null
        : `${formatNumber(declaration.servingSize)} ${servingUnitLabel}`,
    householdMeasure: recipe.householdMeasure?.trim() || null,
    servingsPerPackageLabel: formatPersistedServingsPerPackage(
      recipe.servingsPerPackage,
      recipe.isIndividualPackage
    ),
    isIndividualPackage: recipe.isIndividualPackage,
    rows,
    dailyValueFootnote: nutritionTableDailyValueFootnote,
    regulatoryVersion: regulatoryServingVersion,
    sourceReference: nutritionTableSourceReference
  };
}

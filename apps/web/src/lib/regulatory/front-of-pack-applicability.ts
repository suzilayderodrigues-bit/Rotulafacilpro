import type {
  FrontOfPackEvaluation,
  FrontOfPackNutrient,
  FrontOfPackNutrientEvaluation
} from "./front-of-pack";
import { frontOfPackNutrients } from "./front-of-pack";
import type {
  FrontOfPackNutrientAdditionStatus,
  FrontOfPackPackagingCondition,
  FrontOfPackRegulatoryCategory
} from "@rotula-facil-pro/db";
import {
  regulatoryServingVersion,
  type RegulatoryServingVersion
} from "./serving-rules-types";

export const frontOfPackApplicabilitySourceReference =
  "RDC 429/2020, art. 18, caput e §§ 1º a 3º, e art. 19; IN 75/2020, Anexo XVI";

export type FrontOfPackApplicabilityStatus =
  | "APPLICABLE"
  | "NOT_APPLICABLE"
  | "REQUIRES_REVIEW";

export type FrontOfPackLegalEffect =
  | "MANDATORY"
  | "OPTIONAL"
  | "PROHIBITED"
  | "OUTSIDE_SCOPE"
  | "UNDETERMINED";

export type { FrontOfPackPackagingCondition } from "@rotula-facil-pro/db";

export const frontOfPackPackagingConditionOptions: ReadonlyArray<{
  value: FrontOfPackPackagingCondition;
  label: string;
}> = [
  { value: "PACKAGED_IN_ABSENCE_OF_CONSUMER", label: "Já fica embalado antes da venda" },
  { value: "NOT_PACKAGED_IN_ABSENCE_OF_CONSUMER", label: "Vendo sem embalagem" },
  { value: "PACKED_AT_POINT_OF_SALE_AT_CONSUMER_REQUEST", label: "Embalo no ponto de venda quando o cliente pede" },
  { value: "PREPARED_OR_PORTIONED_AND_SOLD_ON_PREMISES", label: "Preparo ou separo as porções e vendo no próprio estabelecimento" }
];

export type { FrontOfPackRegulatoryCategory } from "@rotula-facil-pro/db";

export const frontOfPackRegulatoryCategoryOptions: ReadonlyArray<{
  value: FrontOfPackRegulatoryCategory;
  label: string;
}> = [
  { value: "OUTSIDE_ANNEX_XVI", label: "Outro alimento / nenhuma das opções abaixo" },
  { value: "PLAIN_PLANT_FOOD", label: "Alimento vegetal sem adição de ingredientes" },
  { value: "FLOUR", label: "Farinha" },
  { value: "MEAT_OR_FISH", label: "Carne ou pescado" },
  { value: "EGG", label: "Ovo" },
  { value: "FERMENTED_MILK", label: "Leite fermentado" },
  { value: "CHEESE", label: "Queijo" },
  { value: "MAMMAL_MILK", label: "Leite de mamíferos" },
  { value: "MILK_POWDER", label: "Leite em pó" },
  { value: "OLIVE_OR_OTHER_VEGETABLE_OIL", label: "Azeite ou outro óleo vegetal" },
  { value: "SALT", label: "Sal" },
  { value: "INFANT_FORMULA", label: "Fórmula infantil" },
  { value: "ENTERAL_FORMULA", label: "Fórmula para nutrição enteral" },
  { value: "WEIGHT_CONTROL_FOOD", label: "Alimento para controle de peso" },
  { value: "DIETARY_SUPPLEMENT", label: "Suplemento alimentar" },
  { value: "ALCOHOLIC_BEVERAGE", label: "Bebida alcoólica" },
  { value: "INDUSTRIAL_PROCESSING_ONLY", label: "Produto destinado exclusivamente ao processamento industrial" },
  { value: "FOOD_SERVICE_ONLY", label: "Produto destinado exclusivamente a serviços de alimentação" },
  { value: "FOOD_ADDITIVE_OR_PROCESSING_AID", label: "Aditivo alimentar ou coadjuvante de tecnologia" },
  { value: "DIETARY_FORMULA_FOR_INBORN_ERRORS", label: "Fórmula dietoterápica para erros inatos do metabolismo" }
];

export const primaryFrontOfPackRegulatoryCategoryOptions = [
  { value: "CHEESE", label: "Queijo" },
  { value: "FLOUR", label: "Farinha" },
  { value: "EGG", label: "Ovo" },
  { value: "MEAT_OR_FISH", label: "Carne ou pescado" },
  { value: "FERMENTED_MILK", label: "Leite fermentado" },
  { value: "PLAIN_PLANT_FOOD", label: "Alimento vegetal sem adição de ingredientes" },
  { value: "OUTSIDE_ANNEX_XVI", label: "Nenhuma dessas opções" }
] as const satisfies ReadonlyArray<{ value: FrontOfPackRegulatoryCategory; label: string }>;

const primaryCategoryValues = new Set<FrontOfPackRegulatoryCategory>(
  primaryFrontOfPackRegulatoryCategoryOptions.map(({ value }) => value)
);

export const specialFrontOfPackRegulatoryCategoryOptions =
  frontOfPackRegulatoryCategoryOptions.filter(({ value }) => !primaryCategoryValues.has(value));

export type FrontOfPackApplicabilityReasonCode =
  | "GENERAL_MANDATORY_RULE"
  | "OUTSIDE_PREPACKAGED_SCOPE"
  | "OPTIONAL_SMALL_MAIN_PANEL"
  | "OPTIONAL_POINT_OF_SALE_REQUEST"
  | "OPTIONAL_PREPARED_OR_PORTIONED_ON_PREMISES"
  | "ANNEX_XVI_PROHIBITED"
  | "ANNEX_XVI_CONDITIONAL_NO_ADDITION"
  | "ANNEX_XVI_CONDITIONAL_REVIEW"
  | "MISSING_REGULATORY_CATEGORY"
  | "UX_CATEGORY_REQUIRES_CLASSIFICATION"
  | "MISSING_PACKAGING_CONDITION"
  | "MISSING_MAIN_PANEL_AREA";

export type FrontOfPackApplicabilityInput = {
  foodCategory?: string | null;
  regulatoryCategory?: FrontOfPackRegulatoryCategory | null;
  packagingCondition?: FrontOfPackPackagingCondition | null;
  mainPanelAreaCm2?: number | null;
  addedSugarsAddition?: FrontOfPackNutrientAdditionStatus | null;
  saturatedFatAddition?: FrontOfPackNutrientAdditionStatus | null;
  sodiumAddition?: FrontOfPackNutrientAdditionStatus | null;
};

export type FrontOfPackApplicability = {
  regulatoryVersion: RegulatoryServingVersion;
  status: FrontOfPackApplicabilityStatus;
  legalEffect: FrontOfPackLegalEffect;
  reasonCode: FrontOfPackApplicabilityReasonCode;
  reason: string;
  sourceReference: string;
  requiredData: string[];
  evaluatedNutrients: readonly FrontOfPackNutrient[];
};

export type FinalFrontOfPackDecisionStatus =
  | "SHOW_WARNING"
  | "NO_WARNING"
  | "NOT_APPLICABLE"
  | "REQUIRES_REVIEW"
  | "INCOMPLETE_NUTRITION_DATA";

export type FinalFrontOfPackDecision = {
  regulatoryVersion: RegulatoryServingVersion;
  status: FinalFrontOfPackDecisionStatus;
  applicability: FrontOfPackApplicability;
  thresholdEvaluation: FrontOfPackEvaluation;
  technicalHighIn: FrontOfPackNutrientEvaluation[];
  finalHighIn: FrontOfPackNutrientEvaluation[];
  shouldDisplayOfficialWarning: boolean;
  hasUnknownData: boolean;
};

export const conditionalAnnexXviCategories: readonly FrontOfPackRegulatoryCategory[] = [
  "PLAIN_PLANT_FOOD",
  "FLOUR",
  "MEAT_OR_FISH",
  "EGG",
  "FERMENTED_MILK",
  "CHEESE"
] as const;

export const unconditionalAnnexXviCategories: readonly FrontOfPackRegulatoryCategory[] = [
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
] as const;

function result(
  status: FrontOfPackApplicabilityStatus,
  legalEffect: FrontOfPackLegalEffect,
  reasonCode: FrontOfPackApplicabilityReasonCode,
  reason: string,
  requiredData: string[] = [],
  evaluatedNutrients: readonly FrontOfPackNutrient[] = []
): FrontOfPackApplicability {
  return {
    regulatoryVersion: regulatoryServingVersion,
    status,
    legalEffect,
    reasonCode,
    reason,
    sourceReference: frontOfPackApplicabilitySourceReference,
    requiredData,
    evaluatedNutrients
  };
}

export function evaluateFrontOfPackApplicability(
  input: FrontOfPackApplicabilityInput
): FrontOfPackApplicability {
  if (input.packagingCondition === "NOT_PACKAGED_IN_ABSENCE_OF_CONSUMER") {
    return result(
      "NOT_APPLICABLE",
      "OUTSIDE_SCOPE",
      "OUTSIDE_PREPACKAGED_SCOPE",
      "Este produto está fora do escopo obrigatório da rotulagem nutricional frontal nesta condição."
    );
  }

  if (input.packagingCondition === "PACKED_AT_POINT_OF_SALE_AT_CONSUMER_REQUEST") {
    return result(
      "NOT_APPLICABLE",
      "OPTIONAL",
      "OPTIONAL_POINT_OF_SALE_REQUEST",
      "A declaração da rotulagem nutricional frontal é opcional para alimento embalado no ponto de venda a pedido do consumidor."
    );
  }

  if (input.packagingCondition === "PREPARED_OR_PORTIONED_AND_SOLD_ON_PREMISES") {
    return result(
      "NOT_APPLICABLE",
      "OPTIONAL",
      "OPTIONAL_PREPARED_OR_PORTIONED_ON_PREMISES",
      "A declaração da rotulagem nutricional frontal é opcional para alimento preparado ou fracionado e comercializado no próprio estabelecimento."
    );
  }

  const category = input.regulatoryCategory;
  let evaluatedNutrients: readonly FrontOfPackNutrient[] = frontOfPackNutrients;

  if (category && unconditionalAnnexXviCategories.includes(category)) {
    return result(
      "NOT_APPLICABLE",
      "PROHIBITED",
      "ANNEX_XVI_PROHIBITED",
      "A declaração da rotulagem nutricional frontal é vedada para esta categoria regulatória."
    );
  }

  if (category && conditionalAnnexXviCategories.includes(category)) {
    const additions: ReadonlyArray<{
      nutrient: FrontOfPackNutrient;
      status: FrontOfPackNutrientAdditionStatus | null | undefined;
      label: string;
    }> = [
      { nutrient: "addedSugars", status: input.addedSugarsAddition, label: "açúcares adicionados" },
      { nutrient: "saturatedFat", status: input.saturatedFatAddition, label: "gordura saturada" },
      { nutrient: "sodium", status: input.sodiumAddition, label: "sódio" }
    ];
    const unresolved = additions.filter(({ status }) => status === null || status === undefined || status === "UNKNOWN");

    if (unresolved.length > 0) {
      return result(
        "REQUIRES_REVIEW",
        "UNDETERMINED",
        "ANNEX_XVI_CONDITIONAL_REVIEW",
        "Precisamos confirmar quais nutrientes foram alterados por ingredientes adicionados antes de definir a rotulagem frontal.",
        unresolved.map(({ label }) => `adição relacionada a ${label}`)
      );
    }

    evaluatedNutrients = additions
      .filter(({ status }) => status === "YES")
      .map(({ nutrient }) => nutrient);

    if (evaluatedNutrients.length === 0) {
      return result(
        "NOT_APPLICABLE",
        "PROHIBITED",
        "ANNEX_XVI_CONDITIONAL_NO_ADDITION",
        "A declaração da rotulagem nutricional frontal é vedada para esta categoria nesta condição."
      );
    }
  }

  if (!category) {
    if (input.foodCategory?.trim()) {
      return result(
        "REQUIRES_REVIEW",
        "UNDETERMINED",
        "UX_CATEGORY_REQUIRES_CLASSIFICATION",
        "Precisamos confirmar o enquadramento regulatório deste produto antes de definir a rotulagem frontal.",
        ["categoria regulatória", "condição de embalagem e comercialização", "área do painel principal"]
      );
    }

    return result(
      "REQUIRES_REVIEW",
      "UNDETERMINED",
      "MISSING_REGULATORY_CATEGORY",
      "Precisamos informar a categoria regulatória do produto antes de definir a rotulagem frontal.",
      ["categoria regulatória"]
    );
  }

  if (!input.packagingCondition) {
    return result(
      "REQUIRES_REVIEW",
      "UNDETERMINED",
      "MISSING_PACKAGING_CONDITION",
      "Precisamos confirmar como o produto é embalado e comercializado antes de definir a rotulagem frontal.",
      ["condição de embalagem e comercialização"]
    );
  }

  if (
    input.mainPanelAreaCm2 === null ||
    input.mainPanelAreaCm2 === undefined ||
    !Number.isFinite(input.mainPanelAreaCm2) ||
    input.mainPanelAreaCm2 <= 0
  ) {
    return result(
      "REQUIRES_REVIEW",
      "UNDETERMINED",
      "MISSING_MAIN_PANEL_AREA",
      "Precisamos confirmar a área do painel principal da embalagem antes de definir a rotulagem frontal.",
      ["área do painel principal"]
    );
  }

  if (input.mainPanelAreaCm2 < 35) {
    return result(
      "NOT_APPLICABLE",
      "OPTIONAL",
      "OPTIONAL_SMALL_MAIN_PANEL",
      "A declaração da rotulagem nutricional frontal é opcional para embalagem com painel principal inferior a 35 cm²."
    );
  }

  return result(
    "APPLICABLE",
    "MANDATORY",
    "GENERAL_MANDATORY_RULE",
    "Este produto está sujeito à avaliação de rotulagem nutricional frontal.",
    [],
    evaluatedNutrients
  );
}

export function composeFrontOfPackDecision(
  applicability: FrontOfPackApplicability,
  thresholdEvaluation: FrontOfPackEvaluation
): FinalFrontOfPackDecision {
  const evaluated = applicability.evaluatedNutrients.map(
    (nutrient) => thresholdEvaluation.nutrients[nutrient]
  );
  const eligibleHighIn = evaluated.filter(({ status }) => status === "HIGH");
  const hasUnknownData = applicability.status === "APPLICABLE"
    ? evaluated.some(({ status }) => status === "UNKNOWN")
    : thresholdEvaluation.hasUnknownData;
  const shouldDisplayOfficialWarning =
    applicability.status === "APPLICABLE" && eligibleHighIn.length > 0;
  const finalHighIn = shouldDisplayOfficialWarning ? eligibleHighIn : [];
  let status: FinalFrontOfPackDecisionStatus;

  if (applicability.status === "NOT_APPLICABLE") {
    status = "NOT_APPLICABLE";
  } else if (applicability.status === "REQUIRES_REVIEW") {
    status = "REQUIRES_REVIEW";
  } else if (shouldDisplayOfficialWarning) {
    status = "SHOW_WARNING";
  } else if (hasUnknownData) {
    status = "INCOMPLETE_NUTRITION_DATA";
  } else {
    status = "NO_WARNING";
  }

  return {
    regulatoryVersion: regulatoryServingVersion,
    status,
    applicability,
    thresholdEvaluation,
    technicalHighIn: [...thresholdEvaluation.highIn],
    finalHighIn,
    shouldDisplayOfficialWarning,
    hasUnknownData
  };
}

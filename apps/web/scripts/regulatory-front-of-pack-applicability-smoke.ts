import { snapshotBaseRotula, assertBaseRotulaPreserved } from "./base-rotula-preservation";
import { readFileSync } from "node:fs";
import { prisma } from "@rotula-facil-pro/db";
import {
  nutritionNutrientFields,
  type NutritionCalculationResult,
  type NutritionNutrientField
} from "../src/lib/nutrition";
import {
  composeFrontOfPackDecision,
  evaluateFrontOfPack,
  evaluateFrontOfPackApplicability,
  regulatoryServingVersion
} from "../src/lib/regulatory";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function nutritionResult(
  values: Partial<Record<NutritionNutrientField, number>>,
  incomplete: NutritionNutrientField[] = []
): NutritionCalculationResult {
  const nutrients = nutritionNutrientFields.reduce<NutritionCalculationResult["nutrients"]>((acc, field) => {
    const per100 = values[field] ?? 0;
    acc[field] = {
      recipeTotal: per100 * 5,
      per100,
      perUnit: null,
      isComplete: !incomplete.includes(field)
    };
    return acc;
  }, {} as NutritionCalculationResult["nutrients"]);

  return {
    basis: "100g",
    finalYieldAmount: 500,
    finalYieldUnit: "GRAM",
    unitWeight: null,
    nutrients
  };
}

const applicable = evaluateFrontOfPackApplicability({
  regulatoryCategory: "OUTSIDE_ANNEX_XVI",
  packagingCondition: "PACKAGED_IN_ABSENCE_OF_CONSUMER",
  mainPanelAreaCm2: 100
});

async function main() {
  const baseSnapshot = await snapshotBaseRotula();
  assert(applicable.status === "APPLICABLE", "Categoria revisada fora do Anexo XVI deve ser APPLICABLE.");
  assert(applicable.legalEffect === "MANDATORY", "Regra geral aplicável deve ser obrigatória.");

  const prohibited = evaluateFrontOfPackApplicability({ regulatoryCategory: "MAMMAL_MILK" });
  assert(prohibited.status === "NOT_APPLICABLE", "Categoria vedada no Anexo XVI deve ser NOT_APPLICABLE.");
  assert(prohibited.legalEffect === "PROHIBITED", "Categoria do Anexo XVI deve preservar o efeito de vedação.");

  const generic = evaluateFrontOfPackApplicability({ foodCategory: "Palha italiana" });
  assert(generic.status === "REQUIRES_REVIEW", "Categoria comercial genérica deve exigir revisão.");

  const missingPackaging = evaluateFrontOfPackApplicability({ regulatoryCategory: "OUTSIDE_ANNEX_XVI" });
  assert(missingPackaging.status === "REQUIRES_REVIEW", "Condição de embalagem ausente deve exigir revisão.");

  const invalidPanel = evaluateFrontOfPackApplicability({
    regulatoryCategory: "OUTSIDE_ANNEX_XVI",
    packagingCondition: "PACKAGED_IN_ABSENCE_OF_CONSUMER",
    mainPanelAreaCm2: 0
  });
  assert(invalidPanel.status === "REQUIRES_REVIEW", "Área inválida não pode ser tratada como embalagem pequena.");

  const conditionalWithoutAddition = evaluateFrontOfPackApplicability({
    regulatoryCategory: "CHEESE",
    addedSugarsAddition: "NO",
    saturatedFatAddition: "NO",
    sodiumAddition: "NO"
  });
  assert(conditionalWithoutAddition.status === "NOT_APPLICABLE", "Queijo sem adição relevante deve permanecer vedado.");

  const conditionalWithAddition = evaluateFrontOfPackApplicability({
    regulatoryCategory: "CHEESE",
    addedSugarsAddition: "UNKNOWN",
    saturatedFatAddition: "NO",
    sodiumAddition: "NO"
  });
  assert(conditionalWithAddition.status === "REQUIRES_REVIEW", "Adição relevante exige revisão por nutriente.");

  const smallPanel = evaluateFrontOfPackApplicability({
    regulatoryCategory: "OUTSIDE_ANNEX_XVI",
    packagingCondition: "PACKAGED_IN_ABSENCE_OF_CONSUMER",
    mainPanelAreaCm2: 34.99
  });
  assert(smallPanel.status === "NOT_APPLICABLE" && smallPanel.legalEffect === "OPTIONAL", "Painel inferior a 35 cm² deve ser opcional.");

  const exactPanelBoundary = evaluateFrontOfPackApplicability({
    regulatoryCategory: "OUTSIDE_ANNEX_XVI",
    packagingCondition: "PACKAGED_IN_ABSENCE_OF_CONSUMER",
    mainPanelAreaCm2: 35
  });
  assert(exactPanelBoundary.status === "APPLICABLE", "Painel com exatamente 35 cm² não entra na condição opcional.");

  const pointOfSale = evaluateFrontOfPackApplicability({
    packagingCondition: "PACKED_AT_POINT_OF_SALE_AT_CONSUMER_REQUEST"
  });
  assert(pointOfSale.legalEffect === "OPTIONAL", "Embalagem no ponto de venda a pedido deve ser opcional.");

  const soldOnPremises = evaluateFrontOfPackApplicability({
    packagingCondition: "PREPARED_OR_PORTIONED_AND_SOLD_ON_PREMISES"
  });
  assert(soldOnPremises.legalEffect === "OPTIONAL", "Alimento preparado ou fracionado e vendido no local deve ser opcional.");

  const outsideScope = evaluateFrontOfPackApplicability({
    packagingCondition: "NOT_PACKAGED_IN_ABSENCE_OF_CONSUMER"
  });
  assert(outsideScope.legalEffect === "OUTSIDE_SCOPE", "Produto fora do escopo de pré-embalados deve ser identificado.");

  const high = evaluateFrontOfPack(nutritionResult({ addedSugarsG: 15 }));
  const notHigh = evaluateFrontOfPack(nutritionResult({ addedSugarsG: 14.99 }));
  const unknown = evaluateFrontOfPack(nutritionResult({ addedSugarsG: 999 }, ["addedSugarsG"]));

  const applicableHigh = composeFrontOfPackDecision(applicable, high);
  assert(applicableHigh.status === "SHOW_WARNING", "APPLICABLE + HIGH deve gerar decisão final com lupa.");
  assert(applicableHigh.shouldDisplayOfficialWarning && applicableHigh.finalHighIn.length === 1, "Lupa final aplicável ausente.");

  const applicableNotHigh = composeFrontOfPackDecision(applicable, notHigh);
  assert(applicableNotHigh.status === "NO_WARNING", "APPLICABLE + NOT_HIGH deve resultar sem lupa.");

  const prohibitedHigh = composeFrontOfPackDecision(prohibited, high);
  assert(!prohibitedHigh.shouldDisplayOfficialWarning, "NOT_APPLICABLE + HIGH não pode exibir lupa final.");
  assert(prohibitedHigh.technicalHighIn.length === 1 && prohibitedHigh.finalHighIn.length === 0, "HIGH técnico deve ser preservado quando não aplicável.");

  const reviewHigh = composeFrontOfPackDecision(generic, high);
  assert(reviewHigh.status === "REQUIRES_REVIEW", "REQUIRES_REVIEW + HIGH deve continuar em revisão.");
  assert(reviewHigh.technicalHighIn.length === 1 && reviewHigh.finalHighIn.length === 0, "HIGH técnico deve ser preservado durante revisão.");

  const reviewUnknown = composeFrontOfPackDecision(generic, unknown);
  assert(reviewUnknown.hasUnknownData, "UNKNOWN da avaliação matemática deve ser preservado.");
  assert(reviewUnknown.thresholdEvaluation.nutrients.addedSugars.status === "UNKNOWN", "Estado individual UNKNOWN foi perdido.");

  assert(high.nutrients.addedSugars.status === "HIGH", "A igualdade ao limite da Sprint 7I deve continuar HIGH.");
  assert(notHigh.nutrients.addedSugars.status === "NOT_HIGH", "A regra matemática da Sprint 7I foi alterada.");
  assert(applicable.regulatoryVersion === regulatoryServingVersion, "Versão regulatória da aplicabilidade divergente.");
  assert(applicableHigh.regulatoryVersion === regulatoryServingVersion, "Versão regulatória da decisão final divergente.");

  const componentSource = readFileSync(
    new URL("../src/components/nutrition/front-of-pack-nutrition-preview.tsx", import.meta.url),
    "utf8"
  );
  assert(!componentSource.includes("evaluateFrontOfPack"), "O componente não pode executar avaliação matemática.");
  assert(!componentSource.includes("evaluateFrontOfPackApplicability"), "O componente não pode decidir aplicabilidade.");

  const baseRotula = await prisma.ingredient.count({ where: { source: "BASE_ROTULA" } });
  await assertBaseRotulaPreserved(baseSnapshot);

  console.log(JSON.stringify({
    applicable: "OK",
    notApplicable: "OK",
    genericCategoryReview: "OK",
    missingDataReview: "OK",
    annexXviConditionalRule: "OK",
    optionalConditions: "OK",
    exactPanelBoundary: "OK",
    outsidePrepackagedScope: "OK",
    applicableHigh: "OK",
    applicableNotHigh: "OK",
    notApplicableHighPreserved: "OK",
    reviewHighPreserved: "OK",
    unknownPreserved: "OK",
    sprint7iMathPreserved: "OK",
    regulatoryVersion: regulatoryServingVersion,
    baseRotula
  }, null, 2));
}

main().finally(() => prisma.$disconnect());

import type { FinalLabelPreview } from "@/lib/final-label/preview";
import { mandatoryNutritionTableNutrients } from "@/lib/regulatory/nutrition-table";

export type NutritionTablePdfAssessment =
  | { allowed: true; code: null; message: null }
  | { allowed: false; code: "INCOMPLETE" | "REQUIRES_REVIEW"; message: string };

function declaredNumber(value: string | null) {
  return value !== null && /^(?:\d+(?:[.,]\d+)?|\d{1,3}(?:\.\d{3})+(?:,\d+)?)$/.test(value);
}

// Both the page and the download route use this guard. No label format or template.
export function assessNutritionTablePdf(preview: FinalLabelPreview): NutritionTablePdfAssessment {
  const incomplete = (message: string): NutritionTablePdfAssessment => ({ allowed: false, code: "INCOMPLETE", message });
  const review = (message: string): NutritionTablePdfAssessment => ({ allowed: false, code: "REQUIRES_REVIEW", message });
  const contradiction = preview.issues.find(issue => ["GLUTEN_CONTRADICTION", "LACTOSE_CONTRADICTION"].includes(issue.code));
  if (contradiction) return { allowed: false, code: "REQUIRES_REVIEW", message: contradiction.message };
  if (preview.allergenStatus !== "KNOWN" && preview.allergenStatus !== "NONE") {
    return review("Revise os alergênicos desconhecidos antes de exportar. Informação ausente não confirma ausência.");
  }
  if (preview.status === "INCOMPLETE" || preview.issues.some(issue => issue.severity === "BLOCK")) {
    return incomplete("Complete as informações obrigatórias indicadas nas pendências antes de exportar.");
  }
  if (preview.status !== "READY" || preview.issues.some(issue => issue.severity === "REVIEW")) {
    return review("Conclua a revisão das informações obrigatórias antes de exportar.");
  }
  if (!["CONTAINS", "DOES_NOT_CONTAIN"].includes(preview.glutenStatus ?? "") ||
      !["CONTAINS", "DOES_NOT_CONTAIN"].includes(preview.lactoseStatus ?? "") ||
      !["YES", "NO"].includes(preview.crossContaminationRisk ?? "") ||
      (preview.crossContaminationRisk === "YES" && !preview.crossContaminationAllergens.length)) {
    return review("Revise as declarações de glúten, lactose e contato com alergênicos.");
  }
  if (!preview.ingredients.length || !preview.ingredientsText || !preview.netQuantityLabel) {
    return incomplete("Complete os ingredientes e a quantidade contida na embalagem.");
  }
  const table = preview.nutritionTable;
  if (!table || table.status !== "COMPLETE" || table.configurationRequired || table.missingNutrients.length ||
      !table.servingLabel || !table.householdMeasure || (!table.isIndividualPackage && !table.servingsPerPackageLabel) ||
      !table.dailyValueFootnote || !["100 g", "100 ml"].includes(table.basisLabel)) {
    return incomplete("Complete a tabela, a porção, a medida caseira e as porções por embalagem.");
  }
  if (table.rows.length !== mandatoryNutritionTableNutrients.length || mandatoryNutritionTableNutrients.some((nutrient, index) => {
    const row = table.rows[index];
    return row?.nutrient !== nutrient || !declaredNumber(row.per100Value) || !declaredNumber(row.perServingValue) ||
      (row.hasEstablishedDailyValue && !declaredNumber(row.dailyValuePercent));
  })) {
    return incomplete("Há nutrientes obrigatórios ou valores diários não informados. Dados desconhecidos não são zero.");
  }
  const front = preview.frontOfPack;
  if (!front || front.applicability.status === "REQUIRES_REVIEW" || front.status === "REQUIRES_REVIEW") {
    return review("Conclua o enquadramento do produto e da embalagem para avaliar a lupa.");
  }
  if (front.applicability.status !== "NOT_APPLICABLE" && front.hasUnknownData) {
    return incomplete("Faltam dados nutricionais obrigatórios para avaliar a lupa.");
  }
  if (front.shouldDisplayOfficialWarning && (!front.finalHighIn.length ||
      front.finalHighIn.some(item => !["addedSugars", "saturatedFat", "sodium"].includes(item.nutrient)) ||
      !Number.isFinite(preview.mainPanelAreaCm2) || (preview.mainPanelAreaCm2 ?? 0) <= 0)) {
    return review("Confira os dados da lupa e a área do painel principal da embalagem.");
  }
  return { allowed: true, code: null, message: null };
}

export function nutritionTablePdfHref(recipeId: string, mode: "download" | "print" = "download") {
  const href = `/rotulo-final/${encodeURIComponent(recipeId)}/tabela/download`;
  return mode === "print" ? `${href}?mode=print` : href;
}

export function prepareNutritionTableProduction(preview: FinalLabelPreview) {
  const assessment = assessNutritionTablePdf(preview);
  return {
    assessment,
    downloadHref: assessment.allowed ? nutritionTablePdfHref(preview.recipeId) : null,
    printHref: assessment.allowed ? nutritionTablePdfHref(preview.recipeId, "print") : null
  };
}

import { findBarcodeByRecipe } from "@/lib/barcodes/repository";
import { renderBarcodeSvg, type BarcodeRenderResult } from "@/lib/barcodes/render";
import { calculateRecipeNutrition, NutritionCalculationError } from "@/lib/nutrition";
import { findRecipeForNutrition } from "@/lib/recipes/repository";
import {
  buildNutritionTableViewModel,
  calculateNutritionPerServing,
  composeFrontOfPackDecision,
  evaluateFrontOfPack,
  evaluateFrontOfPackApplicability,
  formatNutritionForDeclaration,
  type FinalFrontOfPackDecision,
  type FrontOfPackApplicabilityInput,
  type NutritionTableViewModel
} from "@/lib/regulatory";

type Recipe = NonNullable<Awaited<ReturnType<typeof findRecipeForNutrition>>>;
type Barcode = NonNullable<Awaited<ReturnType<typeof findBarcodeByRecipe>>>;
export type FinalLabelStatus = "READY" | "INCOMPLETE" | "REQUIRES_REVIEW";
export type FinalLabelIssue = { code: string; severity: "BLOCK" | "REVIEW" | "WARNING"; message: string };

export type FinalLabelPreview = {
  recipeId: string;
  name: string;
  physicalState: Recipe["physicalState"];
  netQuantityLabel: string | null;
  ingredients: string[];
  ingredientsText: string | null;
  allergens: string[];
  glutenStatus: Recipe["glutenStatus"];
  lactoseStatus: Recipe["lactoseStatus"];
  crossContaminationRisk: Recipe["crossContaminationRisk"];
  crossContaminationAllergens: string[];
  nutritionTable: NutritionTableViewModel | null;
  frontOfPack: FinalFrontOfPackDecision | null;
  barcode: { value: string; type: Barcode["type"]; display: BarcodeRenderResult } | null;
  issues: FinalLabelIssue[];
  status: FinalLabelStatus;
};

function formatAmount(value: unknown) {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? amount.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
    : null;
}

export function composeFinalLabelPreview(recipe: Recipe, barcode: Barcode | null, applicabilityInput?: FrontOfPackApplicabilityInput): FinalLabelPreview {
  const issues: FinalLabelIssue[] = [];
  const add = (code: string, severity: FinalLabelIssue["severity"], message: string) => issues.push({ code, severity, message });
  const amount = formatAmount(recipe.netQuantity);
  const expectedUnit = recipe.physicalState === "LIQUID" ? "MILLILITER" : "GRAM";
  const netQuantityLabel = amount && recipe.netQuantityUnit === expectedUnit
    ? `${recipe.physicalState === "LIQUID" ? "CONTEÚDO" : "PESO LÍQUIDO"} ${amount} ${expectedUnit === "GRAM" ? "g" : "ml"}`
    : null;
  if (!netQuantityLabel) add("MISSING_NET_QUANTITY", "BLOCK", "Informe a quantidade líquida da embalagem na receita.");

  const ordered = recipe.ingredients
    .map((item, index) => ({ item, index }))
    .sort((a, b) => Number(b.item.amount) - Number(a.item.amount) || a.index - b.index);
  const ingredients = ordered.map(({ item }) => item.ingredient.name);
  const ingredientsText = ingredients.length ? `INGREDIENTES: ${ingredients.join(", ")}.` : null;
  if (!ingredientsText) add("MISSING_INGREDIENTS", "BLOCK", "Adicione os ingredientes da receita.");
  if (recipe.ingredients.some(({ ingredient }) => ingredient.source === "CUSTOM")) {
    add("CHECK_COMPOUND_INGREDIENTS", "WARNING", "Revise manualmente se algum ingrediente próprio é composto: subingredientes não estão estruturados na base.");
  }

  if (!recipe.informationReviewedAt || !recipe.glutenStatus || !recipe.lactoseStatus || !recipe.crossContaminationRisk) {
    add("MISSING_REQUIRED_DECLARATION", "BLOCK", "Conclua a revisão de alergênicos, glúten, lactose e contaminação cruzada na receita.");
  } else if (recipe.crossContaminationRisk === "YES" && recipe.crossContaminationAllergens.length === 0) {
    add("MISSING_CROSS_CONTAMINATION_ALLERGENS", "BLOCK", "Informe quais alergênicos podem estar presentes por contaminação cruzada.");
  } else if (recipe.glutenStatus === "NEEDS_REVIEW" || recipe.lactoseStatus === "NEEDS_REVIEW" || recipe.crossContaminationRisk === "UNKNOWN") {
    add("DECLARATION_REQUIRES_REVIEW", "REVIEW", "Há declarações da receita marcadas para revisão.");
  }

  let nutritionTable: NutritionTableViewModel | null = null;
  let frontOfPack: FinalFrontOfPackDecision | null = null;
  try {
    const raw = calculateRecipeNutrition(recipe);
    frontOfPack = composeFrontOfPackDecision(
      evaluateFrontOfPackApplicability(applicabilityInput ?? { foodCategory: recipe.foodCategory }),
      evaluateFrontOfPack(raw)
    );
    const perServing = calculateNutritionPerServing(raw, recipe.servingSize, expectedUnit);
    nutritionTable = buildNutritionTableViewModel(formatNutritionForDeclaration(perServing), {
      householdMeasure: recipe.householdMeasure,
      servingsPerPackage: recipe.servingsPerPackage,
      isIndividualPackage: recipe.isIndividualPackage
    });
  } catch (error) {
    if (!(error instanceof NutritionCalculationError)) throw error;
    add("NUTRITION_UNAVAILABLE", "BLOCK", "Informe ingredientes e rendimento final válidos para calcular a tabela e a lupa.");
  }
  if (nutritionTable?.status === "INCOMPLETE") {
    const names = nutritionTable.missingNutrients.join(", ");
    add("INCOMPLETE_NUTRITION", "BLOCK", names
      ? `A tabela nutricional está incompleta: ${names}.`
      : "Defina a porção e os dados da embalagem para concluir a tabela nutricional.");
  }
  if (frontOfPack?.applicability.status === "REQUIRES_REVIEW") {
    add("FRONT_LABEL_REQUIRES_REVIEW", "REVIEW", "Revise o enquadramento da rotulagem frontal antes de concluir o rótulo.");
  }
  if (frontOfPack?.hasUnknownData) {
    add("FRONT_LABEL_UNKNOWN", "BLOCK", "Faltam dados para avaliar todos os nutrientes da lupa frontal.");
  }

  let barcodePreview: FinalLabelPreview["barcode"] = null;
  if (!barcode) {
    add("MISSING_BARCODE", "WARNING", "Código de barras ainda não associado.");
  } else {
    try {
      barcodePreview = { value: barcode.value, type: barcode.type, display: renderBarcodeSvg(barcode) };
      if (barcodePreview.display.status === "UNAVAILABLE") add("BARCODE_UNAVAILABLE", "WARNING", "A imagem do código de barras não está disponível nesta prévia.");
    } catch {
      add("BARCODE_UNAVAILABLE", "WARNING", "O código de barras associado precisa ser revisado.");
    }
  }

  const status: FinalLabelStatus = issues.some((issue) => issue.severity === "BLOCK")
    ? "INCOMPLETE"
    : issues.some((issue) => issue.severity === "REVIEW") ? "REQUIRES_REVIEW" : "READY";
  return {
    recipeId: recipe.id, name: recipe.name, physicalState: recipe.physicalState,
    netQuantityLabel, ingredients, ingredientsText,
    allergens: recipe.confirmedAllergens, glutenStatus: recipe.glutenStatus,
    lactoseStatus: recipe.lactoseStatus, crossContaminationRisk: recipe.crossContaminationRisk,
    crossContaminationAllergens: recipe.crossContaminationAllergens,
    nutritionTable, frontOfPack, barcode: barcodePreview, issues, status
  };
}

export async function buildFinalLabelPreview(recipeId: string, userId: string) {
  const recipe = await findRecipeForNutrition(userId, recipeId);
  if (!recipe) return null;
  const barcode = await findBarcodeByRecipe(userId, recipe.id);
  return composeFinalLabelPreview(recipe, barcode);
}

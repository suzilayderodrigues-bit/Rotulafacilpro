import { ingredientDisclosureConflict } from "@/lib/recipes/product-information";
import { findBarcodeByRecipe } from "@/lib/barcodes/repository";
import { resolveIngredientAllergenState, type IngredientAllergenState } from "@rotula-facil-pro/db/allergens";
import { renderBarcodeSvg, type BarcodeRenderResult } from "@/lib/barcodes/render";
import { calculateRecipeNutrition, NutritionCalculationError } from "@/lib/nutrition";
import { findRecipeForNutrition } from "@/lib/recipes/repository";
import { deriveRecipeMainPanelAreaCm2 } from "@/lib/recipes/main-panel";
import { missingIngredientInformation } from "@/lib/ingredients/complement";
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
  allergenStatus: IngredientAllergenState;
  ingredientCompletions?: { itemId: string; name: string; missing: string[] }[];
  glutenStatus: Recipe["glutenStatus"];
  lactoseStatus: Recipe["lactoseStatus"];
  crossContaminationRisk: Recipe["crossContaminationRisk"];
  crossContaminationAllergens: string[];
  mainPanelAreaCm2?: number | null;
  nutritionTable: NutritionTableViewModel | null;
  frontOfPack: FinalFrontOfPackDecision | null;
  barcode: { value: string; type: Barcode["type"]; format: Barcode["format"]; display: BarcodeRenderResult } | null;
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

  const hasUnknownAllergens = recipe.ingredients.some(({ ingredient }) => resolveIngredientAllergenState(ingredient) === "UNKNOWN");
  const normalizeAllergen = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
  const knownAllergens = recipe.ingredients.flatMap(({ ingredient }) =>
    resolveIngredientAllergenState(ingredient) === "KNOWN" ? ingredient.allergens ?? [] : []).map(normalizeAllergen);
  const confirmedAllergens = recipe.confirmedAllergens.map(normalizeAllergen);
  const allergens = [...new Set([...knownAllergens, ...confirmedAllergens])];
  const knownButUnconfirmed = knownAllergens.some(value => !confirmedAllergens.includes(value));
  const allergenStatus: IngredientAllergenState = hasUnknownAllergens || knownButUnconfirmed ? "UNKNOWN"
    : recipe.confirmedAllergens.length ? "KNOWN" : "NONE";
  if (allergenStatus === "UNKNOWN") {
    add("ALLERGENS_REQUIRE_REVIEW", "REVIEW", "Há alergênicos desconhecidos nos ingredientes ou declarações ainda não confirmadas. Não é possível confirmar ausência nem exportar o PDF.");
  }

  if (!recipe.informationReviewedAt || !recipe.glutenStatus || !recipe.lactoseStatus || !recipe.crossContaminationRisk) {
    add("MISSING_REQUIRED_DECLARATION", "BLOCK", "Conclua a revisão de alergênicos, glúten, lactose e contaminação cruzada na receita.");
  } else if (recipe.crossContaminationRisk === "YES" && recipe.crossContaminationAllergens.length === 0) {
    add("MISSING_CROSS_CONTAMINATION_ALLERGENS", "BLOCK", "Informe quais alergênicos podem estar presentes por contaminação cruzada.");
  } else if (recipe.glutenStatus === "NEEDS_REVIEW" || recipe.lactoseStatus === "NEEDS_REVIEW" || recipe.crossContaminationRisk === "UNKNOWN") {
    add("DECLARATION_REQUIRES_REVIEW", "REVIEW", "Há declarações da receita marcadas para revisão.");
  }

  if (ingredientDisclosureConflict(recipe, "containsGluten", recipe.glutenStatus)) {
    add("GLUTEN_CONTRADICTION", "BLOCK", "Há ingrediente com glúten. Revise a declaração de glúten em Meu produto.");
  }
  if (ingredientDisclosureConflict(recipe, "containsLactose", recipe.lactoseStatus)) {
    add("LACTOSE_CONTRADICTION", "BLOCK", "Há ingrediente com lactose. Revise a declaração de lactose em Meu produto.");
  }

  let nutritionTable: NutritionTableViewModel | null = null;
  let frontOfPack: FinalFrontOfPackDecision | null = null;
  try {
    const raw = calculateRecipeNutrition(recipe);
    frontOfPack = composeFrontOfPackDecision(
      evaluateFrontOfPackApplicability(applicabilityInput ?? {
        foodCategory: recipe.foodCategory,
        regulatoryCategory: recipe.regulatoryCategory,
        packagingCondition: recipe.packagingCondition,
        mainPanelAreaCm2: deriveRecipeMainPanelAreaCm2(recipe),
        addedSugarsAddition: recipe.addedSugarsAddition,
        saturatedFatAddition: recipe.saturatedFatAddition,
        sodiumAddition: recipe.sodiumAddition
      }),
      evaluateFrontOfPack(raw)
    );
    const perServing = calculateNutritionPerServing(raw, recipe.servingSize, expectedUnit);
    const declaration = formatNutritionForDeclaration(perServing);
    nutritionTable = buildNutritionTableViewModel(declaration, {
      householdMeasure: recipe.householdMeasure,
      servingsPerPackage: recipe.servingsPerPackage,
      isIndividualPackage: recipe.isIndividualPackage
    });
    for (const row of nutritionTable.rows) {
      const absent = recipe.ingredients.filter(({ ingredient }) => ingredient[row.nutrient] === null || ingredient[row.nutrient] === undefined);
      if (absent.length) add(`NUTRIENT_${row.nutrient}`, "BLOCK", `${row.label}: dado não informado na fonte de ${absent.map(({ ingredient }) => ingredient.name).join(", ")}. Confira a ficha do ingrediente; informação desconhecida não é zero.`);
      else if (declaration.nutrients[row.nutrient].per100.requiresNonSignificantReview || declaration.nutrients[row.nutrient].perServing.requiresNonSignificantReview) {
        add(`NUTRIENT_${row.nutrient}`, "REVIEW", `${row.label}: os dados dos ingredientes estão disponíveis, mas a declaração de quantidade não significativa precisa de revisão regulatória.`);
      }
    }
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
  if (frontOfPack?.hasUnknownData && frontOfPack.applicability.status !== "NOT_APPLICABLE") {
    add("FRONT_LABEL_UNKNOWN", "BLOCK", "Faltam dados para avaliar todos os nutrientes da lupa frontal.");
  }

  let barcodePreview: FinalLabelPreview["barcode"] = null;
  if (!barcode) {
    add("MISSING_BARCODE", "WARNING", "Código de barras ainda não associado.");
  } else {
    try {
      barcodePreview = { value: barcode.value, type: barcode.type, format: barcode.format, display: renderBarcodeSvg(barcode) };
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
    allergens, allergenStatus, glutenStatus: recipe.glutenStatus,
    ingredientCompletions: recipe.ingredients.map(item => ({ itemId: item.id, name: item.ingredient.name, missing: missingIngredientInformation(item.ingredient) })).filter(item => item.missing.length > 0),
    lactoseStatus: recipe.lactoseStatus, crossContaminationRisk: recipe.crossContaminationRisk,
    crossContaminationAllergens: recipe.crossContaminationAllergens,
    mainPanelAreaCm2: deriveRecipeMainPanelAreaCm2(recipe),
    nutritionTable, frontOfPack, barcode: barcodePreview, issues, status
  };
}

export async function buildFinalLabelPreview(recipeId: string, userId: string) {
  const recipe = await findRecipeForNutrition(userId, recipeId);
  if (!recipe) return null;
  const barcode = await findBarcodeByRecipe(userId, recipe.id);
  return composeFinalLabelPreview(recipe, barcode);
}

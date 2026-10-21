import { resolveIngredientAllergenState } from "@rotula-facil-pro/db/allergens";
import { RecipeValidationError, type RecipeInformationInput } from "./domain";
import type { findRecipe } from "./repository";

export type ProductInformationRecipe = NonNullable<Awaited<ReturnType<typeof findRecipe>>>;

function normalized(values: string[]) {
  return [...new Set(values.map(value => value.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR")).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function ingredientDisclosureConflict(recipe: Pick<ProductInformationRecipe, "ingredients">, field: "containsGluten" | "containsLactose", declaration: string | null | undefined) {
  return declaration === "DOES_NOT_CONTAIN" && recipe.ingredients.some(({ ingredient }) => ingredient[field] === true);
}

export function ingredientDisclosureUnknown(recipe: Pick<ProductInformationRecipe, "ingredients">, field: "containsGluten" | "containsLactose") {
  return recipe.ingredients.some(({ ingredient }) => ingredient[field] === null || ingredient[field] === undefined);
}

export function buildProductInformationModel(recipe: ProductInformationRecipe) {
  const knownAllergens = normalized(recipe.ingredients.flatMap(({ ingredient }) =>
    ingredient.allergens));
  const confirmed = normalized(recipe.confirmedAllergens);
  const unknownIngredients = recipe.ingredients.filter(({ ingredient }) => resolveIngredientAllergenState(ingredient) === "UNKNOWN")
    .map(item => ({ id: item.id, name: item.ingredient.name }));
  function disclosure(field: "containsGluten" | "containsLactose", saved: string | null) {
    const sourceContains = recipe.ingredients.some(({ ingredient }) => ingredient[field] === true);
    const sourceUnknown = ingredientDisclosureUnknown(recipe, field);
    const sourceAbsence = recipe.ingredients.length > 0 && recipe.ingredients.every(({ ingredient }) => ingredient[field] === false);
    const conflict = ingredientDisclosureConflict(recipe, field, saved);
    return {
      value: sourceContains && (conflict || !saved) ? "CONTAINS" : sourceUnknown && saved === "DOES_NOT_CONTAIN" ? "NEEDS_REVIEW" : saved ?? "NEEDS_REVIEW",
      verified: Boolean(recipe.informationReviewedAt) && ["CONTAINS", "DOES_NOT_CONTAIN"].includes(saved ?? "") && !conflict && !sourceUnknown,
      sourceContains, sourceUnknown, sourceAbsence
    };
  }
  const gluten = disclosure("containsGluten", recipe.glutenStatus);
  const lactose = disclosure("containsLactose", recipe.lactoseStatus);
  const processVerified = Boolean(recipe.informationReviewedAt) && (recipe.crossContaminationRisk === "NO" ||
    (recipe.crossContaminationRisk === "YES" && recipe.crossContaminationAllergens.length > 0));
  return {
    recipeId: recipe.id,
    knownAllergens,
    additionalAllergens: confirmed.filter(value => !knownAllergens.includes(value)),
    unknownIngredients,
    allSourcesDeclareNone: recipe.ingredients.length > 0 && recipe.ingredients.every(({ ingredient }) => resolveIngredientAllergenState(ingredient) === "NONE"),
    gluten, lactose,
    processRisk: recipe.crossContaminationRisk,
    processAllergens: recipe.crossContaminationAllergens,
    reviewed: Boolean(recipe.informationReviewedAt) && !unknownIngredients.length && knownAllergens.every(value => confirmed.includes(value)) && gluten.verified && lactose.verified && processVerified
  };
}

export type ProductInformationModel = ReturnType<typeof buildProductInformationModel>;

// Resolve trustworthy source data again on the server; hidden form values are not authoritative.
export function prepareProductInformationInput(recipe: ProductInformationRecipe, input: RecipeInformationInput): RecipeInformationInput {
  const model = buildProductInformationModel(recipe);
  if (ingredientDisclosureConflict(recipe, "containsGluten", input.glutenStatus) ||
      ingredientDisclosureConflict(recipe, "containsLactose", input.lactoseStatus) ||
      (input.glutenStatus === "DOES_NOT_CONTAIN" && ingredientDisclosureUnknown(recipe, "containsGluten")) ||
      (input.lactoseStatus === "DOES_NOT_CONTAIN" && ingredientDisclosureUnknown(recipe, "containsLactose"))) {
    throw new RecipeValidationError("invalid-information");
  }
  const selected = Array.isArray(input.confirmedAllergens) ? input.confirmedAllergens : (input.confirmedAllergens ?? "").split(",");
  return { ...input, confirmedAllergens: normalized([...model.knownAllergens, ...selected]) };
}

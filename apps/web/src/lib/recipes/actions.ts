"use server";

import { redirect } from "next/navigation";
import { type IngredientBaseUnit, type RecipePhysicalState } from "@rotula-facil-pro/db";
import { requireUser } from "@/lib/auth/session";
import { RecipeValidationError } from "./domain";
import { addRecipeIngredient, createRecipe, removeRecipeIngredient } from "./repository";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function recipeType(value: string): RecipePhysicalState | null {
  if (value === "SOLID_OR_SEMISOLID" || value === "LIQUID") return value;
  return null;
}

function ingredientUnit(value: string): IngredientBaseUnit | null {
  if (value === "GRAM" || value === "MILLILITER") return value;
  return null;
}

function finalYieldUnitForType(type: RecipePhysicalState): IngredientBaseUnit {
  return type === "LIQUID" ? "MILLILITER" : "GRAM";
}

function productErrorParam(error: unknown) {
  if (error instanceof RecipeValidationError) {
    if (error.code === "name-required") return "nome";
    if (error.code === "invalid-physical-state" || error.code === "invalid-yield-unit") return "tipo";
  }

  return "formulario";
}

function ingredientErrorParam(error: unknown) {
  if (error instanceof RecipeValidationError) {
    if (error.code === "invalid-amount") return "quantidade";
    if (error.code === "duplicate-ingredient") return "duplicado";
    if (error.code === "unit-mismatch") return "unidade";
    if (error.code === "recipe-not-found") return "receita";
    if (error.code === "ingredient-not-found") return "ingrediente";
  }

  return "formulario";
}

function recipeIngredientsHref(recipeId: string, status?: string) {
  return status ? "/receitas/" + recipeId + "/ingredientes?status=" + status : "/receitas/" + recipeId + "/ingredientes";
}

export async function createRecipeProductAction(formData: FormData) {
  const user = await requireUser();
  const name = formString(formData, "name");
  const foodCategory = formString(formData, "foodCategory");
  const physicalState = recipeType(formString(formData, "physicalState"));

  if (!physicalState) {
    redirect("/receitas/nova?erro=tipo");
  }

  let redirectTo = "/receitas/nova?erro=formulario";

  try {
    const recipe = await createRecipe(user.id, {
      name,
      foodCategory,
      physicalState,
      finalYieldAmount: null,
      finalYieldUnit: finalYieldUnitForType(physicalState),
      unitsProduced: null,
      unitWeight: null
    });

    redirectTo = "/receitas/" + recipe.id + "/ingredientes";
  } catch (error) {
    redirectTo = "/receitas/nova?erro=" + productErrorParam(error);
  }

  redirect(redirectTo);
}

export async function addRecipeIngredientAction(formData: FormData) {
  const user = await requireUser();
  const recipeId = formString(formData, "recipeId");
  const ingredientId = formString(formData, "ingredientId");
  const amount = formString(formData, "amount");
  const unit = ingredientUnit(formString(formData, "unit"));

  if (!recipeId || !ingredientId || !unit) {
    redirect(recipeIngredientsHref(recipeId || "", "formulario"));
  }

  let status = "adicionado";

  try {
    await addRecipeIngredient(user.id, recipeId, {
      ingredientId,
      amount,
      unit
    });
  } catch (error) {
    status = ingredientErrorParam(error);
  }

  redirect(recipeIngredientsHref(recipeId, status));
}

export async function removeRecipeIngredientAction(formData: FormData) {
  const user = await requireUser();
  const recipeId = formString(formData, "recipeId");
  const recipeIngredientId = formString(formData, "recipeIngredientId");

  if (!recipeId || !recipeIngredientId) {
    redirect(recipeIngredientsHref(recipeId || "", "formulario"));
  }

  const removed = await removeRecipeIngredient(user.id, recipeIngredientId);
  redirect(recipeIngredientsHref(recipeId, removed.count === 0 ? "receita" : "removido"));
}

"use server";

import { redirect } from "next/navigation";
import { type IngredientBaseUnit, type RecipePhysicalState } from "@rotula-facil-pro/db";
import { requireUser } from "@/lib/auth/session";
import { RecipeValidationError } from "./domain";
import { createRecipe } from "./repository";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function recipeType(value: string): RecipePhysicalState | null {
  if (value === "SOLID_OR_SEMISOLID" || value === "LIQUID") return value;
  return null;
}

function finalYieldUnitForType(type: RecipePhysicalState): IngredientBaseUnit {
  return type === "LIQUID" ? "MILLILITER" : "GRAM";
}

function errorParam(error: unknown) {
  if (error instanceof RecipeValidationError) {
    if (error.code === "name-required") return "nome";
    if (error.code === "invalid-physical-state" || error.code === "invalid-yield-unit") return "tipo";
  }

  return "formulario";
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
    redirectTo = "/receitas/nova?erro=" + errorParam(error);
  }

  redirect(redirectTo);
}

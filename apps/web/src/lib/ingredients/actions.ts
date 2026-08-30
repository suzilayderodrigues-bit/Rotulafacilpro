"use server";

import { redirect } from "next/navigation";
import { type IngredientBaseUnit } from "@rotula-facil-pro/db";
import { requireUser } from "@/lib/auth/session";
import { ingredientCategories } from "./categories";
import {
  createCustomIngredient,
  deleteCustomIngredient,
  updateCustomIngredient
} from "./repository";
import {
  ingredientNutrientFields,
  normalizeIngredientNutrientsForBase100,
  type IngredientNutrientField,
  type IngredientNutrientInput,
  type IngredientNutrientValues,
  type NutrientPortionMode
} from "./nutrition";

type CustomIngredientFormValues = {
  name: string;
  category: string;
  baseUnit: IngredientBaseUnit;
  nutrients: IngredientNutrientValues;
  containsGluten: boolean | null;
  containsLactose: boolean | null;
  allergens: string[];
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseBooleanState(value: string) {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

function parseCustomIngredientForm(formData: FormData): CustomIngredientFormValues {
  const name = formString(formData, "name");
  const category = formString(formData, "category");
  const baseUnitInput = formString(formData, "baseUnit");
  const portionModeInput = formString(formData, "portionMode");
  const portionSizeInput = formString(formData, "portionSize");

  if (!name || !ingredientCategories.includes(category as (typeof ingredientCategories)[number])) {
    throw new Error("invalid-form");
  }

  const baseUnit = baseUnitInput === "MILLILITER" ? "MILLILITER" : "GRAM";
  const portionMode: NutrientPortionMode = portionModeInput === "portion" ? "portion" : "per100";
  const portionSize = portionMode === "portion" ? Number(portionSizeInput.replace(",", ".")) : 100;
  const nutrientInputs = ingredientNutrientFields.reduce<IngredientNutrientInput>((acc, field) => {
    acc[field] = formString(formData, field);
    return acc;
  }, {} as Record<IngredientNutrientField, string>);
  const allergensText = formString(formData, "allergens");

  return {
    name,
    category,
    baseUnit,
    nutrients: normalizeIngredientNutrientsForBase100({
      nutrients: nutrientInputs,
      portionMode,
      portionSize
    }),
    containsGluten: parseBooleanState(formString(formData, "containsGluten")),
    containsLactose: parseBooleanState(formString(formData, "containsLactose")),
    allergens: allergensText ? [allergensText] : []
  };
}

function customIngredientData(parsed: CustomIngredientFormValues) {
  return {
    name: parsed.name,
    normalizedName: normalizeName(parsed.name),
    category: parsed.category,
    dataOrigin: "Rótulo informado pelo usuário",
    dataOriginUrl: null,
    sourceCode: null,
    sourceVersion: null,
    baseUnit: parsed.baseUnit,
    baseQuantity: 100,
    ...parsed.nutrients,
    allergens: parsed.allergens,
    containsGluten: parsed.containsGluten,
    containsLactose: parsed.containsLactose
  };
}

function redirectWithStatus(status: string): never {
  redirect(`/ingredientes?aba=meus&status=${status}`);
}

export async function createCustomIngredientAction(formData: FormData) {
  const user = await requireUser();
  let status = "created";

  try {
    const parsed = parseCustomIngredientForm(formData);
    await createCustomIngredient(user.id, customIngredientData(parsed));
  } catch {
    status = "invalid";
  }

  redirectWithStatus(status);
}

export async function updateCustomIngredientAction(formData: FormData) {
  const user = await requireUser();
  const ingredientId = formString(formData, "ingredientId");
  let status = "updated";

  if (!ingredientId) {
    redirectWithStatus("denied");
  }

  try {
    const parsed = parseCustomIngredientForm(formData);
    const updated = await updateCustomIngredient(user.id, ingredientId, customIngredientData(parsed));

    if (!updated) {
      status = "denied";
    }
  } catch {
    status = "invalid";
  }

  redirectWithStatus(status);
}

export async function deleteCustomIngredientAction(formData: FormData) {
  const user = await requireUser();
  const ingredientId = formString(formData, "ingredientId");

  if (!ingredientId) {
    redirectWithStatus("denied");
  }

  const deleted = await deleteCustomIngredient(user.id, ingredientId);
  redirectWithStatus(deleted.count === 0 ? ("reason" in deleted && deleted.reason ? "in-use" : "denied") : "deleted");
}


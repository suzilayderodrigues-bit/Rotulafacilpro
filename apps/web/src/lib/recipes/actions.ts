"use server";

import { redirect } from "next/navigation";
import { labelPreviewHref, resolveLabelFormat, resolveLabelTemplate } from "@/lib/final-label/visual";
import { type IngredientBaseUnit, type RecipePhysicalState } from "@rotula-facil-pro/db";
import { requireUser } from "@/lib/auth/session";
import { RecipeValidationError } from "./domain";
import { addRecipeIngredient, createRecipe, deleteRecipe, removeRecipeIngredient, updateRecipe, updateRecipeIngredient, updateRecipeInformation, updateRecipePackaging, updateRecipeYield, updateRecipeProductSetup } from "./repository";

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

function informationErrorParam(error: unknown) {
  if (error instanceof RecipeValidationError) {
    if (error.code === "missing-review-confirmation") return "revisao";
    if (error.code === "invalid-regulatory-category") return "informacoes";
    if (error.code === "invalid-packaging-condition") return "informacoes";
    if (error.code === "invalid-main-panel-dimensions") return "painel-principal";
    if (error.code === "invalid-nutrient-addition-status") return "adicoes-nutrientes";
    if (error.code === "invalid-information") return "informacoes";
    if (error.code === "recipe-not-found") return "receita";
  }

  return "formulario";
}

function yieldErrorParam(error: unknown) {
  if (error instanceof RecipeValidationError) {
    if (error.code === "invalid-final-yield") return "rendimento";
    if (error.code === "invalid-units-produced") return "unidades";
    if (error.code === "invalid-unit-weight") return "peso-unidade";
    if (error.code === "inconsistent-yield") return "incoerente";
    if (error.code === "recipe-has-no-ingredients") return "sem-ingredientes";
    if (error.code === "recipe-not-found") return "receita";
  }

  return "formulario";
}

function packagingErrorParam(error: unknown) {
  if (error instanceof RecipeValidationError) {
    if (error.code === "invalid-net-quantity") return "quantidade-liquida";
    if (error.code === "invalid-serving-size") return "porcao";
    if (error.code === "invalid-household-measure") return "medida-caseira";
    if (error.code === "invalid-yield-unit") return "unidade";
    if (error.code === "recipe-not-found") return "receita";
  }

  return "formulario";
}

function recipeIngredientsHref(recipeId: string, status?: string) {
  return status ? "/receitas/" + recipeId + "/ingredientes?status=" + status : "/receitas/" + recipeId + "/ingredientes";
}

function recipeYieldHref(recipeId: string, status?: string) {
  return status ? "/receitas/" + recipeId + "/rendimento?status=" + status : "/receitas/" + recipeId + "/rendimento";
}

function recipeSummaryHref(recipeId: string, status?: string) {
  return status ? "/receitas/" + recipeId + "?status=" + status : "/receitas/" + recipeId;
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

export async function updateRecipeProductAction(formData: FormData) {
  const user = await requireUser();
  const recipeId = formString(formData, "recipeId");
  const physicalState = recipeType(formString(formData, "physicalState"));
  const composition = formString(formData, "productContext") === "composition";
  const failureHref = (error: string) => composition ? recipeIngredientsHref(recipeId, `produto-${error}`) : `/receitas/${recipeId}/editar?erro=${error}`;
  if (!recipeId || !physicalState) redirect(failureHref("tipo"));

  let updated = false;
  try {
    updated = Boolean(await updateRecipe(user.id, recipeId, {
      name: formString(formData, "name"),
      foodCategory: formString(formData, "foodCategory"),
      physicalState,
      finalYieldUnit: finalYieldUnitForType(physicalState)
    }));
  } catch (error) {
    redirect(failureHref(productErrorParam(error)));
  }
  if (!updated) redirect("/receitas?erro=receita");
  redirect(recipeIngredientsHref(recipeId, composition ? "produto-salvo" : undefined));
}

export async function updateRecipeProductSetupAction(formData: FormData) {
  const user = await requireUser();
  const recipeId = formString(formData, "recipeId");
  if (!recipeId) redirect("/receitas?erro=formulario");
  const netQuantityUnit = ingredientUnit(formString(formData, "netQuantityUnit"));
  const servingUnit = ingredientUnit(formString(formData, "servingUnit"));
  if (!netQuantityUnit || !servingUnit) redirect(recipeYieldHref(recipeId, "embalagem-unidade"));
  try {
    await updateRecipeProductSetup(user.id, recipeId, {
      yieldMode: formString(formData, "yieldMode"),
      finalYieldAmount: formString(formData, "finalYieldAmount"),
      unitsProduced: formString(formData, "unitsProduced"),
      unitWeight: formString(formData, "unitWeight")
    }, {
      netQuantity: formString(formData, "netQuantity"), netQuantityUnit,
      servingSize: formString(formData, "servingSize"), servingUnit,
      householdMeasure: formString(formData, "householdMeasure")
    });
  } catch (error) {
    const packagingCode = packagingErrorParam(error);
    const status = packagingCode !== "formulario" ? `embalagem-${packagingCode}` : yieldErrorParam(error);
    redirect(recipeYieldHref(recipeId, status));
  }
  redirect("/rotulo-final?recipeId=" + encodeURIComponent(recipeId));
}

export async function updateRecipeIngredientAction(formData: FormData) {
  const user = await requireUser();
  const recipeId = formString(formData, "recipeId");
  const recipeIngredientId = formString(formData, "recipeIngredientId");
  const unit = ingredientUnit(formString(formData, "unit"));
  if (!recipeId || !recipeIngredientId || !unit) redirect(recipeIngredientsHref(recipeId, "formulario"));
  let updated = false;
  try {
    updated = Boolean(await updateRecipeIngredient(user.id, recipeIngredientId, {
      amount: formString(formData, "amount"), unit
    }));
  } catch (error) {
    redirect(recipeIngredientsHref(recipeId, ingredientErrorParam(error)));
  }
  if (!updated) redirect(recipeIngredientsHref(recipeId, "ingrediente"));
  redirect(recipeIngredientsHref(recipeId, "atualizado"));
}

export async function deleteRecipeAction(formData: FormData) {
  const user = await requireUser();
  const recipeId = formString(formData, "recipeId");
  if (!recipeId) redirect("/receitas?erro=receita");
  const result = await deleteRecipe(user.id, recipeId);
  redirect(result.count === 1 ? "/receitas?status=excluida" : "/receitas?erro=receita");
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

export async function updateRecipeYieldAction(formData: FormData) {
  const user = await requireUser();
  const recipeId = formString(formData, "recipeId");

  if (!recipeId) {
    redirect("/receitas?erro=formulario");
  }

  try {
    await updateRecipeYield(user.id, recipeId, {
      yieldMode: formString(formData, "yieldMode"),
      finalYieldAmount: formString(formData, "finalYieldAmount"),
      unitsProduced: formString(formData, "unitsProduced"),
      unitWeight: formString(formData, "unitWeight")
    });
  } catch (error) {
    redirect(recipeYieldHref(recipeId, yieldErrorParam(error)));
  }

  redirect("/receitas/" + recipeId + "/informacoes");
}

export async function updateRecipeInformationAction(formData: FormData) {
  const user = await requireUser();
  const recipeId = formString(formData, "recipeId");
  const selectedAllergens = formData.getAll("confirmedAllergens").filter((value): value is string => typeof value === "string");

  if (!recipeId) {
    redirect("/receitas?erro=formulario");
  }

  try {
    await updateRecipeInformation(user.id, recipeId, {
      regulatoryCategory: formString(formData, "regulatoryCategory"),
      packagingCondition: formString(formData, "packagingCondition"),
      mainPanelWidthCm: formString(formData, "mainPanelWidthCm"),
      mainPanelHeightCm: formString(formData, "mainPanelHeightCm"),
      addedSugarsAddition: formString(formData, "addedSugarsAddition"),
      saturatedFatAddition: formString(formData, "saturatedFatAddition"),
      sodiumAddition: formString(formData, "sodiumAddition"),
      confirmedAllergens: selectedAllergens,
      additionalAllergens: formString(formData, "additionalAllergens"),
      glutenStatus: formString(formData, "glutenStatus"),
      lactoseStatus: formString(formData, "lactoseStatus"),
      crossContaminationRisk: formString(formData, "crossContaminationRisk"),
      crossContaminationAllergens: formString(formData, "crossContaminationAllergens"),
      reviewed: formString(formData, "reviewed")
    });
  } catch (error) {
    redirect("/receitas/" + recipeId + "/informacoes?status=" + informationErrorParam(error) + (formString(formData, "returnTo") === "label" ? "&" + new URLSearchParams({ returnTo: "label", format: resolveLabelFormat(formString(formData, "format")), template: resolveLabelTemplate(formString(formData, "template")) }) : ""));
  }

  if (formString(formData, "returnTo") === "label") redirect(labelPreviewHref(recipeId, resolveLabelFormat(formString(formData, "format")), resolveLabelTemplate(formString(formData, "template"))));
  redirect("/receitas/" + recipeId);
}

export async function updateRecipePackagingAction(formData: FormData) {
  const user = await requireUser();
  const recipeId = formString(formData, "recipeId");
  const netQuantityUnit = ingredientUnit(formString(formData, "netQuantityUnit"));
  const servingUnit = ingredientUnit(formString(formData, "servingUnit"));

  if (!recipeId || !netQuantityUnit || !servingUnit) {
    redirect(recipeSummaryHref(recipeId || "", "embalagem-formulario"));
  }

  try {
    await updateRecipePackaging(user.id, recipeId, {
      netQuantity: formString(formData, "netQuantity"),
      netQuantityUnit,
      servingSize: formString(formData, "servingSize"),
      servingUnit,
      householdMeasure: formString(formData, "householdMeasure")
    });
  } catch (error) {
    redirect(recipeSummaryHref(recipeId, "embalagem-" + packagingErrorParam(error)));
  }

  redirect(recipeSummaryHref(recipeId, "embalagem-salva"));
}

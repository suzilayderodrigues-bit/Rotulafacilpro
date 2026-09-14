"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { BarcodeValidationError } from "./domain";
import { BarcodeEntitlementError } from "./commercial";
import { associateBarcodeWithRecipe, createInternalBarcode, createOfficialGtinBarcode, deleteBarcode, findBarcodeByRecipe } from "./repository";

const pagePath = "/codigo-de-barras";

function isDuplicate(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function entitlementStatus(error: BarcodeEntitlementError) {
  const statuses: Record<BarcodeEntitlementError["code"], string> = {
    FREE_LIMIT_REACHED: "limite-gratis",
    MONTHLY_LIMIT_REACHED: "limite-mensal",
    MISSING_BILLING_CYCLE: "ciclo-indisponivel",
    SUBSCRIPTION_REQUIRES_REVIEW: "plano-revisao",
    RECIPE_NOT_FOUND: "receita-nao-encontrada"
  };
  return statuses[error.code];
}

function recipeIdFromForm(formData: FormData) {
  const value = formData.get("recipeId");
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function duplicateStatus(userId: string, recipeId: string | null) {
  return recipeId && await findBarcodeByRecipe(userId, recipeId) ? "receita-ocupada" : "duplicado";
}

export async function createOfficialBarcodeAction(formData: FormData) {
  const user = await requireUser();
  const rawValue = formData.get("gtin");
  const value = typeof rawValue === "string" ? rawValue : "";
  const recipeId = recipeIdFromForm(formData);
  let status = "erro";

  try {
    await createOfficialGtinBarcode(user.id, value, recipeId);
    status = "oficial-criado";
  } catch (error) {
    if (error instanceof BarcodeValidationError) {
      status = error.code === "invalid-length" ? "comprimento" : error.code === "invalid-check-digit" ? "digito" : "gtin-invalido";
    } else if (error instanceof BarcodeEntitlementError) {
      status = entitlementStatus(error);
    } else if (isDuplicate(error)) {
      status = await duplicateStatus(user.id, recipeId);
    }
  }

  redirect(`${pagePath}?status=${status}`);
}

export async function createInternalBarcodeAction(formData: FormData) {
  const user = await requireUser();
  const recipeId = recipeIdFromForm(formData);
  let status = "erro";

  try {
    await createInternalBarcode(user.id, recipeId);
    status = "interno-criado";
  } catch (error) {
    if (error instanceof BarcodeEntitlementError) status = entitlementStatus(error);
    else if (isDuplicate(error)) status = await duplicateStatus(user.id, recipeId);
  }

  redirect(`${pagePath}?status=${status}`);
}

export async function associateBarcodeAction(formData: FormData) {
  const user = await requireUser();
  const barcodeId = formData.get("barcodeId");
  const recipeId = recipeIdFromForm(formData);
  if (typeof barcodeId !== "string" || !barcodeId) redirect(`${pagePath}?status=nao-encontrado`);

  let status = "erro";
  try {
    const result = await associateBarcodeWithRecipe(user.id, barcodeId, recipeId);
    status = result ? recipeId ? "associado" : "desassociado" : "receita-nao-encontrada";
  } catch (error) {
    if (isDuplicate(error)) status = "receita-ocupada";
  }
  redirect(`${pagePath}?status=${status}`);
}

export async function deleteBarcodeAction(formData: FormData) {
  const user = await requireUser();
  const rawId = formData.get("barcodeId");
  if (typeof rawId !== "string" || !rawId) redirect(`${pagePath}?status=erro`);

  const result = await deleteBarcode(user.id, rawId);
  redirect(`${pagePath}?status=${result.count === 1 ? "excluido" : "nao-encontrado"}`);
}

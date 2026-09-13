"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { BarcodeValidationError } from "./domain";
import { createInternalBarcode, createOfficialGtinBarcode, deleteBarcode } from "./repository";

const pagePath = "/codigo-de-barras";

function isDuplicate(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function createOfficialBarcodeAction(formData: FormData) {
  const user = await requireUser();
  const rawValue = formData.get("gtin");
  const value = typeof rawValue === "string" ? rawValue : "";
  let status = "erro";

  try {
    await createOfficialGtinBarcode(user.id, value);
    status = "oficial-criado";
  } catch (error) {
    if (error instanceof BarcodeValidationError) {
      status = error.code === "invalid-length" ? "comprimento" : error.code === "invalid-check-digit" ? "digito" : "gtin-invalido";
    } else if (isDuplicate(error)) {
      status = "duplicado";
    }
  }

  redirect(`${pagePath}?status=${status}`);
}

export async function createInternalBarcodeAction() {
  const user = await requireUser();
  let status = "erro";

  try {
    await createInternalBarcode(user.id);
    status = "interno-criado";
  } catch {
    // A interface exibe uma mensagem genérica sem revelar detalhes de persistência.
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

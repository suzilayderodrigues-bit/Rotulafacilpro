import { prisma } from "@rotula-facil-pro/db";
import {
  assertBarcodeRecipeOwnership,
  createInternalBarcodeDraft,
  validateOfficialGtin
} from "./domain";
import { createBarcodeWithEntitlement } from "./commercial";

export function listBarcodes(userId: string) {
  return prisma.barcode.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
}

export function findBarcode(userId: string, barcodeId: string) {
  return prisma.barcode.findFirst({ where: { id: barcodeId, userId } });
}

export function findBarcodeByRecipe(userId: string, recipeId: string) {
  return prisma.barcode.findFirst({ where: { userId, recipeId } });
}

export async function createOfficialGtinBarcode(userId: string, input: string, recipeId: string | null = null) {
  const barcode = validateOfficialGtin(input);
  return createBarcodeWithEntitlement(userId, barcode, recipeId);
}

export async function createInternalBarcode(userId: string, recipeId: string | null = null) {
  const barcode = createInternalBarcodeDraft();
  return createBarcodeWithEntitlement(userId, barcode, recipeId);
}

export async function updateOfficialGtinBarcode(userId: string, barcodeId: string, input: string) {
  const current = await findBarcode(userId, barcodeId);
  if (!current || current.type !== "OFFICIAL_GTIN") return null;

  const barcode = validateOfficialGtin(input);
  return prisma.barcode.update({ where: { id: current.id }, data: barcode });
}

export async function associateBarcodeWithRecipe(userId: string, barcodeId: string, recipeId: string | null) {
  const barcode = await findBarcode(userId, barcodeId);
  if (!barcode) return null;

  if (recipeId === null) {
    return prisma.barcode.update({ where: { id: barcode.id, userId }, data: { recipeId: null } });
  }

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, userId },
    select: { id: true, userId: true }
  });

  if (!recipe) return null;
  assertBarcodeRecipeOwnership(userId, barcode.userId, recipe.userId);

  return prisma.barcode.update({ where: { id: barcode.id, userId }, data: { recipeId: recipe.id } });
}

export function deleteBarcode(userId: string, barcodeId: string) {
  return prisma.barcode.deleteMany({ where: { id: barcodeId, userId } });
}

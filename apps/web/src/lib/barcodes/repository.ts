import { prisma } from "@rotula-facil-pro/db";
import {
  assertBarcodeRecipeOwnership,
  createInternalBarcodeDraft,
  validateOfficialGtin
} from "./domain";

export function listBarcodes(userId: string) {
  return prisma.barcode.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
}

export function findBarcode(userId: string, barcodeId: string) {
  return prisma.barcode.findFirst({ where: { id: barcodeId, userId } });
}

export function createOfficialGtinBarcode(userId: string, input: string) {
  const barcode = validateOfficialGtin(input);
  return prisma.barcode.create({ data: { userId, ...barcode } });
}

export function createInternalBarcode(userId: string) {
  const barcode = createInternalBarcodeDraft();
  return prisma.barcode.create({ data: { userId, ...barcode } });
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
    return prisma.barcode.update({ where: { id: barcode.id }, data: { recipeId: null } });
  }

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, userId },
    select: { id: true, userId: true }
  });

  if (!recipe) return null;
  assertBarcodeRecipeOwnership(userId, barcode.userId, recipe.userId);

  return prisma.barcode.update({ where: { id: barcode.id }, data: { recipeId: recipe.id } });
}

export function deleteBarcode(userId: string, barcodeId: string) {
  return prisma.barcode.deleteMany({ where: { id: barcodeId, userId } });
}

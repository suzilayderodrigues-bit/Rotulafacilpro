import { prisma, type Prisma } from "@rotula-facil-pro/db";

const accessibleIngredientWhere = (userId: string): Prisma.IngredientWhereInput => ({
  OR: [
    { source: "BASE_ROTULA" },
    {
      source: "CUSTOM",
      userId
    }
  ]
});

export type CreateCustomIngredientInput = Omit<
  Prisma.IngredientUncheckedCreateInput,
  "id" | "source" | "userId" | "createdAt" | "updatedAt"
>;

export type UpdateCustomIngredientInput = Omit<
  Prisma.IngredientUncheckedUpdateInput,
  "id" | "source" | "userId" | "createdAt" | "updatedAt"
>;

export function listAccessibleIngredients(userId: string) {
  return prisma.ingredient.findMany({
    where: accessibleIngredientWhere(userId),
    orderBy: {
      name: "asc"
    }
  });
}

export function findAccessibleIngredient(userId: string, ingredientId: string) {
  return prisma.ingredient.findFirst({
    where: {
      id: ingredientId,
      ...accessibleIngredientWhere(userId)
    }
  });
}

export function createCustomIngredient(userId: string, data: CreateCustomIngredientInput) {
  return prisma.ingredient.create({
    data: {
      ...data,
      source: "CUSTOM",
      userId
    }
  });
}

export async function updateCustomIngredient(
  userId: string,
  ingredientId: string,
  data: UpdateCustomIngredientInput
) {
  const result = await prisma.ingredient.updateMany({
    where: {
      id: ingredientId,
      source: "CUSTOM",
      userId
    },
    data
  });

  if (result.count === 0) {
    return null;
  }

  return prisma.ingredient.findFirst({
    where: {
      id: ingredientId,
      source: "CUSTOM",
      userId
    }
  });
}

export function deleteCustomIngredient(userId: string, ingredientId: string) {
  return prisma.ingredient.deleteMany({
    where: {
      id: ingredientId,
      source: "CUSTOM",
      userId
    }
  });
}

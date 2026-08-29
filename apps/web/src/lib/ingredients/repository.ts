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

const baseRotulaIngredientWhere = ({
  search,
  category
}: {
  search?: string;
  category?: string;
} = {}): Prisma.IngredientWhereInput => ({
  source: "BASE_ROTULA",
  ...(category ? { category } : {}),
  ...(search
    ? {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive"
            }
          },
          {
            normalizedName: {
              contains: search.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
              mode: "insensitive"
            }
          }
        ]
      }
    : {})
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

export function listBaseRotulaIngredients(filters?: { search?: string; category?: string }) {
  return prisma.ingredient.findMany({
    where: baseRotulaIngredientWhere(filters),
    orderBy: {
      name: "asc"
    }
  });
}

export function findBaseRotulaIngredient(ingredientId: string) {
  return prisma.ingredient.findFirst({
    where: {
      id: ingredientId,
      source: "BASE_ROTULA"
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

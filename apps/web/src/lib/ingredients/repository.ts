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

const normalizeSearch = (search: string) =>
  search
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const ingredientTextSearchWhere = (search?: string): Prisma.IngredientWhereInput => {
  if (!search) return {};
  // The Marilan spelling and the common ingredient spelling refer to the same search term.
  const terms = [...new Set([search, search.replace(/\bmai[sz]ena\b/gi, word => /s/i.test(word) ? "maizena" : "maisena")])];
  return {
    OR: terms.flatMap(term => [
      { name: { contains: term, mode: "insensitive" as const } },
      { normalizedName: { contains: normalizeSearch(term), mode: "insensitive" as const } }
    ])
  };
};

const baseRotulaIngredientWhere = ({
  search,
  category
}: {
  search?: string;
  category?: string;
} = {}): Prisma.IngredientWhereInput => ({
  source: "BASE_ROTULA",
  ...(category ? { category } : {}),
  ...ingredientTextSearchWhere(search)
});

const customIngredientWhere = (
  userId: string,
  {
    search,
    category
  }: {
    search?: string;
    category?: string;
  } = {}
): Prisma.IngredientWhereInput => ({
  source: "CUSTOM",
  userId,
  ...(category ? { category } : {}),
  ...ingredientTextSearchWhere(search)
});

export type CreateCustomIngredientInput = Omit<
  Prisma.IngredientUncheckedCreateInput,
  "id" | "source" | "userId" | "createdAt" | "updatedAt"
>;

export type UpdateCustomIngredientInput = Omit<
  Prisma.IngredientUncheckedUpdateInput,
  "id" | "source" | "userId" | "createdAt" | "updatedAt"
>;

export function listAccessibleIngredients(userId: string, filters?: { search?: string }) {
  const accessWhere = accessibleIngredientWhere(userId);
  const searchWhere = ingredientTextSearchWhere(filters?.search);

  return prisma.ingredient.findMany({
    where: filters?.search
      ? {
          AND: [accessWhere, searchWhere]
        }
      : accessWhere,
    orderBy: {
      name: "asc"
    }
  });
}

/** Compact selector: bounded projection, no nutrient/owner data sent to the browser. */
export async function searchAccessibleIngredients(userId: string, search: string, page: number) {
  const pageSize = 20;
  const rows = await prisma.ingredient.findMany({
    where: { AND: [accessibleIngredientWhere(userId), ingredientTextSearchWhere(search)] },
    select: { id: true, name: true, category: true, source: true, baseUnit: true },
    orderBy: [{ normalizedName: "asc" }, { name: "asc" }, { id: "asc" }],
    skip: page * pageSize,
    take: pageSize + 1
  });
  return { items: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

export function listBaseRotulaIngredients(filters?: { search?: string; category?: string }) {
  return prisma.ingredient.findMany({
    where: baseRotulaIngredientWhere(filters),
    orderBy: {
      name: "asc"
    }
  });
}

export async function listIngredientPage(userId: string, tab: "base" | "meus", search: string | undefined, category: string | undefined, page: number) {
  const pageSize = 30;
  const rows = await prisma.ingredient.findMany({
    where: tab === "base" ? baseRotulaIngredientWhere({ search, category }) : customIngredientWhere(userId, { search, category }),
    orderBy: [{ normalizedName: "asc" }, { name: "asc" }, { id: "asc" }],
    skip: page * pageSize,
    take: pageSize + 1
  });
  return { items: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

export function listCustomIngredients(
  userId: string,
  filters?: { search?: string; category?: string }
) {
  return prisma.ingredient.findMany({
    where: customIngredientWhere(userId, filters),
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

export function findCustomIngredient(userId: string, ingredientId: string) {
  return prisma.ingredient.findFirst({
    where: {
      id: ingredientId,
      source: "CUSTOM",
      userId
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

export async function deleteCustomIngredient(userId: string, ingredientId: string) {
  const usageCount = await prisma.recipeIngredient.count({
    where: {
      ingredientId,
      ingredient: {
        source: "CUSTOM",
        userId
      }
    }
  });

  if (usageCount > 0) {
    return {
      count: 0,
      reason: "Este ingrediente está sendo usado em uma receita e não pode ser excluído."
    };
  }

  return prisma.ingredient.deleteMany({
    where: {
      id: ingredientId,
      source: "CUSTOM",
      userId
    }
  });
}




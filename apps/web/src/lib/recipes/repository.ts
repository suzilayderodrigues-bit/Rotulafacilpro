import { prisma, type Prisma } from "@rotula-facil-pro/db";
import { findAccessibleIngredient } from "@/lib/ingredients/repository";
import {
  assertMatchingIngredientUnit,
  RecipeValidationError,
  validateRecipeIngredientInput,
  validateRecipeInformationInput,
  validateRecipePackagingInput,
  validateRecipeInput,
  validateRecipeYieldInput,
  type RecipeInformationInput,
  type RecipePackagingInput,
  type RecipeIngredientInput,
  type RecipeInput,
  type RecipeYieldInput
} from "./domain";

export type CreateRecipeInput = RecipeInput;
export type UpdateRecipeInput = Partial<RecipeInput>;

const recipeInclude = {
  ingredients: {
    orderBy: {
      createdAt: "asc"
    },
    include: {
      ingredient: true
    }
  }
} satisfies Prisma.RecipeInclude;

export function listRecipes(userId: string) {
  return prisma.recipe.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          ingredients: true
        }
      }
    }
  });
}

export function findRecipe(userId: string, recipeId: string) {
  return prisma.recipe.findFirst({
    where: {
      id: recipeId,
      userId
    },
    include: recipeInclude
  });
}


export function findRecipeForNutrition(userId: string, recipeId: string) {
  return prisma.recipe.findFirst({
    where: {
      id: recipeId,
      userId
    },
    include: recipeInclude
  });
}
export function createRecipe(userId: string, input: CreateRecipeInput) {
  const data = validateRecipeInput(input);

  return prisma.recipe.create({
    data: {
      ...data,
      userId
    }
  });
}

export async function updateRecipe(userId: string, recipeId: string, input: UpdateRecipeInput) {
  const current = await prisma.recipe.findFirst({
    where: {
      id: recipeId,
      userId
    }
  });

  if (!current) {
    return null;
  }

  const data = validateRecipeInput({
    name: input.name ?? current.name,
    foodCategory: input.foodCategory === undefined ? current.foodCategory : input.foodCategory,
    physicalState: input.physicalState ?? current.physicalState,
    finalYieldAmount:
      input.finalYieldAmount === undefined ? current.finalYieldAmount?.toString() : input.finalYieldAmount,
    finalYieldUnit: input.finalYieldUnit ?? current.finalYieldUnit,
    unitsProduced: input.unitsProduced === undefined ? current.unitsProduced : input.unitsProduced,
    unitWeight: input.unitWeight === undefined ? current.unitWeight?.toString() : input.unitWeight
  });

  return prisma.recipe.update({
    where: { id: current.id },
    data: input.physicalState && input.physicalState !== current.physicalState
      ? {
          ...data,
          finalYieldAmount: null,
          unitsProduced: null,
          unitWeight: null,
          netQuantity: null,
          netQuantityUnit: null,
          servingSize: null,
          servingUnit: null,
          householdMeasure: null,
          servingsPerPackage: null,
          isIndividualPackage: false
        }
      : data
  });
}

export async function updateRecipeYield(userId: string, recipeId: string, input: RecipeYieldInput) {
  const current = await prisma.recipe.findFirst({
    where: {
      id: recipeId,
      userId
    },
    include: {
      _count: {
        select: {
          ingredients: true
        }
      }
    }
  });

  if (!current) {
    throw new RecipeValidationError("recipe-not-found");
  }

  if (current._count.ingredients === 0) {
    throw new RecipeValidationError("recipe-has-no-ingredients");
  }

  const data = validateRecipeYieldInput(input);

  return prisma.recipe.update({
    where: { id: current.id },
    data: {
      ...data,
      finalYieldUnit: current.physicalState === "LIQUID" ? "MILLILITER" : "GRAM"
    }
  });
}

export async function updateRecipeInformation(userId: string, recipeId: string, input: RecipeInformationInput) {
  const current = await prisma.recipe.findFirst({
    where: {
      id: recipeId,
      userId
    }
  });

  if (!current) {
    throw new RecipeValidationError("recipe-not-found");
  }

  const data = validateRecipeInformationInput(input);

  return prisma.recipe.update({
    where: { id: current.id },
    data
  });
}

export async function updateRecipePackaging(userId: string, recipeId: string, input: RecipePackagingInput) {
  const current = await prisma.recipe.findFirst({
    where: {
      id: recipeId,
      userId
    },
    select: {
      id: true,
      physicalState: true
    }
  });

  if (!current) {
    throw new RecipeValidationError("recipe-not-found");
  }

  const data = validateRecipePackagingInput(input, current.physicalState);

  return prisma.recipe.update({
    where: { id: current.id },
    data
  });
}
export function deleteRecipe(userId: string, recipeId: string) {
  return prisma.recipe.deleteMany({
    where: {
      id: recipeId,
      userId
    }
  });
}

export function listRecipeIngredients(userId: string, recipeId: string) {
  return prisma.recipeIngredient.findMany({
    where: {
      recipeId,
      recipe: {
        userId
      }
    },
    orderBy: { createdAt: "asc" },
    include: {
      ingredient: true
    }
  });
}

export async function addRecipeIngredient(
  userId: string,
  recipeId: string,
  input: RecipeIngredientInput
) {
  const data = validateRecipeIngredientInput(input);
  const recipe = await prisma.recipe.findFirst({
    where: {
      id: recipeId,
      userId
    }
  });

  if (!recipe) {
    throw new RecipeValidationError("recipe-not-found");
  }

  const ingredient = await findAccessibleIngredient(userId, data.ingredientId);

  if (!ingredient) {
    throw new RecipeValidationError("ingredient-not-found");
  }

  const existingIngredient = await prisma.recipeIngredient.findUnique({
    where: {
      recipeId_ingredientId: {
        recipeId: recipe.id,
        ingredientId: ingredient.id
      }
    }
  });

  if (existingIngredient) {
    throw new RecipeValidationError("duplicate-ingredient");
  }

  assertMatchingIngredientUnit(ingredient.baseUnit, data.unit);

  return prisma.recipeIngredient.create({
    data: {
      recipeId: recipe.id,
      ingredientId: ingredient.id,
      amount: data.amount,
      unit: data.unit
    }
  });
}

export async function updateRecipeIngredient(
  userId: string,
  recipeIngredientId: string,
  input: Omit<RecipeIngredientInput, "ingredientId">
) {
  const current = await prisma.recipeIngredient.findFirst({
    where: {
      id: recipeIngredientId,
      recipe: {
        userId
      }
    },
    include: {
      ingredient: true
    }
  });

  if (!current) {
    return null;
  }

  const data = validateRecipeIngredientInput({
    ingredientId: current.ingredientId,
    amount: input.amount,
    unit: input.unit
  });

  assertMatchingIngredientUnit(current.ingredient.baseUnit, data.unit);

  return prisma.recipeIngredient.update({
    where: { id: current.id },
    data: {
      amount: data.amount,
      unit: data.unit
    }
  });
}

export function removeRecipeIngredient(userId: string, recipeIngredientId: string) {
  return prisma.recipeIngredient.deleteMany({
    where: {
      id: recipeIngredientId,
      recipe: {
        userId
      }
    }
  });
}



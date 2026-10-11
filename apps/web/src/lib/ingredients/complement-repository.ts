import { prisma } from "@rotula-facil-pro/db";
import { buildIngredientComplement, IngredientComplementError } from "./complement";

export async function completeRecipeIngredient(userId: string, recipeId: string, itemId: string, expectedIngredientId: string, form: FormData) {
  return prisma.$transaction(async tx => {
    const item = await tx.recipeIngredient.findFirst({
      where: { id: itemId, recipeId, recipe: { userId } }, include: { ingredient: true }
    });
    if (!item || (item.ingredient.source !== "BASE_ROTULA" && item.ingredient.userId !== userId)) throw new IngredientComplementError("denied");
    if (item.ingredientId !== expectedIngredientId) throw new IngredientComplementError("stale");
    const { data, declarationsChanged } = buildIngredientComplement(item.ingredient, form);
    const copy = await tx.ingredient.create({ data: { ...data, source: "CUSTOM", userId } });
    // Compare-and-swap: a repeated/concurrent submission cannot leave a second copy behind.
    const replaced = await tx.recipeIngredient.updateMany({
      where: { id: item.id, recipeId, ingredientId: expectedIngredientId, recipe: { userId } },
      data: { ingredientId: copy.id }
    });
    if (replaced.count !== 1) throw new IngredientComplementError("stale");
    if (declarationsChanged) {
      // Preserve answers but require reconfirmation of the selected product after its source declarations change.
      const reviewed = await tx.recipe.updateMany({ where: { id: recipeId, userId }, data: { informationReviewedAt: null } });
      if (reviewed.count !== 1) throw new IngredientComplementError("denied");
    }
    return copy.id;
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 15000 });
}

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "@rotula-facil-pro/db";
import { BarcodeEntitlementError } from "../src/lib/barcodes/commercial";
import { createInternalBarcode } from "../src/lib/barcodes/repository";
import { calculateRecipeNutrition } from "../src/lib/nutrition";
import { addRecipeIngredient, createRecipe, deleteRecipe, findRecipe, findRecipeForNutrition, updateRecipe, updateRecipeIngredient, updateRecipeYield } from "../src/lib/recipes/repository";

const marker = `recipe-cycle-smoke-${randomUUID()}`;
const userIds: string[] = [];

async function counts() {
  return Promise.all([prisma.user.count(), prisma.recipe.count(), prisma.barcode.count(), prisma.barcodeUsage.count(), prisma.ingredient.count()]);
}

async function user(label: string) {
  const value = await prisma.user.create({ data: { name: label, email: `${marker}-${label}@example.invalid`, passwordHash: marker } });
  userIds.push(value.id);
  return value.id;
}

async function main() {
  const before = await counts();
  try {
    const owner = await user("owner");
    const other = await user("other");
    const ingredient = await prisma.ingredient.findFirst({ where: { source: "BASE_ROTULA", baseUnit: "GRAM" } });
    assert(ingredient, "Base Rotula sem ingrediente em gramas");
    const recipe = await createRecipe(owner, { name: `${marker}-initial`, foodCategory: "Teste", physicalState: "SOLID_OR_SEMISOLID", finalYieldUnit: "GRAM" });
    assert.equal((await prisma.recipe.findMany({ where: { userId: owner } })).length, 1);
    assert.equal((await findRecipe(owner, recipe.id))?.name, `${marker}-initial`);
    assert.equal(await findRecipe(other, recipe.id), null);
    assert.equal(await updateRecipe(other, recipe.id, { name: "forbidden" }), null);
    assert.equal((await deleteRecipe(other, recipe.id)).count, 0);

    const line = await addRecipeIngredient(owner, recipe.id, { ingredientId: ingredient.id, amount: 100, unit: "GRAM" });
    await updateRecipeYield(owner, recipe.id, { finalYieldAmount: 200 });
    const original = calculateRecipeNutrition((await findRecipeForNutrition(owner, recipe.id))!);
    await updateRecipeIngredient(owner, line.id, { amount: 150, unit: "GRAM" });
    const updated = await updateRecipe(owner, recipe.id, { name: `${marker}-updated` });
    assert.equal(updated?.id, recipe.id);
    assert.equal((await prisma.recipe.findMany({ where: { userId: owner } })).length, 1);
    assert.equal((await findRecipe(owner, recipe.id))?.ingredients[0]?.amount.toNumber(), 150);
    const recalculated = calculateRecipeNutrition((await findRecipeForNutrition(owner, recipe.id))!);
    assert.notDeepEqual(recalculated, original);

    const barcode = await createInternalBarcode(owner, recipe.id);
    const usage = await prisma.barcodeUsage.findFirst({ where: { barcodeId: barcode.id } });
    assert(usage);
    assert.equal((await deleteRecipe(owner, recipe.id)).count, 1);
    assert.equal(await findRecipe(owner, recipe.id), null);
    assert.equal((await prisma.barcode.findUnique({ where: { id: barcode.id } }))?.recipeId, null);
    assert.equal((await prisma.barcodeUsage.findUnique({ where: { id: usage.id } }))?.barcodeId, barcode.id);
    assert.equal(await prisma.barcodeUsage.count({ where: { userId: owner } }), 1);
    await assert.rejects(() => createInternalBarcode(owner), (error: unknown) =>
      error instanceof BarcodeEntitlementError && error.code === "FREE_LIMIT_REACHED"
    );
    console.log("Receita: criação, leitura, edição sem duplicação, recálculo, exclusão, isolamento e barcode/usage preservados: OK.");
  } finally {
    if (userIds.length) {
      await prisma.barcodeUsage.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.barcode.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.recipe.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds }, email: { startsWith: marker } } });
    }
    assert.equal(await prisma.user.count({ where: { email: { startsWith: marker } } }), 0);
    assert.deepEqual(await counts(), before);
    console.log("Limpeza: zero dados temporários; contagens preservadas.");
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

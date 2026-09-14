import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "@rotula-facil-pro/db";
import { buildFinalLabelPreview, composeFinalLabelPreview } from "../src/lib/final-label/preview";
import { findRecipeForNutrition, listRecipes } from "../src/lib/recipes/repository";

const marker = `final-label-smoke-${randomUUID()}`;
const userIds: string[] = [];
const ingredientIds: string[] = [];
const applicable = { regulatoryCategory: "OUTSIDE_ANNEX_XVI" as const, packagingCondition: "PACKAGED_IN_ABSENCE_OF_CONSUMER" as const, mainPanelAreaCm2: 100 };

async function counts() {
  return Promise.all([prisma.user.count(), prisma.recipe.count(), prisma.barcode.count(), prisma.barcodeUsage.count(), prisma.ingredient.count()]);
}

async function user(label: string) {
  const created = await prisma.user.create({ data: { name: label, email: `${marker}-${label}@example.invalid`, passwordHash: marker } });
  userIds.push(created.id);
  return created.id;
}

async function ingredient(userId: string, name: string, addedSugarsG: number) {
  const created = await prisma.ingredient.create({ data: {
    userId, source: "CUSTOM", name, normalizedName: name.toLowerCase(), category: "Teste", dataOrigin: "SMOKE",
    baseUnit: "GRAM", baseQuantity: 100, caloriesKcal: 150, carbohydratesG: 30, sugarsG: 20,
    addedSugarsG, proteinsG: 3, totalFatG: 2, saturatedFatG: 1, transFatG: 0, fiberG: 1, sodiumMg: 50
  } });
  ingredientIds.push(created.id);
  return created.id;
}

async function main() {
  const before = await counts();
  try {
    const owner = await user("owner");
    const other = await user("other");
    assert.equal((await listRecipes(owner)).length, 0);
    const first = await ingredient(owner, "Ingrediente maior", 20);
    const second = await ingredient(owner, "Ingrediente menor", 20);
    const recipe = await prisma.recipe.create({ data: {
      userId: owner, name: "Produto temporário", foodCategory: "Categoria genérica", physicalState: "SOLID_OR_SEMISOLID",
      finalYieldUnit: "GRAM", finalYieldAmount: 100, netQuantity: 100, netQuantityUnit: "GRAM",
      servingSize: 100, servingUnit: "GRAM", servingsPerPackage: 1, isIndividualPackage: true,
      householdMeasure: "1 embalagem", informationReviewedAt: new Date(), glutenStatus: "DOES_NOT_CONTAIN",
      lactoseStatus: "DOES_NOT_CONTAIN", crossContaminationRisk: "NO"
    } });
    await prisma.recipeIngredient.createMany({ data: [
      { recipeId: recipe.id, ingredientId: second, amount: 20, unit: "GRAM" },
      { recipeId: recipe.id, ingredientId: first, amount: 80, unit: "GRAM" }
    ] });
    assert.equal(await buildFinalLabelPreview(recipe.id, other), null);
    const owned = await buildFinalLabelPreview(recipe.id, owner);
    assert(owned);
    assert.deepEqual(owned.ingredients, ["Ingrediente maior", "Ingrediente menor"]);
    assert.equal(owned.netQuantityLabel, "PESO LÍQUIDO 100 g");
    assert.equal(owned.nutritionTable?.status, "COMPLETE");
    assert(owned.issues.some((issue) => issue.code === "MISSING_BARCODE" && issue.severity === "WARNING"));
    assert(owned.issues.some((issue) => issue.code === "FRONT_LABEL_REQUIRES_REVIEW"));

    const loaded = await findRecipeForNutrition(owner, recipe.id);
    assert(loaded);
    const high = composeFinalLabelPreview(loaded, null, applicable);
    assert.equal(high.frontOfPack?.applicability.status, "APPLICABLE");
    assert.equal(high.frontOfPack?.shouldDisplayOfficialWarning, true);
    assert.equal(high.status, "READY");
    const notApplicable = composeFinalLabelPreview(loaded, null, { regulatoryCategory: "MAMMAL_MILK" });
    assert.equal(notApplicable.frontOfPack?.applicability.status, "NOT_APPLICABLE");
    assert.equal(notApplicable.frontOfPack?.shouldDisplayOfficialWarning, false);
    const internal = await prisma.barcode.create({ data: { userId: owner, recipeId: recipe.id, type: "INTERNAL", format: "INTERNAL", value: `RF-I-${randomUUID()}` } });
    const withBarcode = await buildFinalLabelPreview(recipe.id, owner);
    assert.equal(withBarcode?.barcode?.type, "INTERNAL");
    assert.equal(withBarcode?.barcode?.display.status, "READY");
    assert(!withBarcode?.issues.some((issue) => issue.code === "MISSING_BARCODE"));
    await prisma.ingredient.update({ where: { id: second }, data: { addedSugarsG: null } });
    const incomplete = await buildFinalLabelPreview(recipe.id, owner);
    assert.equal(incomplete?.nutritionTable?.status, "INCOMPLETE");
    assert(incomplete?.issues.some((issue) => issue.code === "INCOMPLETE_NUTRITION"));
    assert(incomplete?.issues.some((issue) => issue.code === "FRONT_LABEL_UNKNOWN"));
    await prisma.recipe.update({ where: { id: recipe.id }, data: { netQuantity: null, netQuantityUnit: null } });
    assert((await buildFinalLabelPreview(recipe.id, owner))?.issues.some((issue) => issue.code === "MISSING_NET_QUANTITY"));
    assert.equal(await prisma.barcodeUsage.count({ where: { userId: owner } }), 0);
    assert.equal((await prisma.barcode.findUnique({ where: { id: internal.id } }))?.recipeId, recipe.id);
    console.log("Rótulo Final: vazio, ownership, ordem, tabela, lupa, barcode, quantidade e issues: OK.");
  } finally {
    if (userIds.length) {
      await prisma.barcode.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.recipe.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.ingredient.deleteMany({ where: { id: { in: ingredientIds }, userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds }, email: { startsWith: marker } } });
    }
    assert.equal(await prisma.user.count({ where: { email: { startsWith: marker } } }), 0);
    assert.deepEqual(await counts(), before);
    console.log("Limpeza: zero dados temporários; contagens preservadas.");
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

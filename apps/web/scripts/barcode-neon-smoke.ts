import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@rotula-facil-pro/db";
import { associateBarcodeWithRecipe, createInternalBarcode, createOfficialGtinBarcode, findBarcode } from "../src/lib/barcodes/repository";
import { renderBarcodePng, renderBarcodeSvg } from "../src/lib/barcodes/render";

const marker = `barcode-smoke-${randomUUID()}`;
const testUserIds: string[] = [];

async function preflight() {
  const database = await prisma.$queryRaw<Array<{ host: string; database: string }>>`SELECT current_database() AS database, inet_server_addr()::text AS host`;
  assert.equal(database[0]?.database, "neondb");
  const migrations = await prisma.$queryRaw<Array<{ migration_name: string }>>`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  const applied = new Set(migrations.map((item) => item.migration_name));
  const local = readdirSync(resolve(process.cwd(), "../../packages/db/prisma/migrations"), { withFileTypes: true })
    .filter((item) => item.isDirectory()).map((item) => item.name);
  assert(local.every((name) => applied.has(name)), "Há migration local pendente; smoke interrompido.");
  assert(applied.has("20260912120000_barcode_foundation"));
  console.log(`Pré-checagem OK: neondb, ${local.length} migrations locais aplicadas.`);
}

async function main() {
  await preflight();
  if (process.argv.includes("--preflight")) return;

  const before = await Promise.all([
    prisma.user.count(), prisma.recipe.count(), prisma.barcode.count(), prisma.ingredient.count()
  ]);
  try {
    for (const suffix of ["a", "b"]) {
      const user = await prisma.user.create({ data: {
        name: `Smoke Barcode ${suffix}`,
        email: `${marker}-${suffix}@example.invalid`,
        passwordHash: `SMOKE-NO-LOGIN-${marker}`
      } });
      testUserIds.push(user.id);
    }
    const [userA, userB] = testUserIds;
    const recipeA = await prisma.recipe.create({ data: { userId: userA, name: `${marker}-recipe-a`, physicalState: "SOLID_OR_SEMISOLID", finalYieldUnit: "GRAM" } });
    const recipeB = await prisma.recipe.create({ data: { userId: userB, name: `${marker}-recipe-b`, physicalState: "SOLID_OR_SEMISOLID", finalYieldUnit: "GRAM" } });
    const barcodeA = await createInternalBarcode(userA, recipeA.id);
    assert.equal((await findBarcode(userA, barcodeA.id))?.recipeId, recipeA.id);
    const barcodeA2 = await createOfficialGtinBarcode(userA, "036000291452");
    await assert.rejects(() => associateBarcodeWithRecipe(userA, barcodeA2.id, recipeA.id), (error: unknown) => !!error && typeof error === "object" && "code" in error && error.code === "P2002");
    assert.equal((await findBarcode(userA, barcodeA2.id))?.recipeId, null);

    await associateBarcodeWithRecipe(userA, barcodeA.id, null);
    assert.equal((await findBarcode(userA, barcodeA.id))?.recipeId, null);
    await associateBarcodeWithRecipe(userA, barcodeA.id, recipeA.id);
    assert.equal((await findBarcode(userA, barcodeA.id))?.recipeId, recipeA.id);

    const barcodeB = await createInternalBarcode(userB, recipeB.id);
    assert.equal(await associateBarcodeWithRecipe(userA, barcodeA.id, recipeB.id), null);
    assert.equal(await associateBarcodeWithRecipe(userA, barcodeB.id, recipeA.id), null);
    assert.equal(await findBarcode(userA, barcodeB.id), null);
    await assert.rejects(() => createInternalBarcode(userA, recipeB.id), /RECIPE_NOT_FOUND/);
    assert.equal((await findBarcode(userA, barcodeA.id))?.recipeId, recipeA.id);

    const persistedOfficial = await findBarcode(userA, barcodeA2.id);
    assert(persistedOfficial);
    assert.equal(persistedOfficial.value, "036000291452");
    const svg = renderBarcodeSvg(persistedOfficial);
    assert.equal(svg.status, "READY");
    if (svg.status === "READY") assert.match(svg.svg, /<svg[\s>]/);
    const png = await renderBarcodePng(persistedOfficial);
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");

    await prisma.recipe.delete({ where: { id: recipeA.id, userId: userA } });
    assert.equal((await findBarcode(userA, barcodeA.id))?.recipeId, null);
    console.log("Smoke real OK: associação, conflito, desassociação, isolamento, SetNull, SVG e PNG.");
  } finally {
    if (testUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: testUserIds }, email: { startsWith: marker } } });
    }
    const leftovers = await prisma.user.count({ where: { email: { startsWith: marker } } });
    assert.equal(leftovers, 0, "Restaram usuários temporários do smoke.");
    const after = await Promise.all([
      prisma.user.count(), prisma.recipe.count(), prisma.barcode.count(), prisma.ingredient.count()
    ]);
    assert.deepEqual(after, before, "Contagens de User/Recipe/Barcode/Ingredient divergiram após limpeza.");
    console.log("Limpeza OK: zero dados de teste restantes; contagens preservadas.");
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

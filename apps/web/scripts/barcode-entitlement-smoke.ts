import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "@rotula-facil-pro/db";
import { BarcodeEntitlementError } from "../src/lib/barcodes/commercial";
import { associateBarcodeWithRecipe, createInternalBarcode, createOfficialGtinBarcode, deleteBarcode, findBarcode } from "../src/lib/barcodes/repository";
import { renderBarcodePng, renderBarcodeSvg } from "../src/lib/barcodes/render";

const marker = `barcode-entitlement-smoke-${randomUUID()}`;
const userIds: string[] = [];
const now = new Date();
const start = new Date(now.getTime() - 60_000);
const end = new Date(now.getTime() + 60 * 60_000);

async function user(label: string) {
  const created = await prisma.user.create({ data: { name: `Entitlement smoke ${label}`, email: `${marker}-${label}@example.invalid`, passwordHash: `NO-LOGIN-${marker}` } });
  userIds.push(created.id);
  return created.id;
}

async function monthly(userId: string, used = 0, withCycle = true) {
  const subscription = await prisma.subscription.create({ data: { userId, plan: "MONTHLY", status: "ACTIVE", startsAt: start } });
  const cycle = withCycle ? await prisma.billingCycle.create({ data: { userId, subscriptionId: subscription.id, planSnapshot: "MONTHLY", startsAt: start, endsAt: end, barcodeUsed: used } }) : null;
  return cycle;
}

async function expectEntitlement(run: () => Promise<unknown>, code: BarcodeEntitlementError["code"]) {
  await assert.rejects(run, (error: unknown) => error instanceof BarcodeEntitlementError && error.code === code);
}

async function counts() {
  return Promise.all([
    prisma.user.count(), prisma.recipe.count(), prisma.barcode.count(), prisma.ingredient.count(),
    prisma.subscription.count(), prisma.billingCycle.count(), prisma.barcodeUsage.count()
  ]);
}

async function main() {
  const before = await counts();
  try {
    const freeUser = await user("free");
    const legacy = await prisma.barcode.create({ data: { userId: freeUser, type: "INTERNAL", format: "INTERNAL", value: `RF-I-${randomUUID()}` } });
    const first = await createInternalBarcode(freeUser);
    assert.equal(await prisma.subscription.count({ where: { userId: freeUser, plan: "FREE", status: "ACTIVE" } }), 1);
    assert.equal(await prisma.barcodeUsage.count({ where: { userId: freeUser, planSnapshot: "FREE" } }), 1);
    assert.equal(await prisma.barcodeUsage.count({ where: { barcodeId: legacy.id } }), 0);
    await expectEntitlement(() => createInternalBarcode(freeUser), "FREE_LIMIT_REACHED");
    assert.equal(await prisma.barcode.count({ where: { userId: freeUser } }), 2);
    await deleteBarcode(freeUser, first.id);
    await expectEntitlement(() => createInternalBarcode(freeUser), "FREE_LIMIT_REACHED");
    const freeUsage = await prisma.barcodeUsage.findFirst({ where: { userId: freeUser, planSnapshot: "FREE" } });
    assert.equal(freeUsage?.barcodeId, null);

    const monthlyUser = await user("monthly");
    const cycle = await monthly(monthlyUser);
    assert(cycle);
    const official = await createOfficialGtinBarcode(monthlyUser, "036000291452");
    assert.equal(official.value, "036000291452");
    assert.equal((await prisma.billingCycle.findUnique({ where: { id: cycle.id } }))?.barcodeUsed, 1);
    const internal = await createInternalBarcode(monthlyUser);
    assert.equal((await prisma.billingCycle.findUnique({ where: { id: cycle.id } }))?.barcodeUsed, 2);
    await assert.rejects(() => createOfficialGtinBarcode(monthlyUser, "036000291452"), (error: unknown) => !!error && typeof error === "object" && "code" in error && error.code === "P2002");
    assert.equal((await prisma.billingCycle.findUnique({ where: { id: cycle.id } }))?.barcodeUsed, 2);
    assert.equal(await prisma.barcodeUsage.count({ where: { userId: monthlyUser } }), 2);
    await assert.rejects(() => createOfficialGtinBarcode(monthlyUser, "036000291453"));
    assert.equal((await prisma.billingCycle.findUnique({ where: { id: cycle.id } }))?.barcodeUsed, 2);
    assert.equal(await prisma.barcodeUsage.count({ where: { userId: monthlyUser } }), 2);
    const recipe = await prisma.recipe.create({ data: { userId: monthlyUser, name: `${marker}-recipe`, physicalState: "SOLID_OR_SEMISOLID", finalYieldUnit: "GRAM" } });
    await associateBarcodeWithRecipe(monthlyUser, internal.id, recipe.id);
    await associateBarcodeWithRecipe(monthlyUser, internal.id, null);
    await associateBarcodeWithRecipe(monthlyUser, internal.id, recipe.id);
    assert.equal((await prisma.billingCycle.findUnique({ where: { id: cycle.id } }))?.barcodeUsed, 2);
    await assert.rejects(() => createInternalBarcode(monthlyUser, recipe.id), (error: unknown) => !!error && typeof error === "object" && "code" in error && error.code === "P2002");
    assert.equal((await prisma.billingCycle.findUnique({ where: { id: cycle.id } }))?.barcodeUsed, 2);
    assert.equal(await prisma.barcodeUsage.count({ where: { userId: monthlyUser } }), 2);
    const foreignUser = await user("foreign");
    const foreignRecipe = await prisma.recipe.create({ data: { userId: foreignUser, name: `${marker}-foreign`, physicalState: "SOLID_OR_SEMISOLID", finalYieldUnit: "GRAM" } });
    await expectEntitlement(() => createInternalBarcode(monthlyUser, foreignRecipe.id), "RECIPE_NOT_FOUND");
    assert.equal((await prisma.billingCycle.findUnique({ where: { id: cycle.id } }))?.barcodeUsed, 2);
    await assert.rejects(() => prisma.$transaction(async (tx) => {
      await tx.billingCycle.update({ where: { id: cycle.id }, data: { barcodeUsed: { increment: 1 } } });
      const doomed = await tx.barcode.create({ data: { userId: monthlyUser, type: "INTERNAL", format: "INTERNAL", value: `RF-I-${randomUUID()}` } });
      await tx.barcodeUsage.create({ data: { userId: monthlyUser, barcodeId: doomed.id, kind: "INTERNAL", planSnapshot: "MONTHLY" } });
    }), (error: unknown) => error instanceof Error && error.message.includes("barcode_usages_cycle_by_plan"));
    assert.equal((await prisma.billingCycle.findUnique({ where: { id: cycle.id } }))?.barcodeUsed, 2);
    assert.equal(await prisma.barcode.count({ where: { userId: monthlyUser } }), 2);
    assert.equal(await prisma.barcodeUsage.count({ where: { userId: monthlyUser } }), 2);
    await prisma.billingCycle.update({ where: { id: cycle.id }, data: { barcodeUsed: 9 } });
    await createInternalBarcode(monthlyUser);
    assert.equal((await prisma.billingCycle.findUnique({ where: { id: cycle.id } }))?.barcodeUsed, 10);
    await expectEntitlement(() => createInternalBarcode(monthlyUser), "MONTHLY_LIMIT_REACHED");
    assert.equal(await prisma.barcodeUsage.count({ where: { userId: monthlyUser } }), 3);

    const concurrentUser = await user("concurrent");
    const concurrentCycle = await monthly(concurrentUser, 9);
    assert(concurrentCycle);
    const settled = await Promise.allSettled([createInternalBarcode(concurrentUser), createInternalBarcode(concurrentUser)]);
    assert.equal(settled.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(settled.filter((item) => item.status === "rejected" && item.reason instanceof BarcodeEntitlementError && item.reason.code === "MONTHLY_LIMIT_REACHED").length, 1);
    assert.equal((await prisma.billingCycle.findUnique({ where: { id: concurrentCycle.id } }))?.barcodeUsed, 10);
    assert.equal(await prisma.barcodeUsage.count({ where: { userId: concurrentUser } }), 1);
    assert.equal(await prisma.barcode.count({ where: { userId: concurrentUser } }), 1);

    const noCycleUser = await user("no-cycle");
    await monthly(noCycleUser, 0, false);
    await expectEntitlement(() => createInternalBarcode(noCycleUser), "MISSING_BILLING_CYCLE");
    assert.equal(await prisma.barcode.count({ where: { userId: noCycleUser } }), 0);

    const overlapUser = await user("overlap");
    const overlapCycle = await monthly(overlapUser);
    assert(overlapCycle);
    await prisma.billingCycle.create({ data: {
      userId: overlapUser, subscriptionId: overlapCycle.subscriptionId, planSnapshot: "MONTHLY",
      startsAt: new Date(start.getTime() + 1_000), endsAt: end
    } });
    await expectEntitlement(() => createInternalBarcode(overlapUser), "MISSING_BILLING_CYCLE");
    assert.equal(await prisma.barcode.count({ where: { userId: overlapUser } }), 0);

    const annualUser = await user("annual");
    await prisma.subscription.create({ data: { userId: annualUser, plan: "ANNUAL", status: "ACTIVE", startsAt: start } });
    const annualCodes = await Promise.all([createInternalBarcode(annualUser), createInternalBarcode(annualUser), createInternalBarcode(annualUser)]);
    assert.equal(await prisma.barcodeUsage.count({ where: { userId: annualUser, planSnapshot: "ANNUAL", billingCycleId: null } }), 3);
    await deleteBarcode(annualUser, annualCodes[0].id);
    assert.equal(await prisma.barcodeUsage.count({ where: { userId: annualUser } }), 3);

    assert.equal(await findBarcode(foreignUser, official.id), null);
    const svg = renderBarcodeSvg(official);
    assert.equal(svg.status, "READY");
    assert.equal((await renderBarcodePng(official)).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal((await prisma.billingCycle.findUnique({ where: { id: cycle.id } }))?.barcodeUsed, 10);
    await deleteBarcode(monthlyUser, official.id);
    assert.equal((await prisma.billingCycle.findUnique({ where: { id: cycle.id } }))?.barcodeUsed, 10);
    assert.equal(await prisma.barcodeUsage.count({ where: { userId: monthlyUser } }), 3);
    const reviewUser = await user("review");
    await prisma.subscription.create({ data: { userId: reviewUser, plan: "ANNUAL", status: "ACTIVE", startsAt: end } });
    await expectEntitlement(() => createInternalBarcode(reviewUser), "SUBSCRIPTION_REQUIRES_REVIEW");
    assert.equal(await prisma.barcode.count({ where: { userId: reviewUser } }), 0);
    console.log("FREE, MONTHLY, ANNUAL, concorrência, rollback, legados, multitenancy e SVG/PNG: OK.");
  } finally {
    if (userIds.length) {
      await prisma.barcodeUsage.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.barcode.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.recipe.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.billingCycle.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds }, email: { startsWith: marker } } });
    }
    assert.equal(await prisma.user.count({ where: { email: { startsWith: marker } } }), 0);
    assert.deepEqual(await counts(), before);
    console.log("Limpeza: zero dados temporários, contagens preservadas.");
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

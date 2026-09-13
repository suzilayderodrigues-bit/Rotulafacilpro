import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "@rotula-facil-pro/db";

const migration = "20260913120000_barcode_usage_billing_cycles";
const marker = `commercial-smoke-${randomUUID()}`;
const userIds: string[] = [];

async function counts() {
  return {
    users: await prisma.user.count(), recipes: await prisma.recipe.count(),
    barcodes: await prisma.barcode.count(), ingredients: await prisma.ingredient.count()
  };
}

async function verify() {
  const applied = await prisma.$queryRaw<Array<{ migration_name: string }>>`SELECT migration_name FROM _prisma_migrations WHERE migration_name = ${migration} AND finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  assert.equal(applied.length, 1);
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('subscriptions', 'billing_cycles', 'barcode_usages')`;
  assert.deepEqual(new Set(tables.map((row) => row.table_name)), new Set(["subscriptions", "billing_cycles", "barcode_usages"]));
  const indexes = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname IN ('subscriptions_one_active_per_user', 'barcode_usages_one_free_lifetime')`;
  assert.equal(indexes.length, 2);
  assert(indexes.some((row) => row.indexname === "subscriptions_one_active_per_user" && row.indexdef.includes("ACTIVE")));
  assert(indexes.some((row) => row.indexname === "barcode_usages_one_free_lifetime" && row.indexdef.includes("FREE")));
  const constraints = await prisma.$queryRaw<Array<{ conname: string }>>`SELECT conname FROM pg_constraint WHERE conname IN ('billing_cycles_used_range', 'billing_cycles_subscriptionId_userId_fkey', 'barcode_usages_billingCycleId_userId_fkey', 'barcode_usages_barcodeId_fkey')`;
  assert.equal(constraints.length, 4);
  const enums = await prisma.$queryRaw<Array<{ typname: string }>>`SELECT typname FROM pg_type WHERE typname IN ('CommercialPlan', 'SubscriptionStatus')`;
  assert.equal(enums.length, 2);
  console.log("Objetos da migration: tabelas, enums, índices parciais, checks e FKs OK.");
}

async function rejected(run: () => Promise<unknown>, code: string) {
  await assert.rejects(run, (error: unknown) => !!error && typeof error === "object" && "code" in error && error.code === code);
}

async function rejectedUsedRange(run: () => Promise<unknown>) {
  await assert.rejects(run, (error: unknown) => {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "indisponível";
    const message = error instanceof Error ? error.message : "";
    console.log(`CHECK billing_cycles_used_range: Prisma=${code}, PostgreSQL=${message.includes("23514") ? "23514" : "não identificado"}`);
    return message.includes("23514") && message.includes("billing_cycles_used_range");
  });
}

async function smoke() {
  const before = await counts();
  try {
    for (const suffix of ["a", "b"]) {
      const user = await prisma.user.create({ data: { name: `Commercial smoke ${suffix}`, email: `${marker}-${suffix}@example.invalid`, passwordHash: `NO-LOGIN-${marker}` } });
      userIds.push(user.id);
    }
    const [userA, userB] = userIds;
    const start = new Date("2026-09-01T00:00:00.000Z");
    const end = new Date("2026-10-01T00:00:00.000Z");
    const free = await prisma.subscription.create({ data: { userId: userA, plan: "FREE", status: "ACTIVE", startsAt: start } });
    await rejected(() => prisma.subscription.create({ data: { userId: userA, plan: "ANNUAL", status: "ACTIVE", startsAt: start } }), "P2002");
    const monthly = await prisma.subscription.create({ data: { userId: userB, plan: "MONTHLY", status: "ACTIVE", startsAt: start } });
    const cycle = await prisma.billingCycle.create({ data: { userId: userB, subscriptionId: monthly.id, planSnapshot: "MONTHLY", startsAt: start, endsAt: end } });
    await rejected(() => prisma.billingCycle.create({ data: { userId: userB, subscriptionId: free.id, planSnapshot: "MONTHLY", startsAt: start, endsAt: end } }), "P2003");
    await rejectedUsedRange(() => prisma.billingCycle.create({ data: { userId: userB, subscriptionId: monthly.id, planSnapshot: "MONTHLY", startsAt: end, endsAt: new Date("2026-11-01T00:00:00.000Z"), barcodeUsed: 11 } }));
    await rejectedUsedRange(() => prisma.billingCycle.create({ data: { userId: userB, subscriptionId: monthly.id, planSnapshot: "MONTHLY", startsAt: end, endsAt: new Date("2026-11-01T00:00:00.000Z"), barcodeUsed: -1 } }));
    await rejected(() => prisma.barcodeUsage.create({ data: { userId: userA, billingCycleId: cycle.id, kind: "INTERNAL", planSnapshot: "MONTHLY" } }), "P2003");
    const barcode = await prisma.barcode.create({ data: { userId: userA, type: "INTERNAL", format: "INTERNAL", value: `RF-I-${randomUUID()}` } });
    const usage = await prisma.barcodeUsage.create({ data: { userId: userA, barcodeId: barcode.id, kind: "INTERNAL", planSnapshot: "FREE" } });
    await rejected(() => prisma.barcodeUsage.create({ data: { userId: userA, kind: "INTERNAL", planSnapshot: "FREE" } }), "P2002");
    await prisma.barcode.delete({ where: { id: barcode.id } });
    assert.equal((await prisma.barcodeUsage.findUnique({ where: { id: usage.id } }))?.barcodeId, null);
    console.log("Smoke estrutural: ACTIVE único, FREE único, SetNull, FKs entre contas e limites do ciclo OK.");
  } finally {
    if (userIds.length) {
      await prisma.barcodeUsage.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.billingCycle.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.barcode.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds }, email: { startsWith: marker } } });
    }
    assert.equal(await prisma.user.count({ where: { email: { startsWith: marker } } }), 0);
    assert.deepEqual(await counts(), before);
    console.log("Limpeza: zero registros temporários; contagens antigas preservadas.");
  }
}

async function main() {
  if (process.argv.includes("--baseline")) console.log(JSON.stringify(await counts()));
  else if (process.argv.includes("--verify")) await verify();
  else { await verify(); await smoke(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

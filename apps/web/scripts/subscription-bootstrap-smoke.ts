import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma, type CommercialPlan } from "@rotula-facil-pro/db";
import { getOrCreateCurrentSubscription } from "../src/lib/subscriptions/current";

const marker = `subscription-bootstrap-smoke-${randomUUID()}`;
const userIds: string[] = [];
const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const expiredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

async function createUser(label: string) {
  const user = await prisma.user.create({ data: {
    name: `Subscription smoke ${label}`,
    email: `${marker}-${label}@example.invalid`,
    passwordHash: `NO-LOGIN-${marker}`
  } });
  userIds.push(user.id);
  return user.id;
}

async function createSubscription(userId: string, plan: CommercialPlan, status: "ACTIVE" | "ENDED", startsAt = past, endsAt: Date | null = null) {
  return prisma.subscription.create({ data: { userId, plan, status, startsAt, endsAt } });
}

async function main() {
  const applied = await prisma.$queryRaw<Array<{ migration_name: string }>>`SELECT migration_name FROM _prisma_migrations WHERE migration_name = '20260913120000_barcode_usage_billing_cycles' AND finished_at IS NOT NULL`;
  assert.equal(applied.length, 1, "A migration comercial precisa estar aplicada.");
  const before = {
    users: await prisma.user.count(), subscriptions: await prisma.subscription.count(),
    cycles: await prisma.billingCycle.count(), usages: await prisma.barcodeUsage.count()
  };

  try {
    const freeUser = await createUser("free");
    const free = await createSubscription(freeUser, "FREE", "ACTIVE");
    assert.deepEqual(await getOrCreateCurrentSubscription(freeUser), { status: "CURRENT", subscriptionId: free.id, plan: "FREE" });

    const monthlyUser = await createUser("monthly");
    const monthly = await createSubscription(monthlyUser, "MONTHLY", "ACTIVE");
    assert.deepEqual(await getOrCreateCurrentSubscription(monthlyUser), { status: "CURRENT", subscriptionId: monthly.id, plan: "MONTHLY" });

    const annualUser = await createUser("annual");
    const annual = await createSubscription(annualUser, "ANNUAL", "ACTIVE");
    assert.deepEqual(await getOrCreateCurrentSubscription(annualUser), { status: "CURRENT", subscriptionId: annual.id, plan: "ANNUAL" });

    const futureUser = await createUser("future");
    await createSubscription(futureUser, "MONTHLY", "ACTIVE", future);
    assert.deepEqual(await getOrCreateCurrentSubscription(futureUser), { status: "REQUIRES_REVIEW", reason: "ACTIVE_NOT_EFFECTIVE" });

    const expiredUser = await createUser("expired");
    await createSubscription(expiredUser, "ANNUAL", "ACTIVE", past, expiredAt);
    assert.deepEqual(await getOrCreateCurrentSubscription(expiredUser), { status: "REQUIRES_REVIEW", reason: "ACTIVE_NOT_EFFECTIVE" });

    const historicalUser = await createUser("historical");
    await createSubscription(historicalUser, "MONTHLY", "ENDED", past, expiredAt);
    assert.deepEqual(await getOrCreateCurrentSubscription(historicalUser), { status: "REQUIRES_REVIEW", reason: "HISTORY_WITHOUT_ACTIVE" });

    const newUser = await createUser("new");
    const first = await getOrCreateCurrentSubscription(newUser);
    const again = await getOrCreateCurrentSubscription(newUser);
    assert.equal(first.status, "CURRENT");
    assert.deepEqual(again, first);
    assert.equal(await prisma.subscription.count({ where: { userId: newUser } }), 1);

    const concurrentUser = await createUser("concurrent");
    const [callA, callB] = await Promise.all([
      getOrCreateCurrentSubscription(concurrentUser),
      getOrCreateCurrentSubscription(concurrentUser)
    ]);
    assert.equal(callA.status, "CURRENT");
    assert.deepEqual(callB, callA);
    assert.equal(await prisma.subscription.count({ where: { userId: concurrentUser, status: "ACTIVE" } }), 1);
    assert.equal(await prisma.billingCycle.count({ where: { userId: { in: userIds } } }), 0);
    assert.equal(await prisma.barcodeUsage.count({ where: { userId: { in: userIds } } }), 0);
    assert.notEqual(first.status === "CURRENT" ? first.subscriptionId : null, monthly.id);
    console.log("Bootstrap FREE, idempotência, concorrência, planos vigentes, datas inválidas e isolamento: OK.");
  } finally {
    if (userIds.length) {
      await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds }, email: { startsWith: marker } } });
    }
    assert.equal(await prisma.user.count({ where: { email: { startsWith: marker } } }), 0);
    assert.deepEqual({
      users: await prisma.user.count(), subscriptions: await prisma.subscription.count(),
      cycles: await prisma.billingCycle.count(), usages: await prisma.barcodeUsage.count()
    }, before);
    console.log("Limpeza: zero dados temporários e contagens preservadas.");
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

import { prisma, type CommercialPlan } from "@rotula-facil-pro/db";
import { getOrCreateCurrentSubscription } from "@/lib/subscriptions/current";
import type { BarcodeDraft } from "./domain";

export type BarcodeEntitlementErrorCode =
  | "FREE_LIMIT_REACHED"
  | "MONTHLY_LIMIT_REACHED"
  | "MISSING_BILLING_CYCLE"
  | "SUBSCRIPTION_REQUIRES_REVIEW"
  | "RECIPE_NOT_FOUND";

export class BarcodeEntitlementError extends Error {
  constructor(public readonly code: BarcodeEntitlementErrorCode) {
    super(code);
  }
}

function isFreeUniqueViolation(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  if (error.code === "P2002") return true;
  return error.code === "P2039" && error instanceof Error && error.message.includes("barcode_usages_one_free_lifetime");
}

export async function createBarcodeWithEntitlement(userId: string, draft: BarcodeDraft, recipeId: string | null = null) {
  const current = await getOrCreateCurrentSubscription(userId);
  if (current.status === "REQUIRES_REVIEW") throw new BarcodeEntitlementError("SUBSCRIPTION_REQUIRES_REVIEW");

  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ plan: CommercialPlan }>>`
      SELECT "plan" FROM "subscriptions"
      WHERE "id" = ${current.subscriptionId} AND "userId" = ${userId}
        AND "status" = 'ACTIVE' AND "startsAt" <= CURRENT_TIMESTAMP
        AND ("endsAt" IS NULL OR CURRENT_TIMESTAMP < "endsAt")
      FOR UPDATE
    `;
    if (locked.length !== 1 || locked[0].plan !== current.plan) {
      throw new BarcodeEntitlementError("SUBSCRIPTION_REQUIRES_REVIEW");
    }

    if (recipeId !== null) {
      const recipe = await tx.recipe.findFirst({ where: { id: recipeId, userId }, select: { id: true } });
      if (!recipe) throw new BarcodeEntitlementError("RECIPE_NOT_FOUND");
    }

    let billingCycleId: string | null = null;
    if (current.plan === "MONTHLY") {
      const now = new Date();
      const cycles = await tx.billingCycle.findMany({
        where: {
          userId, subscriptionId: current.subscriptionId, planSnapshot: "MONTHLY",
          startsAt: { lte: now }, endsAt: { gt: now }
        },
        select: { id: true }, take: 2
      });
      if (cycles.length !== 1) throw new BarcodeEntitlementError("MISSING_BILLING_CYCLE");
      const cycle = cycles[0];
      const incremented = await tx.billingCycle.updateMany({
        where: {
          id: cycle.id, userId, subscriptionId: current.subscriptionId, planSnapshot: "MONTHLY",
          startsAt: { lte: now }, endsAt: { gt: now }, barcodeUsed: { lt: 10 }
        },
        data: { barcodeUsed: { increment: 1 } }
      });
      if (incremented.count !== 1) throw new BarcodeEntitlementError("MONTHLY_LIMIT_REACHED");
      billingCycleId = cycle.id;
    }

    const barcode = await tx.barcode.create({ data: { userId, recipeId, ...draft } });
    try {
      await tx.barcodeUsage.create({
        data: { userId, barcodeId: barcode.id, billingCycleId, kind: draft.type, planSnapshot: current.plan }
      });
    } catch (error) {
      if (current.plan === "FREE" && isFreeUniqueViolation(error)) {
        throw new BarcodeEntitlementError("FREE_LIMIT_REACHED");
      }
      throw error;
    }
    return barcode;
  }, { maxWait: 10_000, timeout: 15_000 });
}

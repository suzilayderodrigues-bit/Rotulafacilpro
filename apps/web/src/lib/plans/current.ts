import { prisma, type CommercialPlan, type SubscriptionStatus } from "@rotula-facil-pro/db";
import { getPlanCatalogEntry } from "./catalog";

export type PlanSubscriptionCandidate = {
  id: string;
  plan: CommercialPlan;
  status: SubscriptionStatus;
  startsAt: Date;
  endsAt: Date | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  provider?: string | null;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
};

export type CurrentPlan = {
  plan: CommercialPlan;
  catalog: ReturnType<typeof getPlanCatalogEntry>;
  source: "ACTIVE_PAID_SUBSCRIPTION" | "FREE_FALLBACK";
  subscription: PlanSubscriptionCandidate | null;
};

function isEffectivePaidSubscription(candidate: PlanSubscriptionCandidate, now: Date) {
  if (candidate.plan === "FREE" || candidate.status !== "ACTIVE") return false;
  if (candidate.startsAt > now) return false;
  if (candidate.endsAt !== null && now >= candidate.endsAt) return false;
  if (candidate.currentPeriodStart && candidate.currentPeriodStart > now) return false;
  if (candidate.currentPeriodEnd && now >= candidate.currentPeriodEnd) return false;
  return true;
}

export function resolveCurrentPlan(
  subscriptions: readonly PlanSubscriptionCandidate[],
  now = new Date()
): CurrentPlan {
  const active = subscriptions
    .filter((candidate) => isEffectivePaidSubscription(candidate, now))
    .sort((left, right) => right.startsAt.getTime() - left.startsAt.getTime())[0];

  if (!active) {
    return {
      plan: "FREE",
      catalog: getPlanCatalogEntry("FREE"),
      source: "FREE_FALLBACK",
      subscription: null
    };
  }

  return {
    plan: active.plan,
    catalog: getPlanCatalogEntry(active.plan),
    source: "ACTIVE_PAID_SUBSCRIPTION",
    subscription: active
  };
}

/** Read-only commercial source of truth. It never creates or changes subscriptions. */
export async function getCurrentPlan(userId: string, now = new Date()): Promise<CurrentPlan> {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId, plan: { in: ["MONTHLY", "ANNUAL"] } },
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      plan: true,
      status: true,
      startsAt: true,
      endsAt: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      provider: true,
      providerCustomerId: true,
      providerSubscriptionId: true
    }
  });

  return resolveCurrentPlan(subscriptions, now);
}

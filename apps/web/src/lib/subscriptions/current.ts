import { prisma, type CommercialPlan } from "@rotula-facil-pro/db";

export type CurrentSubscriptionResult =
  | { status: "CURRENT"; subscriptionId: string; plan: CommercialPlan }
  | { status: "REQUIRES_REVIEW"; reason: "ACTIVE_NOT_EFFECTIVE" | "HISTORY_WITHOUT_ACTIVE" };

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

async function resolveExisting(userId: string): Promise<CurrentSubscriptionResult | null> {
  const active = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { id: true, plan: true, startsAt: true, endsAt: true }
  });

  if (active) {
    const now = new Date();
    if (active.startsAt > now || (active.endsAt !== null && now >= active.endsAt)) {
      return { status: "REQUIRES_REVIEW", reason: "ACTIVE_NOT_EFFECTIVE" };
    }
    return { status: "CURRENT", subscriptionId: active.id, plan: active.plan };
  }

  const historical = await prisma.subscription.findFirst({ where: { userId }, select: { id: true } });
  return historical ? { status: "REQUIRES_REVIEW", reason: "HISTORY_WITHOUT_ACTIVE" } : null;
}

/** Server-side service: caller supplies the authenticated internal user id. */
export async function getOrCreateCurrentSubscription(userId: string): Promise<CurrentSubscriptionResult> {
  const existing = await resolveExisting(userId);
  if (existing) return existing;

  try {
    const created = await prisma.subscription.create({
      data: { userId, plan: "FREE", status: "ACTIVE", startsAt: new Date() },
      select: { id: true, plan: true }
    });
    return { status: "CURRENT", subscriptionId: created.id, plan: created.plan };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const winner = await resolveExisting(userId);
    if (winner) return winner;
    throw error;
  }
}

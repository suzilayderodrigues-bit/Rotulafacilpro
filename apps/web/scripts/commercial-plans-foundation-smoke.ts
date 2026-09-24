import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { CommercialPlan, SubscriptionStatus } from "@rotula-facil-pro/db";
import { planCatalog } from "../src/lib/plans/catalog";
import { resolveCurrentPlan, type PlanSubscriptionCandidate } from "../src/lib/plans/current";

const now = new Date("2026-09-23T12:00:00.000Z");
const past = new Date("2026-09-01T00:00:00.000Z");
const future = new Date("2026-10-01T00:00:00.000Z");

function subscription(plan: CommercialPlan, status: SubscriptionStatus): PlanSubscriptionCandidate {
  return { id: `${plan}-${status}`, plan, status, startsAt: past, endsAt: future };
}

assert.equal(resolveCurrentPlan([], now).plan, "FREE");
assert.equal(resolveCurrentPlan([subscription("MONTHLY", "ACTIVE")], now).plan, "MONTHLY");
assert.equal(resolveCurrentPlan([subscription("ANNUAL", "ACTIVE")], now).plan, "ANNUAL");
assert.equal(resolveCurrentPlan([subscription("MONTHLY", "PAST_DUE")], now).plan, "FREE");
assert.equal(resolveCurrentPlan([subscription("MONTHLY", "CANCELED")], now).plan, "FREE");
assert.equal(resolveCurrentPlan([subscription("ANNUAL", "EXPIRED")], now).plan, "FREE");
assert.equal(resolveCurrentPlan([subscription("MONTHLY", "PENDING")], now).plan, "FREE");
assert.equal(resolveCurrentPlan([{ ...subscription("ANNUAL", "ACTIVE"), startsAt: future }], now).plan, "FREE");

assert.equal(planCatalog.FREE.priceInCents, 0);
assert.equal(planCatalog.FREE.priceLabel, "R$ 0");
assert.equal(planCatalog.MONTHLY.priceInCents, 2_990);
assert.equal(planCatalog.MONTHLY.priceLabel, "R$ 29,90/mês");
assert.equal(planCatalog.ANNUAL.priceInCents, 29_700);
assert.equal(planCatalog.ANNUAL.priceLabel, "R$ 297/ano");

const pageSource = readFileSync(new URL("../src/app/planos/page.tsx", import.meta.url), "utf8");
const barcodeSource = readFileSync(new URL("../src/lib/barcodes/commercial.ts", import.meta.url), "utf8");
assert(pageSource.includes('from "@/lib/plans/catalog"'));
assert(pageSource.includes("Assinatura em breve"));
assert(!pageSource.includes("29,90") && !pageSource.includes("297/ano"));
assert(!pageSource.match(/asaas|checkout|payment|api.?key/i));
assert(barcodeSource.includes("createBarcodeWithEntitlement"), "A quota existente de barcode não pode ser removida nesta sprint.");

console.log("Planos canônicos, resolução FREE/MONTHLY/ANNUAL e página sem checkout: OK.");

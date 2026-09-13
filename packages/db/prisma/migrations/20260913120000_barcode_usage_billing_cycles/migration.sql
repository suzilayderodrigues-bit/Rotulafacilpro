CREATE TYPE "CommercialPlan" AS ENUM ('FREE', 'MONTHLY', 'ANNUAL');
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'ENDED', 'CANCELED');

CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "CommercialPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "provider" TEXT,
    "providerSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subscriptions_valid_period" CHECK ("endsAt" IS NULL OR "startsAt" < "endsAt"),
    CONSTRAINT "subscriptions_provider_pair" CHECK (("provider" IS NULL) = ("providerSubscriptionId" IS NULL)),
    CONSTRAINT "subscriptions_valid_current_period" CHECK (("currentPeriodStart" IS NULL AND "currentPeriodEnd" IS NULL) OR ("currentPeriodStart" IS NOT NULL AND "currentPeriodEnd" IS NOT NULL AND "currentPeriodStart" < "currentPeriodEnd"))
);

CREATE TABLE "billing_cycles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "planSnapshot" "CommercialPlan" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "barcodeUsed" INTEGER NOT NULL DEFAULT 0,
    "providerCycleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "billing_cycles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "billing_cycles_monthly_only" CHECK ("planSnapshot" = 'MONTHLY'),
    CONSTRAINT "billing_cycles_valid_period" CHECK ("startsAt" < "endsAt"),
    CONSTRAINT "billing_cycles_used_range" CHECK ("barcodeUsed" BETWEEN 0 AND 10)
);

CREATE TABLE "barcode_usages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "barcodeId" TEXT,
    "billingCycleId" TEXT,
    "kind" "BarcodeType" NOT NULL,
    "planSnapshot" "CommercialPlan" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "barcode_usages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "barcode_usages_cycle_by_plan" CHECK (("planSnapshot" = 'MONTHLY' AND "billingCycleId" IS NOT NULL) OR ("planSnapshot" IN ('FREE', 'ANNUAL') AND "billingCycleId" IS NULL))
);

CREATE UNIQUE INDEX "subscriptions_provider_providerSubscriptionId_key" ON "subscriptions"("provider", "providerSubscriptionId");
CREATE UNIQUE INDEX "subscriptions_id_userId_key" ON "subscriptions"("id", "userId");
CREATE INDEX "subscriptions_userId_status_startsAt_idx" ON "subscriptions"("userId", "status", "startsAt");
CREATE UNIQUE INDEX "subscriptions_one_active_per_user" ON "subscriptions"("userId") WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "billing_cycles_subscriptionId_startsAt_key" ON "billing_cycles"("subscriptionId", "startsAt");
CREATE UNIQUE INDEX "billing_cycles_subscriptionId_providerCycleId_key" ON "billing_cycles"("subscriptionId", "providerCycleId");
CREATE UNIQUE INDEX "billing_cycles_id_userId_key" ON "billing_cycles"("id", "userId");
CREATE INDEX "billing_cycles_userId_startsAt_endsAt_idx" ON "billing_cycles"("userId", "startsAt", "endsAt");

CREATE UNIQUE INDEX "barcode_usages_barcodeId_key" ON "barcode_usages"("barcodeId");
CREATE INDEX "barcode_usages_userId_billingCycleId_createdAt_idx" ON "barcode_usages"("userId", "billingCycleId", "createdAt");
CREATE INDEX "barcode_usages_userId_planSnapshot_createdAt_idx" ON "barcode_usages"("userId", "planSnapshot", "createdAt");
CREATE UNIQUE INDEX "barcode_usages_one_free_lifetime" ON "barcode_usages"("userId") WHERE "planSnapshot" = 'FREE';

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_cycles" ADD CONSTRAINT "billing_cycles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_cycles" ADD CONSTRAINT "billing_cycles_subscriptionId_userId_fkey" FOREIGN KEY ("subscriptionId", "userId") REFERENCES "subscriptions"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "barcode_usages" ADD CONSTRAINT "barcode_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "barcode_usages" ADD CONSTRAINT "barcode_usages_barcodeId_fkey" FOREIGN KEY ("barcodeId") REFERENCES "barcodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "barcode_usages" ADD CONSTRAINT "barcode_usages_billingCycleId_userId_fkey" FOREIGN KEY ("billingCycleId", "userId") REFERENCES "billing_cycles"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

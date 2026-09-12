CREATE TYPE "BarcodeType" AS ENUM ('OFFICIAL_GTIN', 'INTERNAL');

CREATE TYPE "BarcodeValueFormat" AS ENUM ('GTIN_8', 'GTIN_12', 'GTIN_13', 'GTIN_14', 'INTERNAL');

CREATE TABLE "barcodes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT,
    "type" "BarcodeType" NOT NULL,
    "value" TEXT NOT NULL,
    "format" "BarcodeValueFormat" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barcodes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "barcodes_recipeId_key" ON "barcodes"("recipeId");

CREATE UNIQUE INDEX "barcodes_userId_value_key" ON "barcodes"("userId", "value");

CREATE INDEX "barcodes_userId_idx" ON "barcodes"("userId");

ALTER TABLE "barcodes" ADD CONSTRAINT "barcodes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "barcodes" ADD CONSTRAINT "barcodes_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

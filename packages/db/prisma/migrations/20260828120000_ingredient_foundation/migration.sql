CREATE TYPE "IngredientSource" AS ENUM ('BASE_ROTULA', 'CUSTOM');

CREATE TYPE "IngredientBaseUnit" AS ENUM ('GRAM', 'MILLILITER');

CREATE TABLE "ingredients" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "source" "IngredientSource" NOT NULL,
  "category" TEXT NOT NULL,
  "dataOrigin" TEXT NOT NULL,
  "dataOriginUrl" TEXT,
  "baseUnit" "IngredientBaseUnit" NOT NULL DEFAULT 'GRAM',
  "baseQuantity" DECIMAL(10,2) NOT NULL DEFAULT 100,
  "caloriesKcal" DECIMAL(10,2),
  "carbohydratesG" DECIMAL(10,2),
  "proteinsG" DECIMAL(10,2),
  "totalFatG" DECIMAL(10,2),
  "saturatedFatG" DECIMAL(10,2),
  "transFatG" DECIMAL(10,2),
  "fiberG" DECIMAL(10,2),
  "sodiumMg" DECIMAL(10,2),
  "sugarsG" DECIMAL(10,2),
  "addedSugarsG" DECIMAL(10,2),
  "calciumMg" DECIMAL(10,2),
  "ironMg" DECIMAL(10,2),
  "allergens" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "containsGluten" BOOLEAN NOT NULL DEFAULT false,
  "containsLactose" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ingredients_source_user_scope_check" CHECK (
    ("source" = 'BASE_ROTULA' AND "userId" IS NULL)
    OR ("source" = 'CUSTOM' AND "userId" IS NOT NULL)
  ),
  CONSTRAINT "ingredients_baseQuantity_check" CHECK ("baseQuantity" = 100)
);

CREATE INDEX "ingredients_source_idx" ON "ingredients"("source");
CREATE INDEX "ingredients_category_idx" ON "ingredients"("category");
CREATE INDEX "ingredients_userId_idx" ON "ingredients"("userId");
CREATE INDEX "ingredients_normalizedName_idx" ON "ingredients"("normalizedName");

ALTER TABLE "ingredients"
  ADD CONSTRAINT "ingredients_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

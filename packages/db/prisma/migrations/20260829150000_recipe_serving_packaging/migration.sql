ALTER TABLE "recipes" ADD COLUMN "netQuantity" DECIMAL(10,2),
ADD COLUMN "netQuantityUnit" "IngredientBaseUnit",
ADD COLUMN "servingSize" DECIMAL(10,2),
ADD COLUMN "servingUnit" "IngredientBaseUnit",
ADD COLUMN "householdMeasure" TEXT,
ADD COLUMN "servingsPerPackage" DECIMAL(10,4),
ADD COLUMN "isIndividualPackage" BOOLEAN NOT NULL DEFAULT false;

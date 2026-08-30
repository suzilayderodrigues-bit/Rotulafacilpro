-- CreateEnum
CREATE TYPE "RecipePhysicalState" AS ENUM ('SOLID_OR_SEMISOLID', 'LIQUID');

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "foodCategory" TEXT,
    "physicalState" "RecipePhysicalState" NOT NULL,
    "finalYieldAmount" DECIMAL(10,2),
    "finalYieldUnit" "IngredientBaseUnit" NOT NULL,
    "unitsProduced" INTEGER,
    "unitWeight" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recipes_finalYieldAmount_positive" CHECK ("finalYieldAmount" IS NULL OR "finalYieldAmount" > 0),
    CONSTRAINT "recipes_unitsProduced_positive" CHECK ("unitsProduced" IS NULL OR "unitsProduced" > 0),
    CONSTRAINT "recipes_unitWeight_positive" CHECK ("unitWeight" IS NULL OR "unitWeight" > 0),
    CONSTRAINT "recipes_physicalState_finalYieldUnit_match" CHECK (
        ("physicalState" = 'SOLID_OR_SEMISOLID' AND "finalYieldUnit" = 'GRAM') OR
        ("physicalState" = 'LIQUID' AND "finalYieldUnit" = 'MILLILITER')
    )
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "unit" "IngredientBaseUnit" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recipe_ingredients_amount_positive" CHECK ("amount" > 0)
);

-- CreateIndex
CREATE INDEX "recipes_userId_idx" ON "recipes"("userId");

-- CreateIndex
CREATE INDEX "recipes_name_idx" ON "recipes"("name");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipeId_idx" ON "recipe_ingredients"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_ingredients_ingredientId_idx" ON "recipe_ingredients"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipeId_ingredientId_key" ON "recipe_ingredients"("recipeId", "ingredientId");

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

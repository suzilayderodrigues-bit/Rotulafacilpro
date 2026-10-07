-- No backfill: historical lists and nutritional data remain unchanged.
CREATE TYPE "IngredientAllergenStatus" AS ENUM ('UNKNOWN', 'KNOWN', 'NONE');
ALTER TABLE "ingredients" ADD COLUMN "allergenStatus" "IngredientAllergenStatus";
-- Legacy NULL status is allowed. New explicit states must agree with their storage container.
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_allergen_state_consistency"
CHECK (
  "allergenStatus" IS NULL OR
  ("allergenStatus" = 'KNOWN' AND cardinality("allergens") > 0) OR
  ("allergenStatus" IN ('UNKNOWN', 'NONE') AND cardinality("allergens") = 0)
);

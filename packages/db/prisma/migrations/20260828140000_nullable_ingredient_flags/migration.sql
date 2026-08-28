ALTER TABLE "ingredients"
  ALTER COLUMN "containsGluten" DROP DEFAULT,
  ALTER COLUMN "containsGluten" DROP NOT NULL,
  ALTER COLUMN "containsLactose" DROP DEFAULT,
  ALTER COLUMN "containsLactose" DROP NOT NULL;

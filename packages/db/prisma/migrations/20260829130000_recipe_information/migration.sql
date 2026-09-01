-- CreateEnum
CREATE TYPE "RecipeDisclosureStatus" AS ENUM ('CONTAINS', 'DOES_NOT_CONTAIN', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "RecipeCrossContaminationRisk" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- AlterTable
ALTER TABLE "recipes"
  ADD COLUMN "confirmedAllergens" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "glutenStatus" "RecipeDisclosureStatus",
  ADD COLUMN "lactoseStatus" "RecipeDisclosureStatus",
  ADD COLUMN "crossContaminationRisk" "RecipeCrossContaminationRisk",
  ADD COLUMN "crossContaminationAllergens" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "informationReviewedAt" TIMESTAMP(3);

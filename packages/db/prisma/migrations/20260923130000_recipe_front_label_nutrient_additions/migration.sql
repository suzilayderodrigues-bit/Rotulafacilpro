-- CreateEnum
CREATE TYPE "FrontOfPackNutrientAdditionStatus" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- AlterTable
ALTER TABLE "recipes"
ADD COLUMN "addedSugarsAddition" "FrontOfPackNutrientAdditionStatus",
ADD COLUMN "saturatedFatAddition" "FrontOfPackNutrientAdditionStatus",
ADD COLUMN "sodiumAddition" "FrontOfPackNutrientAdditionStatus";

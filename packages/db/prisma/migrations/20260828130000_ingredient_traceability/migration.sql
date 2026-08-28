ALTER TABLE "ingredients"
  ADD COLUMN "sourceCode" TEXT,
  ADD COLUMN "sourceVersion" TEXT;

CREATE INDEX "ingredients_dataOrigin_sourceCode_idx" ON "ingredients"("dataOrigin", "sourceCode");

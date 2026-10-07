-- Additive only: no import, backfill or changes to historical nutritional values.
ALTER TABLE "ingredients" ADD COLUMN "sourceDescription" TEXT;

-- Versions of an existing source entry must be reviewed, never inserted as a new ingredient.
-- NULL source codes remain allowed for historical/custom entries; the new importer requires a code.
-- Existing duplicates cause migration failure for manual review, not silent data deletion.
CREATE UNIQUE INDEX "ingredients_base_source_identity_key"
ON "ingredients" ("dataOrigin", "sourceCode")
WHERE "source" = 'BASE_ROTULA' AND "sourceCode" IS NOT NULL;

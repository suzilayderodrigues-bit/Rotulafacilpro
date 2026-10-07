import { readFile } from "node:fs/promises";
import { prisma } from "../index";
import { allergenStorage, resolveIngredientAllergenState } from "../allergens";
import { expandedNutrients, importExpandedBase, type ExpandedBaseStore, type ExpandedIngredient } from "./expanded-base";

const store: ExpandedBaseStore = {
  async find(dataOrigin, sourceCode) {
    // Explicit legacy projection: the read-only dry-run must work BEFORE the new column is migrated.
    const records = await prisma.ingredient.findMany({
      where: { source: "BASE_ROTULA", dataOrigin, sourceCode },
      select: {
        id: true, name: true, normalizedName: true, category: true, dataOrigin: true,
        dataOriginUrl: true, sourceCode: true, sourceVersion: true, baseQuantity: true,
        baseUnit: true, allergens: true, containsGluten: true, containsLactose: true, notes: true,
        caloriesKcal: true, carbohydratesG: true, proteinsG: true, totalFatG: true,
        saturatedFatG: true, transFatG: true, fiberG: true, sodiumMg: true,
        sugarsG: true, addedSugarsG: true, calciumMg: true, ironMg: true
      }
    });
    if (!records.length) return [];
    // JSON field lookup returns NULL when absent, but retains actual metadata after migration.
    const descriptions = await prisma.$queryRaw<{ id: string; description: string | null; allergenState: string | null }[]>`
      SELECT i.id, to_jsonb(i)->>'sourceDescription' AS description,
        to_jsonb(i)->>'allergenStatus' AS "allergenState" FROM ingredients i
      WHERE i.source = 'BASE_ROTULA' AND i."dataOrigin" = ${dataOrigin} AND i."sourceCode" = ${sourceCode}
    `;
    const descriptionById = new Map(descriptions.map((row) => [row.id, row.description]));
    const stateById = new Map(descriptions.map((row) => [row.id, row.allergenState]));
    return records.map((row) => {
      const allergenStatus = resolveIngredientAllergenState({ allergens: row.allergens, allergenStatus: stateById.get(row.id) });
      return {
      name: row.name, normalizedName: row.normalizedName, category: row.category,
      dataOrigin: row.dataOrigin, dataOriginUrl: row.dataOriginUrl, sourceCode: row.sourceCode!,
      sourceVersion: row.sourceVersion, sourceDescription: descriptionById.get(row.id) ?? null,
      baseQuantity: row.baseQuantity.toFixed(2), baseUnit: row.baseUnit,
      allergens: allergenStatus === "UNKNOWN" ? null : row.allergens, allergenStatus,
      containsGluten: row.containsGluten, containsLactose: row.containsLactose, notes: row.notes,
      ...Object.fromEntries(expandedNutrients.map((key) => [key, row[key] === null ? null : row[key].toFixed(2)]))
    } as ExpandedIngredient;
    });
  },
  async insert(row) {
    await prisma.ingredient.create({ data: { ...row, ...allergenStorage(row), source: "BASE_ROTULA", userId: null } });
  },
  isIdentityConflict(error) {
    if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") return false;
    const metadata = "meta" in error ? JSON.stringify(error.meta) : "";
    return metadata.includes("ingredients_base_source_identity_key") || (metadata.includes("dataOrigin") && metadata.includes("sourceCode"));
  }
};

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file || args.some((arg) => arg.startsWith("--") && !["--apply", "--confirm-reviewed-report"].includes(arg))) {
    throw new Error("Uso: import-expanded-base.ts arquivo.json [--apply --confirm-reviewed-report]");
  }
  const input: unknown = JSON.parse(await readFile(file, "utf8"));
  if (!Array.isArray(input)) throw new Error("Esperada uma lista JSON de registros canônicos");
  const dryRun = await importExpandedBase(input, store);
  console.log(JSON.stringify({ mode: "DRY_RUN", report: dryRun }, null, 2));
  if (!args.includes("--apply")) return;
  if (!args.includes("--confirm-reviewed-report")) throw new Error("Escrita exige revisão/autorização e --confirm-reviewed-report");
  if (dryRun.some((row) => row.status === "INVALID" || row.status === "CONFLICT")) throw new Error("Importação bloqueada: resolva os registros inválidos/conflitos antes de aplicar");
  const indexes = await prisma.$queryRaw<{ definition: string }[]>`
    SELECT indexdef AS definition FROM pg_indexes
    WHERE schemaname = current_schema() AND tablename = 'ingredients'
      AND indexname = 'ingredients_base_source_identity_key'
  `;
  const definition = indexes[0]?.definition ?? "";
  if (!definition.includes("UNIQUE INDEX") || !definition.includes('("dataOrigin", "sourceCode")') || !definition.includes("BASE_ROTULA") || !definition.includes("WHERE")) {
    throw new Error("Escrita bloqueada: índice único da identidade não confirmado. A migration preparada exige autorização separada.");
  }
  // Recheck against the DB at write time; partial unique index arbitrates concurrent inserts.
  console.log(JSON.stringify({ mode: "APPLY", report: await importExpandedBase(input, store, true) }, null, 2));
}

main().catch(() => {
  // No raw database error, connection string or source file contents in diagnostics.
  console.error("Importação interrompida. Revise o relatório, as flags de autorização e a estrutura do banco antes de repetir; nenhum registro existente foi atualizado.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());

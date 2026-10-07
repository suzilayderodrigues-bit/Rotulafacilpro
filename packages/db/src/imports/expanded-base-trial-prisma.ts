import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Prisma, PrismaClient } from "@prisma/client";
import { allergenStorage } from "../allergens";
import { demand, hash, storedCanonical, trialPolicy, type RecordData, type TrialSession, type TrialSnapshot } from "./expanded-base-trial";

type Reader = Pick<Prisma.TransactionClient, "$queryRawUnsafe" | "ingredient">;
export function prismaTrialSession(client: Reader): TrialSession {
  return {
    async snapshot(): Promise<TrialSnapshot> {
      const records = async (sql: string) => (await client.$queryRawUnsafe<{ record: RecordData }[]>(sql)).map(row => row.record);
      return {
        ingredients: await records("SELECT to_jsonb(i) AS record FROM ingredients i ORDER BY id"),
        users: await records("SELECT to_jsonb(u) AS record FROM users u ORDER BY id"),
        recipes: await records("SELECT to_jsonb(r) AS record FROM recipes r ORDER BY id"),
        barcodes: await records("SELECT to_jsonb(b) AS record FROM barcodes b ORDER BY id")
      };
    },
    store: {
      async find(origin, code) {
        const records = await client.$queryRawUnsafe<{ record: RecordData }[]>(
          "SELECT to_jsonb(i) AS record FROM ingredients i WHERE source = 'BASE_ROTULA' AND \"dataOrigin\" = $1 AND \"sourceCode\" = $2 ORDER BY id", origin, code
        );
        return records.map(({ record }) => storedCanonical(record));
      },
      async insert(row) {
        await client.ingredient.create({ data: { ...row, ...allergenStorage(row), source: "BASE_ROTULA", userId: null } });
      },
      // A conflict or PostgreSQL error aborts this transaction. No attempt to reuse an aborted tx.
      isIdentityConflict: () => false
    }
  };
}

export async function verifyTrialDatabase(client: Reader, root: string) {
  const history = await client.$queryRawUnsafe<{ migration_name: string; checksum: string; finished_at: unknown; rolled_back_at: unknown }[]>(
    "SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at"
  );
  demand(!history.some(row => !row.finished_at && !row.rolled_back_at), "UNFINISHED_MIGRATION");
  for (const name of trialPolicy.migrations) {
    const completed = history.filter(row => row.migration_name === name && row.finished_at && !row.rolled_back_at);
    demand(completed.length === 1, "REQUIRED_MIGRATION_NOT_COMPLETED");
    demand(completed[0]!.checksum === hash(readFileSync(join(root, "packages/db/prisma/migrations", name, "migration.sql"))), "MIGRATION_CHECKSUM_MISMATCH");
  }
  const columns = await client.$queryRawUnsafe<{ column_name: string; udt_name: string; is_nullable: string }[]>(
    "SELECT column_name, udt_name, is_nullable FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'ingredients' AND column_name IN ('sourceDescription', 'allergenStatus')"
  );
  demand(columns.some(row => row.column_name === "sourceDescription" && row.udt_name === "text" && row.is_nullable === "YES") && columns.some(row => row.column_name === "allergenStatus" && row.udt_name === "IngredientAllergenStatus" && row.is_nullable === "YES"), "REQUIRED_COLUMNS_MISSING");
  const enums = await client.$queryRawUnsafe<{ enumlabel: string }[]>(
    "SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = current_schema() AND t.typname = 'IngredientAllergenStatus' ORDER BY e.enumsortorder"
  );
  demand(JSON.stringify(enums.map(row => row.enumlabel)) === JSON.stringify(["UNKNOWN", "KNOWN", "NONE"]), "REQUIRED_ENUM_MISSING");
  const constraints = await client.$queryRawUnsafe<{ convalidated: boolean; definition: string }[]>(
    "SELECT c.convalidated, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace WHERE n.nspname = current_schema() AND t.relname = 'ingredients' AND c.conname = 'ingredients_allergen_state_consistency' AND c.contype = 'c'"
  );
  demand(constraints.length === 1 && constraints[0]!.convalidated && ["UNKNOWN", "KNOWN", "NONE", "cardinality"].every(text => constraints[0]!.definition.includes(text)), "REQUIRED_CONSTRAINT_MISSING");
  const indexes = await client.$queryRawUnsafe<{ definition: string; valid: boolean; unique: boolean }[]>(
    "SELECT pg_get_indexdef(i.indexrelid) AS definition, i.indisvalid AS valid, i.indisunique AS unique FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = current_schema() AND c.relname = 'ingredients_base_source_identity_key'"
  );
  demand(indexes.length === 1 && indexes[0]!.valid && indexes[0]!.unique && ["(\"dataOrigin\", \"sourceCode\")", "WHERE", "BASE_ROTULA"].every(text => indexes[0]!.definition.includes(text)), "REQUIRED_PARTIAL_UNIQUE_INDEX_MISSING");
}

export async function inTrialTransaction<T>(client: PrismaClient, action: (session: TrialSession) => Promise<T>, root: string) {
  return client.$transaction(async tx => {
    // Stabilize protected tables, then recheck everything before the first INSERT.
    await tx.$executeRawUnsafe("LOCK TABLE ingredients, users, recipes, barcodes IN SHARE ROW EXCLUSIVE MODE");
    await verifyTrialDatabase(tx, root);
    return action(prismaTrialSession(tx));
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 300000 });
}

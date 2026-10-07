import { createHash } from "node:crypto";
import { baseRotulaIngredientImportRows } from "./base-rotula-ingredients";
import { resolveIngredientAllergenState } from "../allergens";
import { expandedNutrients, importExpandedBase, validateExpandedRow, type ExpandedBaseStore, type ExpandedIngredient } from "./expanded-base";

export const trialPolicy = {
  hostname: "ep-lucky-lake-ac4x96r1.sa-east-1.aws.neon.tech",
  filename: "EProjetosRotulafacilprobase-rotula-ampliada (2).xlsx.xlsx",
  bytes: 102469,
  sha256: "afe5c1206766ae7395acad83b401ec1c0ad3533d19aa82ac8ce4bd1b21c65b31",
  identitiesSha256: "c1794906c5171bb9ff54b5efc5d5c26b241bc96f33bfef40a2744e5559d3a137",
  count: 527,
  migrations: ["20261002120000_expanded_base_identity", "20261002130000_ingredient_allergen_status"]
} as const;

export class TrialError extends Error {}
export function demand(condition: unknown, code: string): asserts condition {
  if (!condition) throw new TrialError(code);
}
export function hash(value: string | Buffer) { return createHash("sha256").update(value).digest("hex"); }
export function validateTrialConnection(connection: string | undefined) {
  demand(connection, "DATABASE_URL_REQUIRED");
  let url: URL;
  try { url = new URL(connection); } catch { throw new TrialError("DATABASE_URL_INVALID"); }
  demand(["postgres:", "postgresql:"].includes(url.protocol) && url.hostname === trialPolicy.hostname && (!url.port || url.port === "5432"), "TEST_HOST_REQUIRED");
  demand([...url.searchParams.keys()].every(key => ["sslmode", "channel_binding", "connect_timeout"].includes(key)), "CONNECTION_OVERRIDE_REJECTED");
  demand(!url.searchParams.has("sslmode") || ["require", "verify-ca", "verify-full"].includes(url.searchParams.get("sslmode")!), "TLS_REQUIRED");
  return connection;
}
export function verifyWorkbookBytes(filename: string, content: Buffer) {
  demand(filename === trialPolicy.filename && content.length === trialPolicy.bytes && hash(content) === trialPolicy.sha256, "WORKBOOK_IDENTITY_MISMATCH");
}

export type RecordData = Record<string, unknown>;
export type TrialSnapshot = { ingredients: RecordData[]; users: RecordData[]; recipes: RecordData[]; barcodes: RecordData[] };
export type WorkbookExtraction = { filename: string; bytes: number; sha256: string; rows: { excelRow: number; values: RecordData }[] };
export type TrialSession = { store: ExpandedBaseStore; snapshot(): Promise<TrialSnapshot> };
export type TrialPlan = { inputs: RecordData[]; expected: ExpandedIngredient[]; baseline: TrialSnapshot };

const sourceColumns = ["CaloriesKcal", "CarbohydratesG", "ProteinsG", "TotalFatG", "SaturatedFatG", "TransFatG", "FiberG", "SodiumMg", "SugarsG", "AddedSugarsG", "CalciumMg", "IronMg"];
const identity = (row: RecordData) => JSON.stringify([row.dataOrigin, row.sourceCode]);
const baseRows = (snapshot: TrialSnapshot) => snapshot.ingredients.filter(row => row.source === "BASE_ROTULA");
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]));
  return value;
}
export function snapshotHash(snapshot: unknown) { return hash(JSON.stringify(stable(snapshot))); }

/** Canonical comparison only; never modifies persisted values or legacy records. */
export function storedCanonical(row: RecordData): ExpandedIngredient {
  demand(Array.isArray(row.allergens) && row.allergens.every(value => typeof value === "string"), "STORED_ALLERGENS_INVALID");
  const allergens = row.allergens as string[];
  const allergenStatus = resolveIngredientAllergenState({ allergens, allergenStatus: row.allergenStatus as string | null });
  return validateExpandedRow({
    name: row.name, category: row.category, normalizedName: row.normalizedName,
    dataOrigin: row.dataOrigin, sourceCode: row.sourceCode, sourceVersion: row.sourceVersion,
    sourceDescription: row.sourceDescription, dataOriginUrl: row.dataOriginUrl,
    baseUnit: row.baseUnit, baseQuantity: row.baseQuantity,
    nutrients: Object.fromEntries(expandedNutrients.map(key => [key, row[key]])),
    allergens: allergenStatus === "UNKNOWN" ? null : allergens, allergenStatus,
    containsGluten: row.containsGluten, containsLactose: row.containsLactose, notes: row.notes
  });
}

export function prepareTrial(extraction: WorkbookExtraction, baseline: TrialSnapshot): TrialPlan {
  demand(extraction.filename === trialPolicy.filename && extraction.bytes === trialPolicy.bytes && extraction.sha256 === trialPolicy.sha256 && extraction.rows.length === 662, "EXTRACTION_MISMATCH");
  const historical = baseRows(baseline);
  const historicalKeys = new Set(historical.map(identity));
  const approvedHistorical = new Set(baseRotulaIngredientImportRows.map(row => JSON.stringify([row.dataOrigin, row.sourceCode])));
  demand(historical.length === 15 && historicalKeys.size === 15 && approvedHistorical.size === 15 && [...historicalKeys].every(key => approvedHistorical.has(key)), "HISTORICAL_BASELINE_MISMATCH");
  const inputs: RecordData[] = [];
  for (const { values: row } of extraction.rows) {
    if (row.DataOrigin !== "TACO" || row["Status fonte"] !== "PARCIAL") continue;
    demand(typeof row.SourceCode === "string" && row.SourceCode.trim().length > 0, "CANDIDATE_IDENTITY_MISSING");
    if (historicalKeys.has(JSON.stringify([row.DataOrigin, row.SourceCode]))) continue;
    demand(row.SourceVersion && row.SourceDescription && row.DataOriginUrl, "CANDIDATE_TRACEABILITY_MISSING");
    demand((row.Allergens === null || row.Allergens === undefined || row.Allergens === "") && row.ContainsGluten === null && row.ContainsLactose === null, "APPROVED_DECLARATIONS_CHANGED");
    inputs.push({
      name: row.Nome, category: row.Categoria, dataOrigin: row.DataOrigin, sourceCode: row.SourceCode,
      sourceVersion: row.SourceVersion, sourceDescription: row.SourceDescription, dataOriginUrl: row.DataOriginUrl,
      baseQuantity: row.Base100, baseUnit: row.BaseUnit, notes: row.Observations,
      nutrients: Object.fromEntries(expandedNutrients.map((key, i) => [key, row[sourceColumns[i]!]])),
      allergens: null, allergenStatus: "UNKNOWN", containsGluten: row.ContainsGluten, containsLactose: row.ContainsLactose
    });
  }
  const keys = inputs.map(identity).sort();
  demand(inputs.length === trialPolicy.count && new Set(keys).size === trialPolicy.count && hash(JSON.stringify(keys)) === trialPolicy.identitiesSha256, "AUTHORIZED_MANIFEST_MISMATCH");
  const expected = inputs.map(validateExpandedRow);
  demand(expected.every(row => row.dataOrigin === "TACO" && row.allergenStatus === "UNKNOWN" && row.allergens === null && row.containsGluten === null && row.containsLactose === null), "CANDIDATE_DATA_INVALID");
  return { inputs, expected, baseline };
}

export async function dryRunTrial(session: TrialSession, plan: TrialPlan) {
  const report = await importExpandedBase(plan.inputs, session.store);
  demand(report.length === trialPolicy.count && report.every(row => row.status === "WOULD_CREATE"), "DRY_RUN_MUST_BE_527_NEW");
  return report;
}

export function verifyImported(plan: TrialPlan, after: TrialSnapshot) {
  const originalIds = new Set(plan.baseline.ingredients.map(row => row.id));
  const retained = { ...after, ingredients: after.ingredients.filter(row => originalIds.has(row.id)) };
  demand(snapshotHash(retained) === snapshotHash(plan.baseline), "PROTECTED_SNAPSHOT_CHANGED");
  const added = after.ingredients.filter(row => !originalIds.has(row.id));
  demand(added.length === trialPolicy.count && baseRows(after).length === 542 && after.ingredients.length === plan.baseline.ingredients.length + trialPolicy.count, "FINAL_COUNT_MISMATCH");
  const expected = new Map(plan.expected.map(row => [identity(row), row]));
  const keys = added.map(identity);
  demand(new Set(keys).size === trialPolicy.count && keys.every(key => expected.has(key)), "UNAUTHORIZED_INSERT");
  demand(new Set(baseRows(after).map(identity)).size === 542, "DUPLICATE_BASE_IDENTITY");
  for (const row of added) {
    demand(row.source === "BASE_ROTULA" && row.userId === null && row.dataOrigin === "TACO" && row.allergenStatus === "UNKNOWN" && Array.isArray(row.allergens) && row.allergens.length === 0, "INSERTED_STATE_INVALID");
    demand(snapshotHash(storedCanonical(row)) === snapshotHash(expected.get(identity(row))), "INSERTED_SOURCE_VALUES_CHANGED");
  }
}

/** Caller MUST run this entire function inside ONE database transaction, including idempotency. */
export async function executeAtomicTrial(session: TrialSession, plan: TrialPlan) {
  demand(snapshotHash(await session.snapshot()) === snapshotHash(plan.baseline), "BASELINE_CHANGED_BEFORE_INSERT");
  await dryRunTrial(session, plan);
  const first = await importExpandedBase(plan.inputs, session.store, true);
  demand(first.length === trialPolicy.count && first.every(row => row.status === "CREATED"), "FIRST_IMPORT_NOT_EXACT");
  const afterFirst = await session.snapshot();
  verifyImported(plan, afterFirst);
  const second = await importExpandedBase(plan.inputs, session.store, true);
  demand(second.length === trialPolicy.count && second.every(row => row.status === "EXISTING"), "IDEMPOTENCY_FAILED");
  const afterSecond = await session.snapshot();
  demand(snapshotHash(afterSecond) === snapshotHash(afterFirst), "IDEMPOTENCY_CHANGED_RECORDS");
  verifyImported(plan, afterSecond);
  return { inserted: first.length, secondInserted: 0, baseRotula: 542, historicalPreserved: 15, unknownAllergens: 527 };
}

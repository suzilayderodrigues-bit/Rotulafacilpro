import { normalizeAllergenDeclaration, type IngredientAllergenState } from "../allergens";
/** Canonical JSON staging format. Spreadsheet conversion is separate and must retain source metadata. */
export const expandedNutrients = [
  "caloriesKcal", "carbohydratesG", "proteinsG", "totalFatG", "saturatedFatG",
  "transFatG", "fiberG", "sodiumMg", "sugarsG", "addedSugarsG", "calciumMg", "ironMg"
] as const;

export type ExpandedIngredient = {
  name: string; normalizedName: string; category: string;
  dataOrigin: string; dataOriginUrl: string | null; sourceCode: string;
  sourceVersion: string | null; sourceDescription: string | null;
  baseQuantity: string; baseUnit: "GRAM" | "MILLILITER";
  allergens: string[] | null; allergenStatus: IngredientAllergenState; containsGluten: boolean | null; containsLactose: boolean | null;
  notes: string | null;
} & Record<(typeof expandedNutrients)[number], string | null>;

export interface ExpandedBaseStore {
  find(origin: string, code: string): Promise<ExpandedIngredient[]>;
  /** Must be backed by the BASE_ROTULA partial unique index. */
  insert(row: ExpandedIngredient): Promise<void>;
  isIdentityConflict(error: unknown): boolean;
}
export type ImportResult = { row: number; identity?: string; status: "INVALID" | "CONFLICT" | "EXISTING" | "WOULD_CREATE" | "CREATED"; reasons?: string[] };

function text(value: unknown, field: string, required = false): string | null {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(`${field}: obrigatório`);
    return null;
  }
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field}: texto inválido`);
  // Reject ambiguous source identities instead of changing identifiers silently.
  if ((field === "dataOrigin" || field === "sourceCode") && value !== value.trim()) throw new Error(`${field}: espaços externos na identidade`);
  return value;
}
function decimal(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string" && /^(tr|na|n\/a)$/i.test(value.trim())) return null;
  if (typeof value !== "string" && typeof value !== "number") throw new Error(`${field}: número inválido`);
  const raw = String(value).replace(",", ".");
  // Decimal(10,2): never silently round more precise source data.
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(raw) || !Number.isFinite(Number(raw))) throw new Error(`${field}: decimal não negativo, até 2 casas`);
  return Number(raw).toFixed(2);
}
function flag(value: unknown, field: string): boolean | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "boolean") throw new Error(`${field}: boolean ou null esperado`);
  return value;
}
export function validateExpandedRow(input: unknown): ExpandedIngredient {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Registro inválido");
  const row = input as Record<string, unknown>;
  const allowed = new Set(["name", "normalizedName", "category", "dataOrigin", "dataOriginUrl", "sourceCode", "sourceVersion", "sourceDescription", "baseQuantity", "baseUnit", "nutrients", "allergens", "allergenStatus", "containsGluten", "containsLactose", "notes"]);
  for (const key of Object.keys(row)) if (!allowed.has(key)) throw new Error(`Campo desconhecido: ${key}`);
  const name = text(row.name, "name", true)!;
  const normalizedName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (row.normalizedName !== undefined && row.normalizedName !== normalizedName) throw new Error("normalizedName divergente do nome");
  if (decimal(row.baseQuantity, "baseQuantity") !== "100.00") throw new Error("baseQuantity: deve ser explicitamente 100");
  if (row.baseUnit !== "GRAM" && row.baseUnit !== "MILLILITER") throw new Error("baseUnit: GRAM ou MILLILITER obrigatório");
  const nutrients = row.nutrients;
  if (!nutrients || typeof nutrients !== "object" || Array.isArray(nutrients)) throw new Error("nutrients: objeto obrigatório");
  for (const key of Object.keys(nutrients)) if (!expandedNutrients.includes(key as typeof expandedNutrients[number])) throw new Error(`Nutriente desconhecido: ${key}`);
  const declaration = normalizeAllergenDeclaration(row.allergens, row.allergenStatus);
  const url = text(row.dataOriginUrl, "dataOriginUrl");
  if (url) {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) throw new Error("invalid-url");
    } catch {
      throw new Error("dataOriginUrl: URL http(s) pública válida esperada");
    }
  }
  return {
    name, normalizedName, category: text(row.category, "category", true)!,
    dataOrigin: text(row.dataOrigin, "dataOrigin", true)!, sourceCode: text(row.sourceCode, "sourceCode", true)!,
    dataOriginUrl: url, sourceVersion: text(row.sourceVersion, "sourceVersion"),
    sourceDescription: text(row.sourceDescription, "sourceDescription"), notes: text(row.notes, "notes"),
    baseQuantity: "100.00", baseUnit: row.baseUnit, ...declaration,
    containsGluten: flag(row.containsGluten, "containsGluten"), containsLactose: flag(row.containsLactose, "containsLactose"),
    ...Object.fromEntries(expandedNutrients.map((key) => [key, decimal((nutrients as Record<string, unknown>)[key], key)]))
  } as ExpandedIngredient;
}

export function differingFields(a: ExpandedIngredient, b: ExpandedIngredient): string[] {
  return Object.keys(a).filter((key) => {
    const field = key as keyof ExpandedIngredient;
    return JSON.stringify(a[field]) !== JSON.stringify(b[field]);
  });
}

/** Complete validation/report first. Existing entries are never updated. Invalid/conflicting rows never write. */
export async function importExpandedBase(inputs: unknown[], store: ExpandedBaseStore, apply = false): Promise<ImportResult[]> {
  const report: ImportResult[] = [];
  const prepared = new Map<number, ExpandedIngredient>();
  const identities = new Map<string, number[]>();
  for (const [index, input] of inputs.entries()) {
    try {
      const row = validateExpandedRow(input);
      const identity = JSON.stringify([row.dataOrigin, row.sourceCode]);
      prepared.set(index, row);
      identities.set(identity, [...(identities.get(identity) ?? []), index]);
      report.push({ row: index + 1, identity, status: "WOULD_CREATE" });
    } catch (error) {
      report.push({ row: index + 1, status: "INVALID", reasons: [error instanceof Error ? error.message : "Registro inválido"] });
    }
  }
  for (const indexes of identities.values()) {
    if (indexes.length > 1) for (const index of indexes) {
      const result = report[index];
      if (!result) throw new Error("Relatório inconsistente");
      result.status = "CONFLICT";
      result.reasons = ["Identidade repetida no arquivo: revisão necessária"];
    }
  }
  for (const [index, row] of prepared) {
    const result = report[index];
    if (!result) throw new Error("Relatório inconsistente");
    if (result.status !== "WOULD_CREATE") continue;
    const existing = await store.find(row.dataOrigin, row.sourceCode);
    if (existing.length) {
      const first = existing[0];
      const differences = existing.length === 1 && first ? differingFields(row, first) : ["identidade duplicada no banco"];
      result.status = differences.length ? "CONFLICT" : "EXISTING";
      if (differences.length) result.reasons = differences;
    }
  }
  if (!apply) return report;
  for (const [index, row] of prepared) {
    const result = report[index];
    if (!result) throw new Error("Relatório inconsistente");
    if (result.status !== "WOULD_CREATE") continue;
    try {
      await store.insert(row);
      result.status = "CREATED";
    } catch (error) {
      if (!store.isIdentityConflict(error)) throw error;
      const winner = await store.find(row.dataOrigin, row.sourceCode);
      const first = winner[0];
      if (winner.length !== 1 || !first) throw error;
      const differences = differingFields(row, first);
      result.status = differences.length ? "CONFLICT" : "EXISTING";
      if (differences.length) result.reasons = differences;
    }
  }
  return report;
}

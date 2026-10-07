/** Pure, shared declaration semantics. This module does not import a DB client. */
export type IngredientAllergenState = "UNKNOWN" | "KNOWN" | "NONE";
export type AllergenDeclaration = { allergenStatus: IngredientAllergenState; allergens: string[] | null };

export function normalizeAllergenDeclaration(value: unknown, requested?: unknown): AllergenDeclaration {
  const absent = value === null || value === undefined || value === "";
  if (!absent && (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item.trim()))) {
    throw new Error("allergens: lista de textos ou null esperado");
  }
  const list = absent ? null : value as string[];
  const status = requested ?? (list?.length ? "KNOWN" : "UNKNOWN");
  if (status === "KNOWN" && list?.length) return { allergenStatus: "KNOWN", allergens: [...list] };
  if (status === "UNKNOWN" && !list?.length) return { allergenStatus: "UNKNOWN", allergens: null };
  // NONE requires an explicit state AND explicit empty list. Missing source data never reaches NONE.
  if (status === "NONE" && list && list.length === 0) return { allergenStatus: "NONE", allergens: [] };
  throw new Error("allergens: estado/lista incompatíveis; NONE exige confirmação explícita com lista vazia");
}

export function resolveIngredientAllergenState(ingredient: { allergens: string[]; allergenStatus?: string | null }): IngredientAllergenState {
  const { allergens, allergenStatus } = ingredient;
  if (allergenStatus === null || allergenStatus === undefined) return allergens.length ? "KNOWN" : "UNKNOWN";
  if (allergenStatus === "KNOWN" && allergens.length) return "KNOWN";
  if (allergenStatus === "NONE" && !allergens.length) return "NONE";
  return "UNKNOWN";
}

export function allergenStorage(declaration: AllergenDeclaration) {
  // Prisma scalar lists cannot be nullable: [] is only a storage container, never an absence claim.
  // UNKNOWN remains explicit in the companion state; domain/dry-run keep its value null.
  return { allergenStatus: declaration.allergenStatus, allergens: declaration.allergens ?? [] };
}

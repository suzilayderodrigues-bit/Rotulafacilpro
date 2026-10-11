import type { Ingredient, Prisma } from "@rotula-facil-pro/db";
import { allergenStorage, normalizeAllergenDeclaration, resolveIngredientAllergenState } from "@rotula-facil-pro/db/allergens";
import { ingredientNutrientFields, type IngredientNutrientField } from "./nutrition";
import { resolveLabelFormat, resolveLabelTemplate } from "@/lib/final-label/visual";

export const complementNutrientLabels: Record<IngredientNutrientField, string> = {
  caloriesKcal: "Valor energético (kcal)", carbohydratesG: "Carboidratos (g)", sugarsG: "Açúcares totais (g)",
  addedSugarsG: "Açúcares adicionados (g)", proteinsG: "Proteínas (g)", totalFatG: "Gorduras totais (g)",
  saturatedFatG: "Gorduras saturadas (g)", transFatG: "Gorduras trans (g)", fiberG: "Fibras alimentares (g)",
  sodiumMg: "Sódio (mg)", calciumMg: "Cálcio (mg)", ironMg: "Ferro (mg)"
};

export type ComplementIngredient = Pick<Ingredient, "name" | "allergens" | "allergenStatus" | "containsGluten" | "containsLactose"> &
  Record<IngredientNutrientField, { toString(): string } | string | number | null>;

export function missingIngredientInformation(ingredient: ComplementIngredient) {
  return [
    ...ingredientNutrientFields.filter(field => ingredient[field] === null).map(field => complementNutrientLabels[field]),
    ...(resolveIngredientAllergenState(ingredient) === "UNKNOWN" ? ["Alergênicos"] : []),
    ...(ingredient.containsGluten === null ? ["Glúten"] : []),
    ...(ingredient.containsLactose === null ? ["Lactose"] : [])
  ];
}

export function ingredientComplementHref(recipeId: string, itemId: string, format?: string, template?: string) {
  const context = new URLSearchParams({ format: resolveLabelFormat(format), template: resolveLabelTemplate(template) });
  return `/receitas/${encodeURIComponent(recipeId)}/ingredientes/${encodeURIComponent(itemId)}/completar?${context}`;
}

export class IngredientComplementError extends Error {
  constructor(public readonly code: "source" | "number" | "precision" | "declaration" | "unchanged" | "stale" | "denied") {
    super(code);
  }
}

function text(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// Accept exactly what Decimal(10,2) can store. Never silently round a positive value to zero.
function complementNumber(value: string) {
  const normalized = value.replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(normalized) || normalized.length > 30) throw new IngredientComplementError("number");
  const [rawInteger = "", rawFraction = ""] = normalized.split(".");
  const integer = rawInteger.replace(/^0+(?=\d)/, "");
  const fraction = rawFraction.replace(/0+$/, "");
  if (integer.length > 8 || fraction.length > 2) throw new IngredientComplementError("precision");
  return fraction ? `${integer}.${fraction}` : integer;
}

function complementBoolean(form: FormData, name: string, current: boolean | null) {
  if (current !== null) return current;
  const value = text(form, name);
  if (!value || value === "unknown") return null;
  if (value === "yes") return true;
  if (value === "no") return false;
  throw new IngredientComplementError("declaration");
}

export function buildIngredientComplement(original: Ingredient, form: FormData) {
  const sourceKind = text(form, "sourceKind");
  const sourceReference = text(form, "sourceReference");
  if (!["LABEL", "TECHNICAL_SHEET"].includes(sourceKind) || !sourceReference || sourceReference.length > 500 || text(form, "sameProduct") !== "on") {
    throw new IngredientComplementError("source");
  }
  let changed = false;
  const nutrients = Object.fromEntries(ingredientNutrientFields.map(field => {
    // Known values always come from the database, even if the request is tampered with.
    if (original[field] !== null) return [field, original[field]];
    const value = text(form, field);
    if (!value) return [field, null];
    changed = true;
    return [field, complementNumber(value)];
  })) as Pick<Prisma.IngredientUncheckedCreateInput, IngredientNutrientField>;

  let allergens = [...original.allergens];
  let allergenStatus = original.allergenStatus;
  if (resolveIngredientAllergenState(original) === "UNKNOWN") {
    const requested = text(form, "allergenStatus") || "UNKNOWN";
    const values = text(form, "allergens").split(/[,;\n]+/).map(value => value.trim()).filter(Boolean);
    if (requested !== "UNKNOWN" || values.length) {
      if (text(form, "declarationConfirmed") !== "on") throw new IngredientComplementError("declaration");
      try {
        const declaration = normalizeAllergenDeclaration(requested === "NONE" ? values : values.length ? [...new Set(values)] : null, requested);
        if (declaration.allergenStatus === "UNKNOWN") throw new IngredientComplementError("declaration");
        ({ allergens, allergenStatus } = allergenStorage(declaration));
        changed = true;
      } catch { throw new IngredientComplementError("declaration"); }
    }
  }
  const containsGluten = complementBoolean(form, "containsGluten", original.containsGluten);
  const containsLactose = complementBoolean(form, "containsLactose", original.containsLactose);
  const declarationsChanged = allergenStatus !== original.allergenStatus || containsGluten !== original.containsGluten || containsLactose !== original.containsLactose;
  if (!changed && !declarationsChanged) throw new IngredientComplementError("unchanged");

  const provenance = `Complementação privada de ${original.id}; origem: ${original.dataOrigin}. Fonte informada pela cliente: ${sourceKind === "LABEL" ? "rótulo" : "ficha técnica"} — ${sourceReference}.`;
  const data = {
    name: original.name, normalizedName: original.normalizedName, category: original.category,
    dataOrigin: original.dataOrigin, dataOriginUrl: original.dataOriginUrl, sourceCode: original.sourceCode,
    sourceVersion: original.sourceVersion, baseUnit: original.baseUnit, baseQuantity: original.baseQuantity,
    sourceDescription: [original.sourceDescription, provenance].filter(Boolean).join("\n"),
    notes: original.notes, ...nutrients, allergens, allergenStatus, containsGluten, containsLactose
  } satisfies Omit<Prisma.IngredientUncheckedCreateInput, "id" | "source" | "userId">;
  return { data, declarationsChanged };
}

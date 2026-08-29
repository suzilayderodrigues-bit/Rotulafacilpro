export const ingredientNutrientFields = [
  "caloriesKcal",
  "carbohydratesG",
  "sugarsG",
  "addedSugarsG",
  "proteinsG",
  "totalFatG",
  "saturatedFatG",
  "transFatG",
  "fiberG",
  "sodiumMg",
  "calciumMg",
  "ironMg"
] as const;

export type IngredientNutrientField = (typeof ingredientNutrientFields)[number];
export type NutrientPortionMode = "per100" | "portion";
export type IngredientNutrientInput = Record<IngredientNutrientField, string>;
export type IngredientNutrientValues = Record<IngredientNutrientField, string | null>;

function parseNullableNumber(value: string, multiplier: number) {
  const trimmed = value.trim();

  if (trimmed === "") {
    return null;
  }

  const parsed = Number(trimmed.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("invalid-number");
  }

  const normalized = parsed * multiplier;
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(4);
}

export function normalizeIngredientNutrientsForBase100({
  nutrients,
  portionMode,
  portionSize
}: {
  nutrients: IngredientNutrientInput;
  portionMode: NutrientPortionMode;
  portionSize: number;
}): IngredientNutrientValues {
  if (!Number.isFinite(portionSize) || portionSize <= 0) {
    throw new Error("invalid-portion");
  }

  const multiplier = portionMode === "portion" ? 100 / portionSize : 1;

  return ingredientNutrientFields.reduce<IngredientNutrientValues>((acc, field) => {
    acc[field] = parseNullableNumber(nutrients[field], multiplier);
    return acc;
  }, {} as IngredientNutrientValues);
}

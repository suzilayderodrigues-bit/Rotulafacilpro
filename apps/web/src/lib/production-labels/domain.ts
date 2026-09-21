export type ProductionLabelRecipe = {
  id: string;
  name: string;
};

export type ProductionLabelInput = {
  recipeId: string;
  lot: string;
  manufacturedAt: string;
  expiresAt: string;
};

export type ProductionLabelField = keyof ProductionLabelInput;

export type ProductionLabelValidation = {
  valid: boolean;
  errors: Partial<Record<ProductionLabelField, string>>;
};

export type ProductionLabelPreview = {
  productName: string | null;
  lot: string;
  manufacturedAt: string | null;
  expiresAt: string | null;
};

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;

  return { date, year, month, day };
}

export function formatProductionLabelDate(value: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) return null;
  return `${String(parsed.day).padStart(2, "0")}/${String(parsed.month).padStart(2, "0")}/${parsed.year}`;
}

export function findProductionLabelRecipe(recipes: ProductionLabelRecipe[], recipeId: string) {
  return recipes.find((recipe) => recipe.id === recipeId) ?? null;
}

export function validateProductionLabelInput(
  recipes: ProductionLabelRecipe[],
  input: ProductionLabelInput
): ProductionLabelValidation {
  const errors: ProductionLabelValidation["errors"] = {};
  const recipe = findProductionLabelRecipe(recipes, input.recipeId);
  const manufacturedAt = parseIsoDate(input.manufacturedAt);
  const expiresAt = parseIsoDate(input.expiresAt);

  if (!recipe) errors.recipeId = "Selecione um produto da sua conta.";
  if (!input.lot.trim()) errors.lot = "Informe o lote.";
  if (!manufacturedAt) errors.manufacturedAt = "Informe uma data de fabricação válida.";
  if (!expiresAt) errors.expiresAt = "Informe uma data de validade válida.";
  if (manufacturedAt && expiresAt && expiresAt.date < manufacturedAt.date) {
    errors.expiresAt = "A validade não pode ser anterior à fabricação.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function buildProductionLabelPreview(
  recipes: ProductionLabelRecipe[],
  input: ProductionLabelInput
): ProductionLabelPreview {
  return {
    productName: findProductionLabelRecipe(recipes, input.recipeId)?.name ?? null,
    lot: input.lot.trim(),
    manufacturedAt: formatProductionLabelDate(input.manufacturedAt),
    expiresAt: formatProductionLabelDate(input.expiresAt)
  };
}

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

export const productionLabelFormats = {
  MINI: {
    name: "Mini",
    widthMm: 30,
    heightMm: 20,
    maxNameCharactersPerLine: 16,
    maxNameLines: 2,
    maxLotCharacters: 14
  },
  COMPACTA: {
    name: "Compacta",
    widthMm: 35,
    heightMm: 25,
    maxNameCharactersPerLine: 19,
    maxNameLines: 2,
    maxLotCharacters: 18
  },
  PADRAO: {
    name: "Padrão",
    widthMm: 40,
    heightMm: 25,
    maxNameCharactersPerLine: 22,
    maxNameLines: 2,
    maxLotCharacters: 22
  }
} as const;

export type ProductionLabelFormat = keyof typeof productionLabelFormats;
export const defaultProductionLabelFormat: ProductionLabelFormat = "PADRAO";
export const maximumProductionLabelQuantity = 999;

export type ProductionLabelCompositionAssessment =
  | { status: "READY"; message: null }
  | { status: "CONTENT_OVERFLOW"; message: string };

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

export function formatProductionLabelCompactDate(value: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) return null;
  return `${String(parsed.day).padStart(2, "0")}/${String(parsed.month).padStart(2, "0")}/${String(parsed.year).slice(-2)}`;
}

export function parseProductionLabelQuantity(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > maximumProductionLabelQuantity) return null;
  return quantity;
}

export function productionLabelSummary(quantity: number, format: ProductionLabelFormat) {
  const option = productionLabelFormats[format];
  return `${quantity} ${quantity === 1 ? "etiqueta" : "etiquetas"} • ${option.widthMm} × ${option.heightMm} mm`;
}

function estimatedWrappedLines(text: string, charactersPerLine: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  let lines = 1;
  let lineLength = 0;

  for (const word of words) {
    if (word.length > charactersPerLine) {
      if (lineLength > 0) lines += 1;
      lines += Math.ceil(word.length / charactersPerLine) - 1;
      lineLength = word.length % charactersPerLine;
      continue;
    }
    const nextLength = lineLength === 0 ? word.length : lineLength + 1 + word.length;
    if (nextLength > charactersPerLine) {
      lines += 1;
      lineLength = word.length;
    } else {
      lineLength = nextLength;
    }
  }

  return lines;
}

export function assessProductionLabelComposition(
  preview: ProductionLabelPreview,
  format: ProductionLabelFormat
): ProductionLabelCompositionAssessment {
  const option = productionLabelFormats[format];
  const nameLines = preview.productName
    ? estimatedWrappedLines(preview.productName, option.maxNameCharactersPerLine)
    : 0;
  const lotIsTooLong = preview.lot.length > option.maxLotCharacters;

  if (nameLines > option.maxNameLines || lotIsTooLong) {
    return {
      status: "CONTENT_OVERFLOW",
      message: `Este conteúdo não cabe bem no tamanho ${option.name}. Escolha uma etiqueta maior.`
    };
  }

  return { status: "READY", message: null };
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
    manufacturedAt: formatProductionLabelCompactDate(input.manufacturedAt),
    expiresAt: formatProductionLabelCompactDate(input.expiresAt)
  };
}

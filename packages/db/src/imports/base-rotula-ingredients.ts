import type { IngredientBaseUnit, Prisma } from "@prisma/client";

export const baseRotulaSourcePriority = ["TBCA", "TACO", "IBGE"] as const;

export type BaseRotulaDocumentedSource =
  | (typeof baseRotulaSourcePriority)[number]
  | (string & {});

type NullableNutrientValue = Prisma.Decimal | number | string | null;

export type BaseRotulaNutrients = {
  caloriesKcal?: NullableNutrientValue;
  carbohydratesG?: NullableNutrientValue;
  proteinsG?: NullableNutrientValue;
  totalFatG?: NullableNutrientValue;
  saturatedFatG?: NullableNutrientValue;
  transFatG?: NullableNutrientValue;
  fiberG?: NullableNutrientValue;
  sodiumMg?: NullableNutrientValue;
  sugarsG?: NullableNutrientValue;
  addedSugarsG?: NullableNutrientValue;
  calciumMg?: NullableNutrientValue;
  ironMg?: NullableNutrientValue;
};

export type BaseRotulaIngredientImportRow = {
  name: string;
  normalizedName: string;
  category: string;
  dataOrigin: BaseRotulaDocumentedSource;
  dataOriginUrl?: string | null;
  sourceCode?: string | null;
  sourceVersion?: string | null;
  baseUnit?: IngredientBaseUnit;
  baseQuantity?: Prisma.Decimal | number | string;
  nutrients?: BaseRotulaNutrients;
  allergens?: string[];
  containsGluten?: boolean | null;
  containsLactose?: boolean | null;
  notes?: string | null;
};

export const baseRotulaIngredientImportRows: BaseRotulaIngredientImportRow[] = [
  {
    "name": "Leite integral líquido",
    "normalizedName": "leite integral liquido",
    "category": "Laticínios",
    "dataOrigin": "FABRICANTE - PIRACANJUBA",
    "dataOriginUrl": "https://www.piracanjuba.com.br/produto/leite-integral-piracanjuba-1l",
    "sourceCode": "Leite Integral Piracanjuba 1L",
    "sourceVersion": "Rótulo nutricional consultado em 2026-08-28",
    "baseUnit": "MILLILITER",
    "baseQuantity": "100",
    "nutrients": {
      "caloriesKcal": "58",
      "carbohydratesG": "4.6",
      "proteinsG": "3.1",
      "totalFatG": "3",
      "saturatedFatG": "1.9",
      "transFatG": "0",
      "fiberG": "0",
      "sodiumMg": "61",
      "sugarsG": "4.6",
      "addedSugarsG": "0",
      "calciumMg": "120",
      "ironMg": null
    },
    "allergens": [
      "Leite"
    ],
    "containsGluten": false,
    "containsLactose": true,
    "notes": "Preenchido - fabricante"
  },
  {
    "name": "Leite semidesnatado líquido",
    "normalizedName": "leite semidesnatado liquido",
    "category": "Laticínios",
    "dataOrigin": "FABRICANTE - PIRACANJUBA",
    "dataOriginUrl": "https://www.piracanjuba.com.br/produto/leite-semidesnatado-piracanjuba-a2-1l",
    "sourceCode": "Leite Semidesnatado Piracanjuba",
    "sourceVersion": "Rótulo nutricional consultado em 2026-08-28",
    "baseUnit": "MILLILITER",
    "baseQuantity": "100",
    "nutrients": {
      "caloriesKcal": "42",
      "carbohydratesG": "4.6",
      "proteinsG": "3.1",
      "totalFatG": "1.2",
      "saturatedFatG": "0.8",
      "transFatG": "0",
      "fiberG": "0",
      "sodiumMg": "61",
      "sugarsG": "4.6",
      "addedSugarsG": "0",
      "calciumMg": "120",
      "ironMg": null
    },
    "allergens": [
      "Leite"
    ],
    "containsGluten": false,
    "containsLactose": true,
    "notes": "Preenchido - fabricante"
  },
  {
    "name": "Leite desnatado líquido",
    "normalizedName": "leite desnatado liquido",
    "category": "Laticínios",
    "dataOrigin": "FABRICANTE - PIRACANJUBA",
    "dataOriginUrl": "https://www.piracanjuba.com.br/produto/leite-desnatado-piracanjuba-1l",
    "sourceCode": "Leite Desnatado Piracanjuba 1L",
    "sourceVersion": "Rótulo nutricional consultado em 2026-08-28",
    "baseUnit": "MILLILITER",
    "baseQuantity": "100",
    "nutrients": {
      "caloriesKcal": "34",
      "carbohydratesG": "4.6",
      "proteinsG": "3.1",
      "totalFatG": "0.4",
      "saturatedFatG": "0.2",
      "transFatG": "0",
      "fiberG": "0",
      "sodiumMg": "62",
      "sugarsG": "4.6",
      "addedSugarsG": "0",
      "calciumMg": "122",
      "ironMg": null
    },
    "allergens": [
      "Leite"
    ],
    "containsGluten": false,
    "containsLactose": true,
    "notes": "Preenchido - fabricante"
  },
  {
    "name": "Leite em pó integral",
    "normalizedName": "leite em po integral",
    "category": "Laticínios",
    "dataOrigin": "TACO",
    "dataOriginUrl": "https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf",
    "sourceCode": "459",
    "sourceVersion": "TACO 4ª edição ampliada e revisada (2011)",
    "baseUnit": "GRAM",
    "baseQuantity": "100",
    "nutrients": {
      "caloriesKcal": "497",
      "carbohydratesG": "39.2",
      "proteinsG": "25.4",
      "totalFatG": "26.9",
      "saturatedFatG": "16.3",
      "transFatG": null,
      "fiberG": null,
      "sodiumMg": "323",
      "sugarsG": null,
      "addedSugarsG": null,
      "calciumMg": "890",
      "ironMg": "0.5"
    },
    "allergens": [],
    "containsGluten": null,
    "containsLactose": null,
    "notes": "Preenchido - TACO"
  },
  {
    "name": "Leite em pó desnatado",
    "normalizedName": "leite em po desnatado",
    "category": "Laticínios",
    "dataOrigin": "TACO",
    "dataOriginUrl": "https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf",
    "sourceCode": "456",
    "sourceVersion": "TACO 4ª edição ampliada e revisada (2011)",
    "baseUnit": "GRAM",
    "baseQuantity": "100",
    "nutrients": {
      "caloriesKcal": "362",
      "carbohydratesG": "53",
      "proteinsG": "34.7",
      "totalFatG": "0.9",
      "saturatedFatG": "0.6",
      "transFatG": null,
      "fiberG": null,
      "sodiumMg": "432",
      "sugarsG": null,
      "addedSugarsG": null,
      "calciumMg": "1363",
      "ironMg": "0.9"
    },
    "allergens": [],
    "containsGluten": null,
    "containsLactose": null,
    "notes": "Preenchido - TACO"
  },
  {
    "name": "Leite condensado",
    "normalizedName": "leite condensado",
    "category": "Laticínios",
    "dataOrigin": "TACO",
    "dataOriginUrl": "https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf",
    "sourceCode": "453",
    "sourceVersion": "TACO 4ª edição ampliada e revisada (2011)",
    "baseUnit": "GRAM",
    "baseQuantity": "100",
    "nutrients": {
      "caloriesKcal": "313",
      "carbohydratesG": "57",
      "proteinsG": "7.7",
      "totalFatG": "6.7",
      "saturatedFatG": "4.2",
      "transFatG": null,
      "fiberG": null,
      "sodiumMg": "94",
      "sugarsG": null,
      "addedSugarsG": null,
      "calciumMg": "246",
      "ironMg": "0.1"
    },
    "allergens": [],
    "containsGluten": null,
    "containsLactose": null,
    "notes": "Preenchido - TACO"
  },
  {
    "name": "Creme de leite",
    "normalizedName": "creme de leite",
    "category": "Laticínios",
    "dataOrigin": "TACO",
    "dataOriginUrl": "https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf",
    "sourceCode": "447",
    "sourceVersion": "TACO 4ª edição ampliada e revisada (2011)",
    "baseUnit": "GRAM",
    "baseQuantity": "100",
    "nutrients": {
      "caloriesKcal": "221",
      "carbohydratesG": "4.5",
      "proteinsG": "1.5",
      "totalFatG": "22.5",
      "saturatedFatG": "11.8",
      "transFatG": null,
      "fiberG": null,
      "sodiumMg": "52",
      "sugarsG": null,
      "addedSugarsG": null,
      "calciumMg": "83",
      "ironMg": "0.3"
    },
    "allergens": [],
    "containsGluten": null,
    "containsLactose": null,
    "notes": "Preenchido - TACO"
  },
  {
    "name": "Manteiga com sal",
    "normalizedName": "manteiga com sal",
    "category": "Laticínios",
    "dataOrigin": "TACO",
    "dataOriginUrl": "https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf",
    "sourceCode": "261",
    "sourceVersion": "TACO 4ª edição ampliada e revisada (2011)",
    "baseUnit": "GRAM",
    "baseQuantity": "100",
    "nutrients": {
      "caloriesKcal": "726",
      "carbohydratesG": "0.1",
      "proteinsG": "0.4",
      "totalFatG": "82.4",
      "saturatedFatG": "49.2",
      "transFatG": null,
      "fiberG": null,
      "sodiumMg": "579",
      "sugarsG": null,
      "addedSugarsG": null,
      "calciumMg": "9",
      "ironMg": "0.2"
    },
    "allergens": [],
    "containsGluten": null,
    "containsLactose": null,
    "notes": "Preenchido - TACO"
  },
  {
    "name": "Manteiga sem sal",
    "normalizedName": "manteiga sem sal",
    "category": "Laticínios",
    "dataOrigin": "TACO",
    "dataOriginUrl": "https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf",
    "sourceCode": "262",
    "sourceVersion": "TACO 4ª edição ampliada e revisada (2011)",
    "baseUnit": "GRAM",
    "baseQuantity": "100",
    "nutrients": {
      "caloriesKcal": "758",
      "carbohydratesG": "0",
      "proteinsG": "0.4",
      "totalFatG": "86",
      "saturatedFatG": "51.5",
      "transFatG": null,
      "fiberG": null,
      "sodiumMg": "4",
      "sugarsG": null,
      "addedSugarsG": null,
      "calciumMg": "4",
      "ironMg": null
    },
    "allergens": [],
    "containsGluten": null,
    "containsLactose": null,
    "notes": "Preenchido - TACO"
  },
  {
    "name": "Requeijão",
    "normalizedName": "requeijao",
    "category": "Laticínios",
    "dataOrigin": "TACO",
    "dataOriginUrl": "https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf",
    "sourceCode": "468",
    "sourceVersion": "TACO 4ª edição ampliada e revisada (2011)",
    "baseUnit": "GRAM",
    "baseQuantity": "100",
    "nutrients": {
      "caloriesKcal": "257",
      "carbohydratesG": "2.4",
      "proteinsG": "9.6",
      "totalFatG": "23.4",
      "saturatedFatG": "13.7",
      "transFatG": null,
      "fiberG": null,
      "sodiumMg": "558",
      "sugarsG": null,
      "addedSugarsG": null,
      "calciumMg": "259",
      "ironMg": "0.1"
    },
    "allergens": [],
    "containsGluten": null,
    "containsLactose": null,
    "notes": "Preenchido - TACO"
  },
  {
    "name": "Cream cheese",
    "normalizedName": "cream cheese",
    "category": "Laticínios",
    "dataOrigin": "FABRICANTE - VIGOR",
    "dataOriginUrl": null,
    "sourceCode": "Cream Cheese Vigor",
    "sourceVersion": "Rótulo nutricional consultado em 2026-08-28",
    "baseUnit": "GRAM",
    "baseQuantity": "100",
    "nutrients": {
      "caloriesKcal": "238",
      "carbohydratesG": "7.1",
      "proteinsG": "5.1",
      "totalFatG": "21",
      "saturatedFatG": "16",
      "transFatG": "0.4",
      "fiberG": "0",
      "sodiumMg": "319",
      "sugarsG": "6",
      "addedSugarsG": "0",
      "calciumMg": null,
      "ironMg": null
    },
    "allergens": [],
    "containsGluten": null,
    "containsLactose": null,
    "notes": "Preenchido - fabricante / print"
  },
  {
    "name": "Queijo muçarela",
    "normalizedName": "queijo mucarela",
    "category": "Laticínios",
    "dataOrigin": "TACO",
    "dataOriginUrl": "https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf",
    "sourceCode": "463",
    "sourceVersion": "TACO 4ª edição ampliada e revisada (2011)",
    "baseUnit": "GRAM",
    "baseQuantity": "100",
    "nutrients": {
      "caloriesKcal": "330",
      "carbohydratesG": "3",
      "proteinsG": "22.6",
      "totalFatG": "25.2",
      "saturatedFatG": "14.2",
      "transFatG": null,
      "fiberG": null,
      "sodiumMg": "581",
      "sugarsG": null,
      "addedSugarsG": null,
      "calciumMg": "875",
      "ironMg": "0.3"
    },
    "allergens": [],
    "containsGluten": null,
    "containsLactose": null,
    "notes": "Preenchido - TACO"
  },
  {
    "name": "Queijo parmesão",
    "normalizedName": "queijo parmesao",
    "category": "Laticínios",
    "dataOrigin": "TACO",
    "dataOriginUrl": "https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf",
    "sourceCode": "464",
    "sourceVersion": "TACO 4ª edição ampliada e revisada (2011)",
    "baseUnit": "GRAM",
    "baseQuantity": "100",
    "nutrients": {
      "caloriesKcal": "453",
      "carbohydratesG": "1.7",
      "proteinsG": "35.6",
      "totalFatG": "33.5",
      "saturatedFatG": "19.7",
      "transFatG": null,
      "fiberG": null,
      "sodiumMg": "1844",
      "sugarsG": null,
      "addedSugarsG": null,
      "calciumMg": "992",
      "ironMg": "0.5"
    },
    "allergens": [],
    "containsGluten": null,
    "containsLactose": null,
    "notes": "Preenchido - TACO"
  },
  {
    "name": "Queijo prato",
    "normalizedName": "queijo prato",
    "category": "Laticínios",
    "dataOrigin": "TACO",
    "dataOriginUrl": "https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf",
    "sourceCode": "467",
    "sourceVersion": "TACO 4ª edição ampliada e revisada (2011)",
    "baseUnit": "GRAM",
    "baseQuantity": "100",
    "nutrients": {
      "caloriesKcal": "360",
      "carbohydratesG": "1.9",
      "proteinsG": "22.7",
      "totalFatG": "29.1",
      "saturatedFatG": "16.3",
      "transFatG": null,
      "fiberG": null,
      "sodiumMg": "580",
      "sugarsG": null,
      "addedSugarsG": null,
      "calciumMg": "940",
      "ironMg": "0.3"
    },
    "allergens": [],
    "containsGluten": null,
    "containsLactose": null,
    "notes": "Preenchido - TACO"
  },
  {
    "name": "Queijo minas frescal",
    "normalizedName": "queijo minas frescal",
    "category": "Laticínios",
    "dataOrigin": "TACO",
    "dataOriginUrl": "https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf",
    "sourceCode": "461",
    "sourceVersion": "TACO 4ª edição ampliada e revisada (2011)",
    "baseUnit": "GRAM",
    "baseQuantity": "100",
    "nutrients": {
      "caloriesKcal": "264",
      "carbohydratesG": "3.2",
      "proteinsG": "17.4",
      "totalFatG": "20.2",
      "saturatedFatG": "11.4",
      "transFatG": null,
      "fiberG": null,
      "sodiumMg": "31",
      "sugarsG": null,
      "addedSugarsG": null,
      "calciumMg": "579",
      "ironMg": "0.9"
    },
    "allergens": [],
    "containsGluten": null,
    "containsLactose": null,
    "notes": "Preenchido - TACO"
  }
];

export function buildBaseRotulaIngredientCreateManyInput(
  rows: BaseRotulaIngredientImportRow[] = baseRotulaIngredientImportRows
): Prisma.IngredientCreateManyInput[] {
  return rows.map(({ nutrients = {}, baseQuantity = 100, baseUnit = "GRAM", ...row }) => ({
    ...row,
    ...nutrients,
    baseQuantity,
    baseUnit,
    source: "BASE_ROTULA",
    userId: null,
    allergens: row.allergens ?? [],
    containsGluten: row.containsGluten ?? null,
    containsLactose: row.containsLactose ?? null
  }));
}

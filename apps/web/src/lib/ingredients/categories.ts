export const ingredientCategories = [
  "Laticínios",
  "Sem lactose e vegetais",
  "Açúcares e adoçantes",
  "Chocolates e confeitaria",
  "Farinhas e cereais",
  "Sem glúten",
  "Biscoitos e bases",
  "Frutas",
  "Castanhas e sementes",
  "Óleos e gorduras",
  "Carnes e proteínas",
  "Leguminosas",
  "Massas e pães",
  "Vegetais e tubérculos",
  "Molhos e complementos",
  "Panificação",
  "Temperos"
] as const;

export type IngredientCategory = (typeof ingredientCategories)[number];

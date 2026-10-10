import RecipeIngredientsStepPage from "../ingredientes/page";

/** Keep old bookmarks on the same recipe; editing now includes its composition. */
export default async function EditRecipePage({ params, searchParams }: {
  params: Promise<{ recipeId: string }>;
  searchParams?: Promise<{ erro?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  return RecipeIngredientsStepPage({ params, searchParams: Promise.resolve(query.erro ? { status: `produto-${query.erro}` } : {}) });
}

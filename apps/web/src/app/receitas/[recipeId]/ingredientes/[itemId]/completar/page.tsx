import Link from "next/link";
import { Card, CardHeader, CardTitle, EmptyState } from "@/components/design-system";
import { requireUser } from "@/lib/auth/session";
import { findRecipe } from "@/lib/recipes/repository";
import { ingredientNutrientFields } from "@/lib/ingredients/nutrition";
import { labelPreviewHref, resolveLabelFormat, resolveLabelTemplate } from "@/lib/final-label/visual";
import { ComplementForm } from "./complement-form";

export default async function CompleteIngredientPage({ params, searchParams }: {
  params: Promise<{ recipeId: string; itemId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { recipeId, itemId } = await params;
  const query = searchParams ? await searchParams : {};
  const format = resolveLabelFormat(typeof query.format === "string" ? query.format : undefined);
  const template = resolveLabelTemplate(typeof query.template === "string" ? query.template : undefined);
  const recipe = await findRecipe(user.id, recipeId);
  const item = recipe?.ingredients.find(value => value.id === itemId);
  if (!item || (item.ingredient.source !== "BASE_ROTULA" && item.ingredient.userId !== user.id)) {
    return <main className="mx-auto max-w-2xl p-5"><EmptyState title="Ingrediente não encontrado" description="Este ingrediente não está disponível na receita desta conta." action={<Link href="/receitas">Voltar para receitas</Link>} /></main>;
  }
  const ingredient = item.ingredient;
  return <main className="mx-auto min-h-screen w-full max-w-2xl space-y-5 bg-[var(--background)] p-5">
    <Link href={labelPreviewHref(recipeId, format, template)} className="inline-flex min-h-11 items-center font-semibold underline">Voltar ao mesmo rótulo</Link>
    <Card className="shadow-none">
      <CardHeader><CardTitle>Completar {ingredient.name}</CardTitle></CardHeader>
      <p className="mb-4 text-sm">Preencha somente o que falta. A fonte deve corresponder ao mesmo ingrediente/produto usado em <strong>{recipe?.name}</strong>. Se os valores conhecidos forem diferentes, cadastre outro ingrediente próprio.</p>
      <ComplementForm recipeId={recipeId} itemId={itemId} format={format} template={template} ingredient={{
        id: ingredient.id, name: ingredient.name, baseUnit: ingredient.baseUnit,
        nutrients: Object.fromEntries(ingredientNutrientFields.map(field => [field, ingredient[field]?.toString() ?? null])) as Record<typeof ingredientNutrientFields[number], string | null>,
        allergens: ingredient.allergens, allergenStatus: ingredient.allergenStatus,
        containsGluten: ingredient.containsGluten, containsLactose: ingredient.containsLactose
      }} />
    </Card>
  </main>;
}

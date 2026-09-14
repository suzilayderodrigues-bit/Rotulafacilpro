import Link from "next/link";
import { BookOpen, Pencil, Plus } from "lucide-react";
import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState
} from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { listRecipes } from "@/lib/recipes/repository";
import { DeleteRecipeForm } from "./delete-recipe-form";

type RecipeListItem = Awaited<ReturnType<typeof listRecipes>>[number];

const primaryLinkClasses = "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--brand-tiffany)] bg-[var(--brand-tiffany)] px-4 text-sm font-semibold text-[var(--brand-navy)] transition hover:bg-[#1294a5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-cyan)] focus-visible:ring-offset-2";

const labels = {
  title: "Receitas",
  support: "Cadastre suas receitas para gerar informações nutricionais e preparar seus rótulos.",
  library: "Biblioteca de receitas",
  librarySupport: "Visualize as receitas cadastradas na sua conta.",
  emptyTitle: "Você ainda não cadastrou nenhuma receita",
  emptyDescription:
    "Comece cadastrando sua primeira receita. Depois, o Rotula Fácil Pro poderá usar seus ingredientes e rendimento para preparar as informações nutricionais do produto.",
  liquid: "Líquido",
  solid: "Sólido ou semissólido"
};

function unitLabel(unit: RecipeListItem["finalYieldUnit"]) {
  return unit === "MILLILITER" ? "ml" : "g";
}

function physicalStateLabel(state: RecipeListItem["physicalState"]) {
  return state === "LIQUID" ? labels.liquid : labels.solid;
}

function formatDecimal(value: unknown) {
  if (value === null || value === undefined) return null;

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;

  return numberValue.toLocaleString("pt-BR", {
    maximumFractionDigits: 2
  });
}

function yieldLabel(recipe: RecipeListItem) {
  const amount = formatDecimal(recipe.finalYieldAmount);
  if (!amount) return null;

  return amount + " " + unitLabel(recipe.finalYieldUnit);
}

function unitWeightLabel(recipe: RecipeListItem) {
  const weight = formatDecimal(recipe.unitWeight);
  if (!weight) return null;

  return weight + " " + unitLabel(recipe.finalYieldUnit) + " por unidade";
}

function pluralize(value: number, singular: string, plural: string) {
  return value === 1 ? singular : plural;
}

function RecipeCard({ recipe }: { recipe: RecipeListItem }) {
  const finalYield = yieldLabel(recipe);
  const unitWeight = unitWeightLabel(recipe);
  const ingredientCount = recipe._count.ingredients;

  return (
    <article className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-4 transition hover:border-[#b9e8ef] hover:bg-[var(--surface-muted)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[#e8f7fa] text-[var(--brand-petrol)] ring-1 ring-[rgba(245,158,11,0.2)]">
          <BookOpen className="size-5" />
        </div>
        <Badge variant="secondary">
          {ingredientCount} {pluralize(ingredientCount, "ingrediente", "ingredientes")}
        </Badge>
      </div>

      <div className="min-w-0">
        <h2 className="text-base font-semibold text-[var(--foreground)]">{recipe.name}</h2>
        {recipe.foodCategory ? <p className="mt-1 text-sm text-[var(--muted)]">{recipe.foodCategory}</p> : null}
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[var(--muted)]">Estado físico</dt>
          <dd className="text-right font-medium text-[var(--foreground)]">
            {physicalStateLabel(recipe.physicalState)}
          </dd>
        </div>
        {finalYield ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--muted)]">Rendimento final</dt>
            <dd className="font-semibold text-[var(--brand-petrol)]">{finalYield}</dd>
          </div>
        ) : null}
        {recipe.unitsProduced ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--muted)]">Unidades</dt>
            <dd className="font-medium text-[var(--foreground)]">
              {recipe.unitsProduced} {pluralize(recipe.unitsProduced, "unidade", "unidades")}
            </dd>
          </div>
        ) : null}
        {unitWeight ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--muted)]">Por unidade</dt>
            <dd className="font-medium text-[var(--foreground)]">{unitWeight}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 grid gap-2 border-t border-[var(--border)] pt-4 sm:grid-cols-3">
        <Link href={`/receitas/${recipe.id}`} className="flex h-9 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white text-sm font-semibold text-[var(--brand-petrol)]">
          Abrir
        </Link>
        <Link href={`/receitas/${recipe.id}/editar`} className="flex h-9 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white text-sm font-semibold text-[var(--brand-petrol)]">
          <Pencil className="size-4" />
          Editar
        </Link>
        <DeleteRecipeForm recipeId={recipe.id} />
      </div>
    </article>
  );
}

export default async function RecipesPage({ searchParams }: { searchParams?: Promise<{ status?: string; erro?: string }> }) {
  const user = await requireUser();
  const recipes = await listRecipes(user.id);
  const query = searchParams ? await searchParams : {};

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar activeItem="Receitas" />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl px-5 py-6 lg:px-8 lg:py-8">
            <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <Badge variant="secondary" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-[var(--accent-orange)]" />
                {labels.title}
              </Badge>
              <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">
                    {labels.title}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                    {labels.support}
                  </p>
                </div>
                <Link href="/receitas/nova" className={primaryLinkClasses + " w-full sm:w-auto"}>
                  <Plus className="size-4" />
                  Nova receita
                </Link>
              </div>
            </section>

            {query.status === "excluida" ? <p role="status" className="mb-5 rounded-[var(--radius-md)] border border-[#b9ded5] bg-[#f1faf7] px-4 py-3 text-sm">Receita excluída. O código de barras associado foi preservado.</p> : null}
            {query.erro ? <p role="alert" className="mb-5 rounded-[var(--radius-md)] border border-[#f0c4c0] bg-[var(--error-bg)] px-4 py-3 text-sm">Receita não encontrada nesta conta.</p> : null}

            <Card className="shadow-none">
              <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>{labels.library}</CardTitle>
                  <CardDescription>{labels.librarySupport}</CardDescription>
                </div>
                <Badge variant="secondary">
                  {recipes.length} {pluralize(recipes.length, "receita", "receitas")}
                </Badge>
              </CardHeader>

              {recipes.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {recipes.map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={labels.emptyTitle}
                  description={labels.emptyDescription}
                  action={
                    <Link href="/receitas/nova" className={primaryLinkClasses}>
                      <Plus className="size-4" />
                      Cadastrar primeira receita
                    </Link>
                  }
                />
              )}
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Badge, Card, CardDescription, CardHeader, CardTitle, EmptyState } from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { findRecipe } from "@/lib/recipes/repository";

type RecipeIngredientsStepPageProps = {
  params: Promise<{
    recipeId: string;
  }>;
};

export default async function RecipeIngredientsStepPage({ params }: RecipeIngredientsStepPageProps) {
  const user = await requireUser();
  const { recipeId } = await params;
  const recipe = await findRecipe(user.id, recipeId);

  if (!recipe) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Topbar />
        <div className="flex flex-col lg:flex-row">
          <Sidebar activeItem="Receitas" />
          <div className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-5xl px-5 py-6 lg:px-8 lg:py-8">
              <EmptyState
                title="Receita não encontrada"
                description="A receita solicitada não está disponível para esta conta."
                action={
                  <Link
                    href="/receitas"
                    className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--brand-petrol)] transition hover:bg-[var(--surface-muted)]"
                  >
                    Voltar para receitas
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar activeItem="Receitas" />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-5xl px-5 py-6 lg:px-8 lg:py-8">
            <div className="mb-5">
              <Link
                href="/receitas"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-petrol)] hover:text-[var(--accent-orange)]"
              >
                <ArrowLeft className="size-4" />
                Voltar para receitas
              </Link>
            </div>

            <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <Badge variant="secondary" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-[var(--accent-orange)]" />
                Ingredientes
              </Badge>
              <h1 className="mt-4 text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">
                {recipe.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                A etapa de ingredientes será implementada na próxima sprint.
              </p>
            </section>

            <Card className="shadow-none">
              <CardHeader className="flex-col">
                <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[#e8f7fa] text-[var(--brand-petrol)]">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <CardTitle>Próxima etapa preparada</CardTitle>
                  <CardDescription>
                    A receita foi criada com segurança. A seleção de ingredientes ainda não foi implementada nesta sprint.
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

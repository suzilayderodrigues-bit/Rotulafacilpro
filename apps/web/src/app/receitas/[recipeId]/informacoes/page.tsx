import Link from "next/link";
import { ArrowLeft, Check, Circle, ClipboardList } from "lucide-react";
import { Badge, Card, CardDescription, CardHeader, CardTitle, EmptyState } from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { findRecipe } from "@/lib/recipes/repository";
import { cn } from "@/lib/utils";

type RecipeInformationStepPageProps = {
  params: Promise<{ recipeId: string }>;
};

const steps = ["Produto", "Ingredientes", "Rendimento", "Informações"];

function Stepper() {
  return (
    <ol className="grid gap-2 sm:grid-cols-4" aria-label="Etapas da receita">
      {steps.map((step, index) => {
        const isDone = index < 3;
        const isActive = index === 3;

        return (
          <li
            key={step}
            className={cn(
              "rounded-[var(--radius-md)] border bg-white px-3 py-3 text-sm",
              isActive || isDone ? "border-[#b9e8ef] bg-[#e8f7fa] text-[var(--brand-petrol)]" : "border-[var(--border)] text-[var(--muted)]"
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  isActive || isDone ? "border-[var(--brand-tiffany)] bg-white text-[var(--brand-petrol)]" : "border-[var(--border)] bg-[var(--surface-muted)]"
                )}
              >
                {isDone ? <Check className="size-3.5" /> : isActive ? "4" : <Circle className="size-3" />}
              </span>
              <span className="font-semibold">{step}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default async function RecipeInformationStepPage({ params }: RecipeInformationStepPageProps) {
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
                  <Link href="/receitas" className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--brand-petrol)] transition hover:bg-[var(--surface-muted)]">
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
              <Link href={"/receitas/" + recipe.id + "/rendimento"} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-petrol)] hover:text-[var(--accent-orange)]">
                <ArrowLeft className="size-4" />
                Voltar para rendimento
              </Link>
            </div>

            <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <Badge variant="secondary" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-[var(--accent-orange)]" />
                Informações
              </Badge>
              <h1 className="mt-4 text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">Informações</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                Na próxima etapa vamos revisar as informações do produto.
              </p>
              <p className="mt-3 text-sm font-semibold text-[var(--brand-petrol)]">{recipe.name}</p>
            </section>

            <div className="mb-6"><Stepper /></div>

            <Card className="shadow-none">
              <CardHeader className="flex-col">
                <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[#e8f7fa] text-[var(--brand-petrol)]">
                  <ClipboardList className="size-5" />
                </div>
                <div>
                  <CardTitle>Etapa preparada</CardTitle>
                  <CardDescription>Nenhum campo de ANVISA, alergênicos, glúten, lactose ou porção foi criado nesta sprint.</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

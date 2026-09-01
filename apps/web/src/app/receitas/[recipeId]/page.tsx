import Link from "next/link";
import { Edit3, FlaskConical, Lock, Scale } from "lucide-react";
import { Badge, Button, Card, CardDescription, CardHeader, CardTitle, EmptyState } from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { findRecipe } from "@/lib/recipes/repository";

type RecipeSummaryPageProps = {
  params: Promise<{ recipeId: string }>;
};

function physicalStateLabel(value: string) {
  return value === "LIQUID" ? "Líquido" : "Sólido ou semissólido";
}

function unitLabel(value: string) {
  return value === "MILLILITER" ? "ml" : "g";
}

function formatDecimal(value: unknown) {
  if (value === null || value === undefined) return "Não informado";
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "Não informado";

  return numberValue.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function disclosureLabel(value: string | null) {
  if (value === "CONTAINS") return "Contém";
  if (value === "DOES_NOT_CONTAIN") return "Não contém";
  if (value === "NEEDS_REVIEW") return "Preciso revisar";
  return "Não revisado";
}

function crossContaminationLabel(value: string | null) {
  if (value === "YES") return "Sim";
  if (value === "NO") return "Não";
  if (value === "UNKNOWN") return "Não sei";
  return "Não revisado";
}

export default async function RecipeSummaryPage({ params }: RecipeSummaryPageProps) {
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

  const unit = unitLabel(recipe.finalYieldUnit);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar activeItem="Receitas" />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-5 py-6 lg:px-8 lg:py-8">
            <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <Badge variant="secondary" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-[var(--accent-orange)]" />
                Receita
              </Badge>
              <h1 className="mt-4 text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">{recipe.name}</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)] sm:text-base">
                Resumo com os dados reais já cadastrados para esta receita.
              </p>
            </section>

            <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
              <Card className="shadow-none">
                <CardHeader className="flex-col">
                  <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[#e8f7fa] text-[var(--brand-petrol)]">
                    <Edit3 className="size-5" />
                  </div>
                  <div>
                    <CardTitle>Dados do produto</CardTitle>
                    <CardDescription>Informações básicas da receita.</CardDescription>
                  </div>
                </CardHeader>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                    <dt className="font-semibold text-[var(--muted)]">Categoria</dt>
                    <dd className="mt-1 text-[var(--foreground)]">{recipe.foodCategory || "Não informada"}</dd>
                  </div>
                  <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                    <dt className="font-semibold text-[var(--muted)]">Tipo</dt>
                    <dd className="mt-1 text-[var(--foreground)]">{physicalStateLabel(recipe.physicalState)}</dd>
                  </div>
                  <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                    <dt className="font-semibold text-[var(--muted)]">Ingredientes</dt>
                    <dd className="mt-1 text-[var(--foreground)]">{recipe.ingredients.length}</dd>
                  </div>
                  <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                    <dt className="font-semibold text-[var(--muted)]">Revisão</dt>
                    <dd className="mt-1 text-[var(--foreground)]">{recipe.informationReviewedAt ? "Informações revisadas" : "Não revisada"}</dd>
                  </div>
                </dl>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="flex-col">
                  <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[#e8f7fa] text-[var(--brand-petrol)]">
                    <Scale className="size-5" />
                  </div>
                  <div>
                    <CardTitle>Rendimento</CardTitle>
                    <CardDescription>Valores salvos na etapa anterior.</CardDescription>
                  </div>
                </CardHeader>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                    <dt className="font-semibold text-[var(--muted)]">Rendimento final</dt>
                    <dd className="text-right text-[var(--foreground)]">{formatDecimal(recipe.finalYieldAmount)} {recipe.finalYieldAmount ? unit : ""}</dd>
                  </div>
                  <div className="flex justify-between gap-4 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                    <dt className="font-semibold text-[var(--muted)]">Unidades</dt>
                    <dd className="text-right text-[var(--foreground)]">{recipe.unitsProduced ?? "Não informado"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                    <dt className="font-semibold text-[var(--muted)]">Por unidade</dt>
                    <dd className="text-right text-[var(--foreground)]">{formatDecimal(recipe.unitWeight)} {recipe.unitWeight ? unit : ""}</dd>
                  </div>
                </dl>
              </Card>
            </div>

            <Card className="mt-5 shadow-none">
              <CardHeader className="flex-col">
                <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[#fff8f0] text-[var(--accent-orange)]">
                  <Lock className="size-5" />
                </div>
                <div>
                  <CardTitle>Informações revisadas</CardTitle>
                  <CardDescription>Declarações salvas pela usuária na Etapa 4.</CardDescription>
                </div>
              </CardHeader>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                  <dt className="font-semibold text-[var(--muted)]">Alergênicos</dt>
                  <dd className="mt-1 text-[var(--foreground)]">{recipe.confirmedAllergens.length ? recipe.confirmedAllergens.join(", ") : "Nenhum confirmado"}</dd>
                </div>
                <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                  <dt className="font-semibold text-[var(--muted)]">Glúten</dt>
                  <dd className="mt-1 text-[var(--foreground)]">{disclosureLabel(recipe.glutenStatus)}</dd>
                </div>
                <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                  <dt className="font-semibold text-[var(--muted)]">Lactose</dt>
                  <dd className="mt-1 text-[var(--foreground)]">{disclosureLabel(recipe.lactoseStatus)}</dd>
                </div>
                <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                  <dt className="font-semibold text-[var(--muted)]">Contaminação cruzada</dt>
                  <dd className="mt-1 text-[var(--foreground)]">{crossContaminationLabel(recipe.crossContaminationRisk)}</dd>
                </div>
              </dl>
              {recipe.crossContaminationAllergens.length ? (
                <p className="mt-4 rounded-[var(--radius-md)] border border-[#f4d5b6] bg-[#fff8f0] px-4 py-3 text-sm text-[#8a4b15]">
                  Alergênicos envolvidos em contaminação cruzada: {recipe.crossContaminationAllergens.join(", ")}
                </p>
              ) : null}
            </Card>

            <Card className="mt-5 shadow-none">
              <CardHeader className="flex-col">
                <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[#e8f7fa] text-[var(--brand-petrol)]">
                  <FlaskConical className="size-5" />
                </div>
                <div>
                  <CardTitle>Próxima etapa</CardTitle>
                  <CardDescription>Disponível na próxima etapa.</CardDescription>
                </div>
              </CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={"/receitas/" + recipe.id + "/ingredientes"} className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--brand-petrol)] transition hover:bg-[var(--surface-muted)]">
                  Editar ingredientes
                </Link>
                <Link href={"/receitas/" + recipe.id + "/rendimento"} className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--brand-petrol)] transition hover:bg-[var(--surface-muted)]">
                  Editar rendimento
                </Link>
                <Button type="button" disabled>Gerar tabela nutricional</Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

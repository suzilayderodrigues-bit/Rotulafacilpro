import Link from "next/link";
import { ArrowLeft, Check, Circle, Scale } from "lucide-react";
import { Badge, Card, CardDescription, CardHeader, CardTitle, EmptyState, Toast } from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { findRecipe } from "@/lib/recipes/repository";
import { cn } from "@/lib/utils";
import { YieldForm } from "./yield-form";

type RecipeYieldStepPageProps = {
  params: Promise<{ recipeId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const steps = ["Produto", "Ingredientes", "Rendimento", "Informações"];

const statusMessages: Record<string, string> = {
  rendimento: "Informe um rendimento final maior que zero.",
  unidades: "Informe a quantidade de unidades como número inteiro maior que zero.",
  "peso-unidade": "Informe o peso ou volume por unidade maior que zero.",
  incoerente: "Os valores de rendimento não estão coerentes. Revise o peso final, a quantidade de unidades ou o peso por unidade.",
  "sem-ingredientes": "Adicione pelo menos um ingrediente antes de concluir o rendimento.",
  receita: "Receita não encontrada para esta conta.",
  formulario: "Revise os dados e tente novamente."
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanParam(value: string | string[] | undefined) {
  const parsed = firstParam(value)?.trim();
  return parsed ? parsed : undefined;
}

function unitLabel(physicalState: string) {
  return physicalState === "LIQUID" ? "ml" : "g";
}

function finalYieldLabel(physicalState: string) {
  return physicalState === "LIQUID" ? "Volume final da receita pronta" : "Peso final da receita pronta";
}

function unitWeightLabel(physicalState: string) {
  return physicalState === "LIQUID" ? "Volume de cada unidade" : "Peso de cada unidade";
}

function formatDecimal(value: unknown) {
  if (value === null || value === undefined) return "";
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "";

  return Number.isInteger(numberValue) ? String(numberValue) : numberValue.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function Stepper() {
  return (
    <ol className="grid gap-2 sm:grid-cols-4" aria-label="Etapas da receita">
      {steps.map((step, index) => {
        const isDone = index < 2;
        const isActive = index === 2;

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
                {isDone ? <Check className="size-3.5" /> : isActive ? "3" : <Circle className="size-3" />}
              </span>
              <span className="font-semibold">{step}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default async function RecipeYieldStepPage({ params, searchParams }: RecipeYieldStepPageProps) {
  const user = await requireUser();
  const { recipeId } = await params;
  const query = searchParams ? await searchParams : {};
  const status = cleanParam(query.status);
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

  const unit = unitLabel(recipe.physicalState);
  const hasIngredients = recipe.ingredients.length > 0;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar activeItem="Receitas" />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-5xl px-5 py-6 lg:px-8 lg:py-8">
            <div className="mb-5">
              <Link href={"/receitas/" + recipe.id + "/ingredientes"} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-petrol)] hover:text-[var(--accent-orange)]">
                <ArrowLeft className="size-4" />
                Voltar para ingredientes
              </Link>
            </div>

            <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <Badge variant="secondary" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-[var(--accent-orange)]" />
                Rendimento
              </Badge>
              <h1 className="mt-4 text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">Rendimento</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                Informe quanto a receita rende depois de pronta.
              </p>
              <p className="mt-3 text-sm font-semibold text-[var(--brand-petrol)]">{recipe.name}</p>
            </section>

            <div className="mb-6"><Stepper /></div>

            {status ? (
              <Toast className="mb-5 border-[#f0c4c0]">{statusMessages[status] ?? statusMessages.formulario}</Toast>
            ) : null}

            {!hasIngredients ? (
              <Card className="shadow-none">
                <CardHeader className="flex-col">
                  <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[#fff8f0] text-[var(--accent-orange)]">
                    <Scale className="size-5" />
                  </div>
                  <div>
                    <CardTitle>Adicione ingredientes antes de continuar</CardTitle>
                    <CardDescription>Para concluir o rendimento, esta receita precisa ter pelo menos um ingrediente.</CardDescription>
                  </div>
                </CardHeader>
                <Link href={"/receitas/" + recipe.id + "/ingredientes"} className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--brand-tiffany)] bg-[var(--brand-tiffany)] px-4 text-sm font-semibold text-[var(--brand-navy)] transition hover:bg-[#1294a5] sm:w-auto">
                  Voltar para ingredientes
                </Link>
              </Card>
            ) : (
              <Card className="shadow-none">
                <CardHeader className="flex-col">
                  <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[#e8f7fa] text-[var(--brand-petrol)]">
                    <Scale className="size-5" />
                  </div>
                  <div>
                    <CardTitle>Rendimento da receita pronta</CardTitle>
                    <CardDescription>
                      Preencha dois campos para calcular o terceiro automaticamente. A unidade desta receita é {unit}.
                    </CardDescription>
                  </div>
                </CardHeader>

                <YieldForm
                  recipeId={recipe.id}
                  unitLabel={unit}
                  finalYieldLabel={finalYieldLabel(recipe.physicalState)}
                  unitWeightLabel={unitWeightLabel(recipe.physicalState)}
                  defaultFinalYieldAmount={formatDecimal(recipe.finalYieldAmount)}
                  defaultUnitsProduced={recipe.unitsProduced ? String(recipe.unitsProduced) : ""}
                  defaultUnitWeight={formatDecimal(recipe.unitWeight)}
                />
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}


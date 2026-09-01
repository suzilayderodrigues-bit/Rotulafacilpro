import Link from "next/link";
import { ArrowLeft, Check, Circle, ClipboardList } from "lucide-react";
import { Badge, Button, Card, CardDescription, CardHeader, CardTitle, EmptyState, Input, Label, Toast } from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { updateRecipeInformationAction } from "@/lib/recipes/actions";
import { findRecipe } from "@/lib/recipes/repository";
import { cn } from "@/lib/utils";

type RecipeInformationStepPageProps = {
  params: Promise<{ recipeId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const steps = ["Produto", "Ingredientes", "Rendimento", "Informações"];

const statusMessages: Record<string, string> = {
  revisao: "Confirme que revisou as informações do produto antes de concluir.",
  informacoes: "Revise as opções selecionadas e tente novamente.",
  receita: "Receita não encontrada para esta conta.",
  formulario: "Revise os dados e tente novamente."
};

const glutenOptions = [
  ["CONTAINS", "Contém glúten"],
  ["DOES_NOT_CONTAIN", "Não contém glúten"],
  ["NEEDS_REVIEW", "Preciso revisar"]
] as const;

const lactoseOptions = [
  ["CONTAINS", "Contém lactose"],
  ["DOES_NOT_CONTAIN", "Não contém lactose"],
  ["NEEDS_REVIEW", "Preciso revisar"]
] as const;

const crossContaminationOptions = [
  ["YES", "Sim"],
  ["NO", "Não"],
  ["UNKNOWN", "Não sei"]
] as const;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanParam(value: string | string[] | undefined) {
  const parsed = firstParam(value)?.trim();
  return parsed ? parsed : undefined;
}

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

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function statusDefault(value: string | null | undefined) {
  return value ?? "NEEDS_REVIEW";
}

function crossDefault(value: string | null | undefined) {
  return value ?? "UNKNOWN";
}

export default async function RecipeInformationStepPage({ params, searchParams }: RecipeInformationStepPageProps) {
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

  const allergenSuggestions = uniqueSorted(recipe.ingredients.flatMap((item) => item.ingredient.allergens));
  const hasUnknownAllergens = recipe.ingredients.some((item) => item.ingredient.allergens.length === 0);
  const glutenKnownTrue = recipe.ingredients.some((item) => item.ingredient.containsGluten === true);
  const glutenKnownFalse = recipe.ingredients.some((item) => item.ingredient.containsGluten === false);
  const glutenUnknown = recipe.ingredients.some((item) => item.ingredient.containsGluten === null);
  const lactoseKnownTrue = recipe.ingredients.some((item) => item.ingredient.containsLactose === true);
  const lactoseKnownFalse = recipe.ingredients.some((item) => item.ingredient.containsLactose === false);
  const lactoseUnknown = recipe.ingredients.some((item) => item.ingredient.containsLactose === null);

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
              <h1 className="mt-4 text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">Informações do produto</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                Revise as informações importantes do seu produto antes de continuar.
              </p>
              <p className="mt-3 text-sm font-semibold text-[var(--brand-petrol)]">{recipe.name}</p>
            </section>

            <div className="mb-6"><Stepper /></div>

            {status ? <Toast className="mb-5 border-[#f0c4c0]">{statusMessages[status] ?? statusMessages.formulario}</Toast> : null}

            <form action={updateRecipeInformationAction} className="space-y-5">
              <input type="hidden" name="recipeId" value={recipe.id} />

              <Card className="shadow-none">
                <CardHeader className="flex-col">
                  <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[#e8f7fa] text-[var(--brand-petrol)]">
                    <ClipboardList className="size-5" />
                  </div>
                  <div>
                    <CardTitle>Alergênicos</CardTitle>
                    <CardDescription>Use as sugestões apenas como apoio. A confirmação final é sua.</CardDescription>
                  </div>
                </CardHeader>

                {allergenSuggestions.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-[var(--foreground)]">Encontramos nos ingredientes:</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {allergenSuggestions.map((allergen) => (
                        <label key={allergen} className="flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
                          <input type="checkbox" name="confirmedAllergens" value={allergen} defaultChecked={recipe.confirmedAllergens.includes(allergen)} className="size-4 accent-[var(--brand-tiffany)]" />
                          {allergen}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted)]">Nenhum alergênico conhecido foi encontrado nos metadados dos ingredientes.</p>
                )}

                {hasUnknownAllergens ? (
                  <div className="mt-4 rounded-[var(--radius-md)] border border-[#f4d5b6] bg-[#fff8f0] px-4 py-3 text-sm text-[#8a4b15]">
                    Alguns ingredientes não possuem informações completas sobre alergênicos. Revise antes de continuar.
                  </div>
                ) : null}

                <div className="mt-4">
                  <Label htmlFor="additionalAllergens">Outros alergênicos confirmados, se houver</Label>
                  <Input id="additionalAllergens" name="additionalAllergens" placeholder="Ex.: amendoim, castanhas..." />
                </div>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="flex-col">
                  <div>
                    <CardTitle>Glúten</CardTitle>
                    <CardDescription>Confirme a declaração final. Dados desconhecidos não significam ausência de glúten.</CardDescription>
                  </div>
                </CardHeader>
                <div className="mb-4 space-y-2 text-sm text-[var(--muted)]">
                  {glutenKnownTrue ? <p>Há ingrediente marcado como contém glúten.</p> : null}
                  {glutenKnownFalse ? <p>Há ingrediente com ausência de glúten informada na fonte.</p> : null}
                  {glutenUnknown ? <p>Há ingrediente com informação de glúten desconhecida.</p> : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {glutenOptions.map(([value, label]) => (
                    <label key={value} className="flex min-h-12 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
                      <input type="radio" name="glutenStatus" value={value} defaultChecked={statusDefault(recipe.glutenStatus) === value} required className="size-4 accent-[var(--brand-tiffany)]" />
                      {label}
                    </label>
                  ))}
                </div>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="flex-col">
                  <div>
                    <CardTitle>Lactose</CardTitle>
                    <CardDescription>Mantenha lactose separada dos alergênicos. Não declare zero lactose por inferência.</CardDescription>
                  </div>
                </CardHeader>
                <div className="mb-4 space-y-2 text-sm text-[var(--muted)]">
                  {lactoseKnownTrue ? <p>Há ingrediente marcado como contém lactose.</p> : null}
                  {lactoseKnownFalse ? <p>Há ingrediente com ausência de lactose informada na fonte.</p> : null}
                  {lactoseUnknown ? <p>Há ingrediente com informação de lactose desconhecida.</p> : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {lactoseOptions.map(([value, label]) => (
                    <label key={value} className="flex min-h-12 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
                      <input type="radio" name="lactoseStatus" value={value} defaultChecked={statusDefault(recipe.lactoseStatus) === value} required className="size-4 accent-[var(--brand-tiffany)]" />
                      {label}
                    </label>
                  ))}
                </div>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="flex-col">
                  <div>
                    <CardTitle>Contaminação cruzada</CardTitle>
                    <CardDescription>Essa informação deve ser declarada por você, de acordo com sua produção.</CardDescription>
                  </div>
                </CardHeader>
                <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Existe risco de contaminação cruzada durante a produção?</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {crossContaminationOptions.map(([value, label]) => (
                    <label key={value} className="flex min-h-12 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
                      <input type="radio" name="crossContaminationRisk" value={value} defaultChecked={crossDefault(recipe.crossContaminationRisk) === value} required className="size-4 accent-[var(--brand-tiffany)]" />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="mt-4">
                  <Label htmlFor="crossContaminationAllergens">Se sim, quais alergênicos estão envolvidos?</Label>
                  <Input id="crossContaminationAllergens" name="crossContaminationAllergens" defaultValue={recipe.crossContaminationAllergens.join(", ")} placeholder="Ex.: leite, soja, castanhas..." />
                </div>
              </Card>

              <Card className="shadow-none">
                <label className="flex items-start gap-3 text-sm font-semibold text-[var(--foreground)]">
                  <input type="checkbox" name="reviewed" required className="mt-1 size-4 accent-[var(--accent-orange)]" />
                  Revisei as informações do meu produto.
                </label>

                <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-between">
                  <Link href={"/receitas/" + recipe.id + "/rendimento"} className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--brand-petrol)] transition hover:bg-[var(--surface-muted)]">
                    Voltar
                  </Link>
                  <Button type="submit" className="sm:min-w-40">Concluir receita</Button>
                </div>
              </Card>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

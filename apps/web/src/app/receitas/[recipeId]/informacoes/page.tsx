import { RecipeSteps } from "@/components/layout/recipe-steps";
import Link from "next/link";
import { labelPreviewHref, resolveLabelFormat, resolveLabelTemplate } from "@/lib/final-label/visual";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Badge, Button, Card, CardDescription, CardHeader, CardTitle, EmptyState, Input, Label, Toast } from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { resolveIngredientAllergenState } from "@rotula-facil-pro/db/allergens";
import { ingredientComplementHref } from "@/lib/ingredients/complement";
import { updateRecipeInformationAction } from "@/lib/recipes/actions";
import { findRecipe } from "@/lib/recipes/repository";
import { conditionalAnnexXviCategories } from "@/lib/regulatory";

import { RegulatoryCategoryFields } from "./regulatory-category-fields";
import { RegulatoryPackagingFields } from "./regulatory-packaging-fields";
import { ProcessReview } from "./process-review";

type RecipeInformationStepPageProps = {
  params: Promise<{ recipeId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};



const statusMessages: Record<string, string> = {
  revisao: "Confirme que revisou as informações do produto antes de concluir.",
  informacoes: "Revise as opções selecionadas e tente novamente.",
  receita: "Receita não encontrada para esta conta.",
  formulario: "Revise os dados e tente novamente.",
  "painel-principal": "Informe largura e altura válidas para a frente principal da embalagem.",
  "adicoes-nutrientes": "Responda às três perguntas sobre os ingredientes adicionados."
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


function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanParam(value: string | string[] | undefined) {
  const parsed = firstParam(value)?.trim();
  return parsed ? parsed : undefined;
}



function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function statusDefault(value: string | null | undefined) {
  return value ?? "NEEDS_REVIEW";
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

  const allergenSuggestions = uniqueSorted([
    ...recipe.ingredients.flatMap((item) => item.ingredient.allergens),
    ...recipe.confirmedAllergens
  ]);
  const hasUnknownAllergens = recipe.ingredients.some((item) => resolveIngredientAllergenState(item.ingredient) === "UNKNOWN");
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
                Voltar ao rendimento do Meu produto
              </Link>
            </div>

            <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <Badge variant="secondary" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-[var(--accent-orange)]" />
                Meu rótulo
              </Badge>
              <h1 className="mt-4 text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">Completar meu rótulo</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                Revise as informações importantes do seu produto antes de continuar.
              </p>
              <p className="mt-3 text-sm font-semibold text-[var(--brand-petrol)]">{recipe.name}</p>
            </section>

            <div className="mb-6"><RecipeSteps current={3} recipeId={recipe.id} detail="Resolver informações pendentes" /></div>

            {status ? <Toast className="mb-5 border-[#f0c4c0]">{statusMessages[status] ?? statusMessages.formulario}</Toast> : null}

            <form action={updateRecipeInformationAction} className="space-y-5">
              <input type="hidden" name="recipeId" value={recipe.id} />
              <input type="hidden" name="returnTo" value={query.returnTo === "label" ? "label" : ""} />
              <input type="hidden" name="format" value={resolveLabelFormat(typeof query.format === "string" ? query.format : undefined)} />
              <input type="hidden" name="template" value={resolveLabelTemplate(typeof query.template === "string" ? query.template : undefined)} />

              <details id="enquadramento" open={!recipe.regulatoryCategory || !recipe.packagingCondition || (recipe.packagingCondition === "PACKAGED_IN_ABSENCE_OF_CONSUMER" && (!recipe.mainPanelWidthCm || !recipe.mainPanelHeightCm)) || (conditionalAnnexXviCategories.includes(recipe.regulatoryCategory) && [recipe.addedSugarsAddition, recipe.saturatedFatAddition, recipe.sodiumAddition].some(value => !value || value === "UNKNOWN"))} className="rounded border bg-white p-3">
              <summary className="cursor-pointer text-sm font-semibold">Tipo de produto e embalagem · conferir ou editar</summary>
              <RegulatoryCategoryFields
                defaultCategory={recipe.regulatoryCategory}
                defaultAddedSugarsAddition={recipe.addedSugarsAddition}
                defaultSaturatedFatAddition={recipe.saturatedFatAddition}
                defaultSodiumAddition={recipe.sodiumAddition}
              />

              <RegulatoryPackagingFields
                defaultCondition={recipe.packagingCondition}
                defaultWidthCm={recipe.mainPanelWidthCm?.toString() ?? ""}
                defaultHeightCm={recipe.mainPanelHeightCm?.toString() ?? ""}
              />
              </details>

              <details id="alergenicos" open={hasUnknownAllergens || !recipe.informationReviewedAt || allergenSuggestions.some(value => !recipe.confirmedAllergens.includes(value))} className="rounded border bg-white p-3">
              <summary className="cursor-pointer text-sm font-semibold">Alergênicos · {hasUnknownAllergens ? "há ingredientes com informação desconhecida" : "conferir declarações"}</summary>
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
                    Alguns ingredientes têm alergênicos não determinados. Isso não significa ausência. O PDF do rótulo ficará bloqueado para revisão enquanto essa informação estiver desconhecida.
                    <ul className="mt-2 space-y-2">{recipe.ingredients.filter(item => resolveIngredientAllergenState(item.ingredient) === "UNKNOWN").map(item => <li key={item.id}>{item.ingredient.name}<Link href={ingredientComplementHref(recipe.id, item.id, typeof query.format === "string" ? query.format : undefined, typeof query.template === "string" ? query.template : undefined)} className="ml-2 inline-flex min-h-11 items-center underline">Completar informação somente nesta receita</Link></li>)}</ul>
                  </div>
                ) : null}

                <div className="mt-4">
                  <Label htmlFor="additionalAllergens">Outros alergênicos confirmados, se houver</Label>
                  <Input id="additionalAllergens" name="additionalAllergens" placeholder="Ex.: amendoim, castanhas..." />
                </div>
              </Card>

              </details>
              <details id="gluten" open={!recipe.glutenStatus || recipe.glutenStatus === "NEEDS_REVIEW"} className="rounded border bg-white p-3">
              <summary className="cursor-pointer text-sm font-semibold">Glúten · {recipe.glutenStatus === "CONTAINS" ? "contém, já confirmado" : recipe.glutenStatus === "DOES_NOT_CONTAIN" ? "declaração já confirmada" : "confirmar informação"}</summary>
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

              </details>
              <details id="lactose" open={!recipe.lactoseStatus || recipe.lactoseStatus === "NEEDS_REVIEW"} className="rounded border bg-white p-3">
              <summary className="cursor-pointer text-sm font-semibold">Lactose · {recipe.lactoseStatus === "CONTAINS" ? "contém, já confirmado" : recipe.lactoseStatus === "DOES_NOT_CONTAIN" ? "declaração já confirmada" : "confirmar informação"}</summary>
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

              </details>
              <ProcessReview defaultRisk={recipe.crossContaminationRisk} defaultAllergens={recipe.crossContaminationAllergens} />

              <Card className="shadow-none">
                <label className="flex items-start gap-3 text-sm font-semibold text-[var(--foreground)]">
                  <input type="checkbox" name="reviewed" required className="mt-1 size-4 accent-[var(--accent-orange)]" />
                  Revisei as informações do meu produto.
                </label>

                <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-between">
                  <Link href={query.returnTo === "label" ? labelPreviewHref(recipe.id, resolveLabelFormat(typeof query.format === "string" ? query.format : undefined), resolveLabelTemplate(typeof query.template === "string" ? query.template : undefined)) : "/receitas/" + recipe.id + "/rendimento"} className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--brand-petrol)] transition hover:bg-[var(--surface-muted)]">
                    Voltar
                  </Link>
                  <Button type="submit" className="sm:min-w-40">{query.returnTo === "label" ? "Salvar e atualizar meu rótulo" : "Salvar revisão e ver resumo"}</Button>
                </div>
              </Card>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

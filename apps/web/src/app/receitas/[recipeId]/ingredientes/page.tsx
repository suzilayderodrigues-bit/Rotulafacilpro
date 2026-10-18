import { RecipeSteps } from "@/components/layout/recipe-steps";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
  Toast
} from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { removeRecipeIngredientAction, updateRecipeIngredientAction } from "@/lib/recipes/actions";
import { IngredientSelector } from "./ingredient-selector";
import { searchAccessibleIngredients } from "@/lib/ingredients/repository";
import { findRecipe } from "@/lib/recipes/repository";
import { cn } from "@/lib/utils";
import { RecipeComposition } from "./recipe-composition";
import { CustomIngredientForm } from "@/app/ingredientes/_components/custom-ingredient-form";
import { ingredientComplementHref, missingIngredientInformation } from "@/lib/ingredients/complement";

type RecipeIngredientsStepPageProps = {
  params: Promise<{ recipeId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type RecipeItem = NonNullable<Awaited<ReturnType<typeof findRecipe>>>["ingredients"][number];



const statusMessages: Record<string, string> = {
  "produto-salvo": "Dados da receita salvos. Continue adicionando ingredientes aqui.",
  "produto-nome": "Informe o nome do produto.",
  "produto-tipo": "Selecione sólido/semissólido ou líquido.",
  "produto-formulario": "Não foi possível salvar os dados da receita. Revise e tente novamente.",
  "ingrediente-proprio-criado": "Ingrediente próprio cadastrado. Busque pelo nome e informe a quantidade para adicioná-lo.",
  "ingrediente-proprio-invalido": "Revise os dados do ingrediente próprio e tente novamente.",
  adicionado: "Ingrediente adicionado à receita.",
  atualizado: "Quantidade atualizada.",
  removido: "Ingrediente removido da receita.",
  quantidade: "Informe uma quantidade maior que zero.",
  duplicado: "Este ingrediente já foi adicionado à receita.",
  unidade: "A unidade do ingrediente não é compatível com a receita.",
  ingrediente: "Ingrediente não encontrado para esta conta.",
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

function unitLabel(unit: string) {
  return unit === "MILLILITER" ? "ml" : "g";
}

function sourceLabel(source: string) {
  return source === "CUSTOM" ? "Meu ingrediente" : "Base Rotula";
}



function RecipeIngredientRow({ item, recipeId, format, template }: { item: RecipeItem; recipeId: string; format?: string; template?: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">{item.ingredient.name}</h3>
          <p className="mt-1 text-xs font-medium text-[var(--muted)]">{sourceLabel(item.ingredient.source)}</p>
          {missingIngredientInformation(item.ingredient).length ? <details className="mt-2 text-sm"><summary className="min-h-11 cursor-pointer py-2 text-[var(--muted)]">Mais opções deste ingrediente</summary><Link href={ingredientComplementHref(recipeId, item.id, format, template)} className="inline-flex min-h-11 items-center font-semibold underline">Complementar informações nesta receita</Link></details> : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form action={updateRecipeIngredientAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="recipeId" value={recipeId} />
            <input type="hidden" name="recipeIngredientId" value={item.id} />
            <input type="hidden" name="unit" value={item.unit} />
            <Label htmlFor={`amount-saved-${item.id}`} className="sr-only">Quantidade de {item.ingredient.name}</Label>
            <Input id={`amount-saved-${item.id}`} name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" defaultValue={Number(item.amount)} required className="w-24" />
            <span className="text-sm">{unitLabel(item.unit)}</span>
            <Button type="submit" variant="outline" className="h-9">Salvar</Button>
          </form>
          <form action={removeRecipeIngredientAction}>
            <input type="hidden" name="recipeId" value={recipeId} />
            <input type="hidden" name="recipeIngredientId" value={item.id} />
            <Button type="submit" variant="outline" className="h-9 w-full sm:w-auto">
              <Trash2 className="size-4" />
              Remover
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default async function RecipeIngredientsStepPage({ params, searchParams }: RecipeIngredientsStepPageProps) {
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

  const canContinue = recipe.ingredients.length > 0;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar activeItem="Receitas" />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-5 py-6 lg:px-8 lg:py-8">
            <div className="mb-5">
              <Link href="/receitas" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--brand-petrol)] hover:text-[var(--accent-orange)]">
                Voltar para receitas
              </Link>
            </div>

            <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <Badge variant="secondary" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-[var(--accent-orange)]" />
                Minha receita
              </Badge>
              <h1 className="mt-4 text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">{recipe.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                Adicione os ingredientes e informe quanto você usa nesta receita.
              </p>
            </section>

            {status ? (
              <Toast className={cn("mb-5", !["adicionado", "removido", "atualizado", "produto-salvo", "ingrediente-proprio-criado"].includes(status) && "border-[#f0c4c0]")}>{statusMessages[status] ?? statusMessages.formulario}</Toast>
            ) : null}

            <RecipeComposition key={JSON.stringify([recipe.id, recipe.name, recipe.foodCategory, recipe.physicalState])} recipe={{ id: recipe.id, name: recipe.name, foodCategory: recipe.foodCategory, physicalState: recipe.physicalState }}>
            <RecipeSteps current={1} recipeId={recipe.id} detail="Nome, ingredientes e quantidades" />
            <div className="grid gap-6">
              <Card className="shadow-none">
                <CardHeader className="flex-col gap-3">
                  <div>
                    <CardTitle>Ingredientes disponíveis</CardTitle>
                    <CardDescription>Busque na Base Rotula ou nos seus ingredientes cadastrados.</CardDescription>
                  </div>
                </CardHeader>

                <IngredientSelector recipeId={recipe.id} customIngredientHref="#ingrediente-proprio" addedIds={recipe.ingredients.map((item) => item.ingredientId)} initialPage={await searchAccessibleIngredients(user.id, "", 0)} />
                <details id="ingrediente-proprio" open={status === "ingrediente-proprio-invalido"} className="mt-5 rounded-md border p-3">
                  <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">Cadastrar ingrediente próprio nesta receita</summary>
                  <p className="my-3 text-sm text-[var(--muted)]">Copie os dados da embalagem. Depois de cadastrar, selecione o ingrediente e informe quanto usou.</p>
                  <CustomIngredientForm mode="create" returnRecipeId={recipe.id} />
                </details>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Ingredientes da receita</CardTitle>
                    <CardDescription>Itens adicionados sem cálculo nutricional nesta etapa.</CardDescription>
                  </div>
                  <Badge variant="secondary">{recipe.ingredients.length} item{recipe.ingredients.length === 1 ? "" : "s"}</Badge>
                </CardHeader>

                {recipe.ingredients.length > 0 ? (
                  <div className="space-y-3">
                    {recipe.ingredients.map((item) => (
                      <RecipeIngredientRow key={item.id} item={item} recipeId={recipe.id} format={cleanParam(query.format)} template={cleanParam(query.template)} />
                    ))}
                  </div>
                ) : (
                  <EmptyState title="Você ainda não adicionou ingredientes a esta receita." description="Escolha um ingrediente disponível e informe a quantidade usada." />
                )}

                <div className="mt-5 border-t border-[var(--border)] pt-5">
                  {canContinue ? (
                    <Link href={"/receitas/" + recipe.id + "/rendimento"} className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--brand-tiffany)] bg-[var(--brand-tiffany)] px-4 text-sm font-semibold text-[var(--brand-navy)] transition hover:bg-[#1294a5]">
                      Continuar para Meu produto
                    </Link>
                  ) : (
                    <Button type="button" className="w-full" disabled>Continuar para Meu produto</Button>
                  )}
                </div>
              </Card>
            </div>
            </RecipeComposition>
          </div>
        </div>
      </div>
    </main>
  );
}



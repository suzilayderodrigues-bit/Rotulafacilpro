import Link from "next/link";
import { Check, Circle, Trash2 } from "lucide-react";
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
import { findRecipe } from "@/lib/recipes/repository";
import { cn } from "@/lib/utils";

type RecipeIngredientsStepPageProps = {
  params: Promise<{ recipeId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type RecipeItem = NonNullable<Awaited<ReturnType<typeof findRecipe>>>["ingredients"][number];

const steps = ["Produto", "Ingredientes", "Rendimento", "Informações"];

const statusMessages: Record<string, string> = {
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

function Stepper() {
  return (
    <ol className="grid gap-2 sm:grid-cols-4" aria-label="Etapas da receita">
      {steps.map((step, index) => {
        const isDone = index === 0;
        const isActive = index === 1;

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
                {isDone ? <Check className="size-3.5" /> : isActive ? "2" : <Circle className="size-3" />}
              </span>
              <span className="font-semibold">{step}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function RecipeIngredientRow({ item, recipeId }: { item: RecipeItem; recipeId: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">{item.ingredient.name}</h3>
          <p className="mt-1 text-xs font-medium text-[var(--muted)]">{sourceLabel(item.ingredient.source)}</p>
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
              <Link href={`/receitas/${recipe.id}/editar`} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-petrol)] hover:text-[var(--accent-orange)]">
                Voltar aos dados do produto
              </Link>
            </div>

            <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <Badge variant="secondary" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-[var(--accent-orange)]" />
                Ingredientes
              </Badge>
              <h1 className="mt-4 text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">Ingredientes</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                Adicione os ingredientes e informe quanto você usa nesta receita.
              </p>
              <p className="mt-3 text-sm font-semibold text-[var(--brand-petrol)]">{recipe.name}</p>
            </section>

            <div className="mb-6"><Stepper /></div>

            {status ? (
              <Toast className={cn("mb-5", !["adicionado", "removido", "atualizado"].includes(status) && "border-[#f0c4c0]")}>{statusMessages[status] ?? statusMessages.formulario}</Toast>
            ) : null}

            <div className="grid gap-6">
              <Card className="shadow-none">
                <CardHeader className="flex-col gap-3">
                  <div>
                    <CardTitle>Ingredientes disponíveis</CardTitle>
                    <CardDescription>Busque na Base Rotula ou nos seus ingredientes cadastrados.</CardDescription>
                  </div>
                </CardHeader>

                <IngredientSelector recipeId={recipe.id} addedIds={recipe.ingredients.map((item) => item.ingredientId)} />
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
                      <RecipeIngredientRow key={item.id} item={item} recipeId={recipe.id} />
                    ))}
                  </div>
                ) : (
                  <EmptyState title="Você ainda não adicionou ingredientes a esta receita." description="Escolha um ingrediente disponível e informe a quantidade usada." />
                )}

                <div className="mt-5 border-t border-[var(--border)] pt-5">
                  {canContinue ? (
                    <Link href={"/receitas/" + recipe.id + "/rendimento"} className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--brand-tiffany)] bg-[var(--brand-tiffany)] px-4 text-sm font-semibold text-[var(--brand-navy)] transition hover:bg-[#1294a5]">
                      Continuar
                    </Link>
                  ) : (
                    <Button type="button" className="w-full" disabled>Continuar</Button>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}



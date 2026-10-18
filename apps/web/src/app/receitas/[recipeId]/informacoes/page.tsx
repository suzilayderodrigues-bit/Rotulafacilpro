import { RecipeSteps } from "@/components/layout/recipe-steps";
import Link from "next/link";
import { labelPreviewHref, resolveLabelFormat, resolveLabelTemplate } from "@/lib/final-label/visual";
import { ArrowLeft } from "lucide-react";
import { Badge, Button, Card, EmptyState, Toast } from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";

import { updateRecipeInformationAction } from "@/lib/recipes/actions";
import { findRecipe } from "@/lib/recipes/repository";

import { ProductInformationSection } from "./product-information-section";

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

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanParam(value: string | string[] | undefined) {
  const parsed = firstParam(value)?.trim();
  return parsed ? parsed : undefined;
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
                Meu produto
              </Badge>
              <h1 className="mt-4 text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">Informações do produto</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                Revise as informações importantes do seu produto antes de continuar.
              </p>
              <p className="mt-3 text-sm font-semibold text-[var(--brand-petrol)]">{recipe.name}</p>
            </section>

            <div className="mb-6"><RecipeSteps current={2} recipeId={recipe.id} detail="Resolver informações pendentes" /></div>

            {status ? <Toast className="mb-5 border-[#f0c4c0]">{statusMessages[status] ?? statusMessages.formulario}</Toast> : null}

            <form action={updateRecipeInformationAction} className="space-y-5">
              <input type="hidden" name="recipeId" value={recipe.id} />
              <input type="hidden" name="returnTo" value={query.returnTo === "label" ? "label" : ""} />
              <input type="hidden" name="format" value={resolveLabelFormat(typeof query.format === "string" ? query.format : undefined)} />
              <input type="hidden" name="template" value={resolveLabelTemplate(typeof query.template === "string" ? query.template : undefined)} />

              <ProductInformationSection recipe={recipe} format={typeof query.format === "string" ? query.format : undefined} template={typeof query.template === "string" ? query.template : undefined} />
              <Card className="shadow-none">
                <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-between">
                  <Link href={query.returnTo === "label" ? labelPreviewHref(recipe.id, resolveLabelFormat(typeof query.format === "string" ? query.format : undefined), resolveLabelTemplate(typeof query.template === "string" ? query.template : undefined)) : "/receitas/" + recipe.id + "/rendimento"} className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--brand-petrol)] transition hover:bg-[var(--surface-muted)]">
                    Voltar
                  </Link>
                  <Button type="submit" className="sm:min-w-40">{query.returnTo === "label" ? "Salvar e atualizar minha tabela" : "Salvar revisão e ver resumo"}</Button>
                </div>
              </Card>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

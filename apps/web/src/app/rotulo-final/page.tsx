import { RecipeSteps } from "@/components/layout/recipe-steps";
import Link from "next/link";
import { Badge, Button, Card, CardDescription, CardHeader, CardTitle, EmptyState, Label } from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { NutritionFactsTable } from "@/components/nutrition/nutrition-facts-table";
import { FrontOfPackNutritionPreview } from "@/components/nutrition/front-of-pack-nutrition-preview";
import { requireUser } from "@/lib/auth/session";
import { buildFinalLabelPreview } from "@/lib/final-label/preview";
import { groupedFinalLabelPending } from "@/lib/final-label/pending";
import { ingredientComplementHref } from "@/lib/ingredients/complement";
import { Suspense } from "react";
import { LabelSelectionMemory } from "./selection-memory";
import { resolveLabelFormat, resolveLabelTemplate } from "@/lib/final-label/visual";
import { listRecipes } from "@/lib/recipes/repository";
import { prepareNutritionTableProduction } from "@/lib/nutrition-table/export";
import { LegacyLabelEditor } from "./legacy-label-editor";

function yieldLabel(value: unknown, unit: string) {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return `${amount.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${unit === "MILLILITER" ? "ml" : "g"}`;
}

export default async function FinalLabelPage({ searchParams }: {
  searchParams?: Promise<{ recipeId?: string; format?: string; template?: string }>;
}) {
  const user = await requireUser();
  const recipes = await listRecipes(user.id);
  const query = searchParams ? await searchParams : {};
  const requestedRecipeId = typeof query.recipeId === "string" ? query.recipeId : undefined;
  const format = resolveLabelFormat(typeof query.format === "string" ? query.format : undefined);
  const template = resolveLabelTemplate(typeof query.template === "string" ? query.template : undefined);
  const selectedRecipeId = requestedRecipeId;
  const preview = selectedRecipeId ? await buildFinalLabelPreview(selectedRecipeId, user.id) : null;
  const tableProduction = preview ? prepareNutritionTableProduction(preview) : null;
  const pendingGroups = preview ? groupedFinalLabelPending(preview, format, template) : [];

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {preview ? <Suspense fallback={null}><LabelSelectionMemory recipeId={preview.recipeId} /></Suspense> : null}
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar activeItem="Minha tabela" recipeId={preview?.recipeId} />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl space-y-5 px-5 py-6 lg:px-8 lg:py-8">
            <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 sm:p-6">
              <Badge variant="secondary">Minha tabela</Badge>
              <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">Minha tabela</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">Confira a tabela nutricional calculada, a avaliação da lupa e as informações obrigatórias que faltam.</p>
            </section>

            {preview ? <><RecipeSteps current={3} recipeId={preview.recipeId} detail="Tabela nutricional e lupa frontal" /><Link href={`/receitas/${preview.recipeId}/rendimento`} className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--brand-petrol)]">Voltar para Meu produto</Link><Link href={`/receitas/${preview.recipeId}/informacoes`} className="ml-4 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--brand-petrol)]">Revisar declarações do produto</Link></> : null}
            {recipes.length === 0 ? (
              <EmptyState title="Crie sua primeira receita para calcular a tabela." description="Cadastre ingredientes e rendimento para visualizar os valores nutricionais disponíveis." action={<Link href="/receitas/nova" className="inline-flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--brand-tiffany)] px-4 font-semibold text-[var(--brand-navy)]">Criar receita</Link>} />
            ) : (
              <>
                <Card>
                  <CardHeader className="flex-col"><CardTitle>Selecionar receita</CardTitle><CardDescription>Somente receitas da sua conta aparecem aqui.</CardDescription></CardHeader>
                  <form method="GET" action="/rotulo-final" className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <input type="hidden" name="format" value={format} />
                    <input type="hidden" name="template" value={template} />
                    <div className="min-w-0 flex-1">
                      <Label htmlFor="recipeId">Receita</Label>
                      <select id="recipeId" name="recipeId" defaultValue={preview?.recipeId ?? ""} className="mt-1 h-10 w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 text-sm">
                        {!preview ? <option value="">Selecione uma receita</option> : null}
                        {recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name} · {recipe.physicalState === "LIQUID" ? "Líquido" : "Sólido/semissólido"}{yieldLabel(recipe.finalYieldAmount, recipe.finalYieldUnit) ? ` · ${yieldLabel(recipe.finalYieldAmount, recipe.finalYieldUnit)}` : ""}</option>)}
                      </select>
                    </div>
                    <Button type="submit" className="w-full sm:w-auto">Ver tabela</Button>
                  </form>
                </Card>

                {!preview ? (
                  <EmptyState title={requestedRecipeId ? "Receita não encontrada" : "Selecione sua receita"} description={requestedRecipeId ? "A receita solicitada não está disponível nesta conta. Selecione uma das suas receitas acima." : "Escolha a receita acima para visualizar a tabela nutricional."} />
                ) : (
                  <>
                  <Card className="min-w-0 shadow-none">
                    <CardHeader className="flex-col"><CardTitle>{preview.name}</CardTitle><CardDescription>{preview.status === "READY" ? "Informações obrigatórias conferidas." : "Prévia parcial: confira as pendências abaixo."}</CardDescription></CardHeader>
                    <section aria-label="Tabela nutricional" className="min-w-0">
                      {preview.nutritionTable ? <NutritionFactsTable model={preview.nutritionTable} showAvailableValues /> : <p className="text-sm text-[var(--muted)]">Tabela nutricional indisponível até completar ingredientes e rendimento.</p>}
                    </section>
                  </Card>
                  <Card className="shadow-none">
                    <CardHeader className="flex-col"><CardTitle>Avaliação da lupa frontal</CardTitle><CardDescription>A avaliação considera os dados nutricionais e o enquadramento do produto e da embalagem.</CardDescription></CardHeader>
                    <section aria-label="Rotulagem frontal">
                      {preview.frontOfPack ? <FrontOfPackNutritionPreview decision={preview.frontOfPack} /> : <p className="text-sm text-[var(--muted)]">Avaliação da lupa pendente.</p>}
                    </section>
                  </Card>
                  <Card className="shadow-none" aria-label="PDF da tabela nutricional">
                    <CardHeader className="flex-col"><CardTitle>PDF da tabela nutricional</CardTitle><CardDescription>Tabela e lupa, quando exigida, em arquivo próprio. Sem escolher modelo ou tamanho de rótulo.</CardDescription></CardHeader>
                    {tableProduction?.assessment.allowed ? <div className="space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <a href={tableProduction.downloadHref!} className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-tiffany)] px-4 font-semibold text-[var(--brand-navy)]">Baixar PDF</a>
                        <a href={tableProduction.printHref!} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border px-4 font-semibold">Imprimir</a>
                      </div>
                      <p className="text-sm text-[var(--muted)]">Imprima em folha A4, em tamanho real (escala 100%), sem ajustar à página. A lupa deve ser aplicada no painel principal da embalagem.</p>
                    </div> : <div className="space-y-2 text-sm">
                      <p role="status">{tableProduction?.assessment.message}</p>
                      <div className="flex gap-2"><Button disabled>Baixar PDF</Button><Button disabled variant="secondary">Imprimir</Button></div>
                      <a href="#pendencias" className="inline-flex min-h-11 items-center underline">Ver informações que faltam</a>
                    </div>}
                  </Card>
                  <Card className="shadow-none" id="pendencias">
                    <CardHeader className="flex-col"><CardTitle>O que falta para finalizar</CardTitle><CardDescription>Resolva somente as informações obrigatórias indicadas. A prévia usa os dados disponíveis.</CardDescription></CardHeader>
                    {pendingGroups.length ? <div className="space-y-4">{pendingGroups.map(group => <section key={group.title}><h3 className="font-semibold">{group.title}</h3><ul className="mt-2 space-y-2">{group.items.map(issue => <li key={issue.code} className="rounded border p-3 text-sm"><p>{issue.message}</p><Link href={issue.href} className="mt-2 inline-flex min-h-11 items-center font-semibold underline">Resolver esta pendência</Link></li>)}</ul></section>)}</div> : <p className="text-sm">Nenhuma pendência obrigatória identificada nos dados atuais.</p>}
                    {preview.issues.some(issue => issue.severity === "WARNING") ? <details className="mt-4 text-sm"><summary className="cursor-pointer">Observações opcionais</summary><ul className="mt-2 space-y-2">{preview.issues.filter(issue => issue.severity === "WARNING").map(issue => <li key={issue.code}>{issue.message}</li>)}</ul></details> : null}
                    {preview.ingredientCompletions?.length ? <details className="mt-4 space-y-3" id="completar-ingredientes"><summary className="min-h-11 cursor-pointer py-2 font-semibold">Opções de complementação dos ingredientes</summary><p className="text-sm">Preencha apenas o que a fonte informa, em uma cópia privada. Esta lista também pode incluir nutrientes opcionais; os bloqueios obrigatórios estão indicados acima.</p><ul className="space-y-3">{preview.ingredientCompletions.map(item => <li key={item.itemId} className="rounded border p-3 text-sm"><p className="font-semibold">{item.name}</p><p className="mt-1">Não informado: {item.missing.join(", ")}.</p><Link href={ingredientComplementHref(preview.recipeId, item.itemId, format, template)} className="inline-flex min-h-11 items-center font-semibold underline">Completar somente o que falta</Link></li>)}</ul></details> : null}
                  </Card>
                  <details className="rounded border bg-white p-4" id="rotulo-completo-anterior">
                    <summary className="min-h-11 cursor-pointer py-2 font-semibold">Rótulo completo e PDF atual · recurso anterior</summary>
                    <p className="my-3 text-sm text-[var(--muted)]">O editor e seu PDF de rótulo completo estão preservados aqui. O PDF atual depende do modelo e do tamanho selecionados neste editor; não é uma exportação independente da tabela nutricional.</p>
                    <LegacyLabelEditor preview={preview} format={format} template={template} />
                  </details>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

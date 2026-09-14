import Link from "next/link";
import { Badge, Button, Card, CardDescription, CardHeader, CardTitle, EmptyState, Label } from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { NutritionFactsTable } from "@/components/nutrition/nutrition-facts-table";
import { FrontOfPackNutritionPreview } from "@/components/nutrition/front-of-pack-nutrition-preview";
import { requireUser } from "@/lib/auth/session";
import { buildFinalLabelPreview } from "@/lib/final-label/preview";
import { listRecipes } from "@/lib/recipes/repository";

function yieldLabel(value: unknown, unit: string) {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return `${amount.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${unit === "MILLILITER" ? "ml" : "g"}`;
}

function disclosure(value: string | null, subject: string) {
  if (value === "CONTAINS") return `CONTÉM ${subject}.`;
  if (value === "DOES_NOT_CONTAIN") return `NÃO CONTÉM ${subject}.`;
  return `${subject}: revisão necessária.`;
}

export default async function FinalLabelPage({ searchParams }: {
  searchParams?: Promise<{ recipeId?: string }>;
}) {
  const user = await requireUser();
  const recipes = await listRecipes(user.id);
  const query = searchParams ? await searchParams : {};
  const requestedRecipeId = typeof query.recipeId === "string" ? query.recipeId : undefined;
  const selectedRecipeId = requestedRecipeId ?? recipes[0]?.id;
  const preview = selectedRecipeId ? await buildFinalLabelPreview(selectedRecipeId, user.id) : null;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar activeItem="Rótulo Final" />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl space-y-5 px-5 py-6 lg:px-8 lg:py-8">
            <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 sm:p-6">
              <Badge variant="secondary">Rótulo Final</Badge>
              <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">Rótulo Final</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">Veja como as informações do seu produto serão organizadas no rótulo. Esta é uma prévia técnica, ainda sem impressão ou PDF.</p>
            </section>

            {recipes.length === 0 ? (
              <EmptyState title="Crie sua primeira receita para montar um rótulo." description="Depois de cadastrar ingredientes e rendimento, você poderá visualizar uma prévia técnica." action={<Link href="/receitas/nova" className="inline-flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--brand-tiffany)] px-4 font-semibold text-[var(--brand-navy)]">Criar receita</Link>} />
            ) : (
              <>
                <Card>
                  <CardHeader className="flex-col"><CardTitle>Selecionar receita</CardTitle><CardDescription>Somente receitas da sua conta aparecem aqui.</CardDescription></CardHeader>
                  <form method="GET" action="/rotulo-final" className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                      <Label htmlFor="recipeId">Receita</Label>
                      <select id="recipeId" name="recipeId" defaultValue={preview?.recipeId ?? ""} className="mt-1 h-10 w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 text-sm">
                        {requestedRecipeId && !preview ? <option value="">Selecione uma receita</option> : null}
                        {recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name} · {recipe.physicalState === "LIQUID" ? "Líquido" : "Sólido/semissólido"}{yieldLabel(recipe.finalYieldAmount, recipe.finalYieldUnit) ? ` · ${yieldLabel(recipe.finalYieldAmount, recipe.finalYieldUnit)}` : ""}</option>)}
                      </select>
                    </div>
                    <Button type="submit" className="w-full sm:w-auto">Ver prévia</Button>
                  </form>
                </Card>

                {!preview ? (
                  <EmptyState title="Receita não encontrada" description="A receita solicitada não está disponível nesta conta. Selecione uma das suas receitas acima." />
                ) : (
                  <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
                    <Card className="min-w-0 shadow-none">
                      <CardHeader className="flex-col"><CardTitle>Prévia técnica do rótulo</CardTitle><CardDescription>Composição neutra v1; não representa o tamanho final da embalagem.</CardDescription></CardHeader>
                      <div className="min-w-0 space-y-5 rounded-[var(--radius-md)] border-2 border-[var(--border-strong)] bg-white p-4 sm:p-6">
                        <div className="border-b border-[var(--border)] pb-4">
                          <h2 className="break-words text-2xl font-bold">{preview.name}</h2>
                          <p className="mt-1 text-sm text-[var(--muted)]">{preview.physicalState === "LIQUID" ? "Líquido" : "Sólido ou semissólido"}</p>
                          <p className="mt-3 font-bold">{preview.netQuantityLabel ?? "Quantidade líquida não informada"}</p>
                        </div>
                        <section aria-label="Ingredientes e declarações" className="space-y-2 text-sm leading-6">
                          <p className="break-words font-semibold">{preview.ingredientsText ?? "INGREDIENTES: informação pendente."}</p>
                          {preview.allergens.length ? <p>ALÉRGICOS: CONTÉM {preview.allergens.join(", ")}.</p> : <p>ALÉRGICOS: nenhum alergênico confirmado; revise os dados da receita.</p>}
                          <p>{disclosure(preview.glutenStatus, "GLÚTEN")}</p>
                          <p>{disclosure(preview.lactoseStatus, "LACTOSE")}</p>
                          {preview.crossContaminationRisk === "YES" ? <p>PODE CONTER: {preview.crossContaminationAllergens.join(", ") || "informação pendente"}.</p> : null}
                        </section>
                        <section aria-label="Tabela nutricional" className="min-w-0">
                          {preview.nutritionTable ? <NutritionFactsTable model={preview.nutritionTable} /> : <p className="text-sm text-[var(--muted)]">Tabela nutricional indisponível até completar ingredientes e rendimento.</p>}
                        </section>
                        <section aria-label="Rotulagem frontal">
                          {preview.frontOfPack ? <FrontOfPackNutritionPreview decision={preview.frontOfPack} /> : <p className="text-sm text-[var(--muted)]">Avaliação da lupa pendente.</p>}
                        </section>
                        <section aria-label="Código de barras" className="min-w-0 border-t border-[var(--border)] pt-4">
                          {preview.barcode ? (
                            <div>
                              <p className="text-sm font-semibold">{preview.barcode.type === "INTERNAL" ? "Código interno — não substitui GTIN oficial" : "Código oficial GTIN"}</p>
                              <p className="mt-1 break-all font-mono text-xs">{preview.barcode.value}</p>
                              {preview.barcode.display.status === "READY" ? <img className="mt-2 max-h-28 w-full object-contain" src={`data:image/svg+xml,${encodeURIComponent(preview.barcode.display.svg)}`} alt={`Código de barras ${preview.barcode.value}`} /> : <p className="text-sm">Imagem indisponível.</p>}
                            </div>
                          ) : <div className="text-sm"><p>Código de barras ainda não associado.</p><Link href={`/codigo-de-barras?recipeId=${encodeURIComponent(preview.recipeId)}`} className="mt-2 inline-flex font-semibold text-[var(--brand-petrol)] underline">Adicionar código de barras</Link></div>}
                        </section>
                      </div>
                    </Card>

                    <aside className="min-w-0 space-y-4">
                      <Card className="shadow-none">
                        <CardHeader className="flex-col"><CardTitle>Status do rótulo</CardTitle><CardDescription>{preview.status === "READY" ? "Dados disponíveis para esta prévia técnica." : preview.status === "REQUIRES_REVIEW" ? "Há pontos que exigem revisão." : "Há informações que impedem concluir o rótulo."}</CardDescription></CardHeader>
                        <Badge variant="secondary">{preview.status === "READY" ? "Pronto para revisão visual" : preview.status === "INCOMPLETE" ? "Incompleto" : "Requer revisão"}</Badge>
                        {preview.issues.length ? <ul className="mt-4 space-y-3">{preview.issues.map((issue) => <li key={issue.code} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm"><span className="font-semibold">{issue.severity === "WARNING" ? "Aviso" : issue.severity === "REVIEW" ? "Revisão" : "Bloqueio"}: </span>{issue.message}</li>)}</ul> : <p className="mt-4 text-sm">Nenhuma pendência identificada pelos dados disponíveis.</p>}
                      </Card>
                      <Link href={`/receitas/${preview.recipeId}/editar`} className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--brand-petrol)]">Editar receita</Link>
                    </aside>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

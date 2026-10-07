import Link from "next/link";
import { Badge, Button, Card, CardDescription, CardHeader, CardTitle, EmptyState, Label } from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { NutritionFactsTable } from "@/components/nutrition/nutrition-facts-table";
import { FrontOfPackNutritionPreview } from "@/components/nutrition/front-of-pack-nutrition-preview";
import { requireUser } from "@/lib/auth/session";
import { buildFinalLabelPreview } from "@/lib/final-label/preview";
import { prepareFinalLabelProduction } from "@/lib/final-label/production";
import { assessLabelLayout, labelFormats, labelPreviewHref, labelTemplates, resolveLabelFormat, resolveLabelTemplate } from "@/lib/final-label/visual";
import { listRecipes } from "@/lib/recipes/repository";
import { VisualLabelFrame } from "./visual-preview";

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
  searchParams?: Promise<{ recipeId?: string; format?: string; template?: string }>;
}) {
  const user = await requireUser();
  const recipes = await listRecipes(user.id);
  const query = searchParams ? await searchParams : {};
  const requestedRecipeId = typeof query.recipeId === "string" ? query.recipeId : undefined;
  const format = resolveLabelFormat(typeof query.format === "string" ? query.format : undefined);
  const template = resolveLabelTemplate(typeof query.template === "string" ? query.template : undefined);
  const selectedRecipeId = requestedRecipeId ?? recipes[0]?.id;
  const preview = selectedRecipeId ? await buildFinalLabelPreview(selectedRecipeId, user.id) : null;
  const layout = preview ? assessLabelLayout(preview, format) : null;
  const production = preview ? prepareFinalLabelProduction(preview, format, template) : null;

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
              <p className="mt-2 text-sm text-[var(--muted)]">Veja como as informações do seu produto serão organizadas no rótulo e baixe o PDF quando todos os dados estiverem prontos.</p>
            </section>

            {recipes.length === 0 ? (
              <EmptyState title="Crie sua primeira receita para montar um rótulo." description="Depois de cadastrar ingredientes e rendimento, você poderá visualizar uma prévia técnica." action={<Link href="/receitas/nova" className="inline-flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--brand-tiffany)] px-4 font-semibold text-[var(--brand-navy)]">Criar receita</Link>} />
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
                  <>
                  <Card className="shadow-none">
                    <CardHeader className="flex-col"><CardTitle>Formato físico</CardTitle><CardDescription>Escolha o tamanho inicial da prévia. Confirme as medidas reais da sua embalagem antes de produzir.</CardDescription></CardHeader>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {Object.entries(labelFormats).map(([key, option]) => {
                        const selected = key === format;
                        return <Link key={key} href={labelPreviewHref(preview.recipeId, key as keyof typeof labelFormats, template)} aria-current={selected ? "true" : undefined} className={`rounded-[var(--radius-md)] border p-4 text-sm transition hover:border-[#0ABFBC] ${selected ? "border-[#0ABFBC] bg-[#eafffe]" : "border-[var(--border)] bg-white"}`}>
                          <span className="block font-semibold">{option.name}</span>
                          <span className="mt-1 block">{option.widthMm} × {option.heightMm} mm</span>
                          <span className="mt-2 block text-xs text-[var(--muted)]">{option.preset}</span>
                        </Link>;
                      })}
                    </div>
                  </Card>
                  <Card className="shadow-none">
                    <CardHeader className="flex-col"><CardTitle>Modelo visual</CardTitle><CardDescription>Os três modelos usam exatamente os mesmos dados técnicos.</CardDescription></CardHeader>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {Object.entries(labelTemplates).map(([key, option]) => {
                        const selected = key === template;
                        return <Link key={key} href={labelPreviewHref(preview.recipeId, format, key as keyof typeof labelTemplates)} aria-current={selected ? "true" : undefined} className={`rounded-[var(--radius-md)] border p-4 text-sm transition hover:border-[#0ABFBC] ${selected ? "border-[#0ABFBC] bg-[#eafffe]" : "border-[var(--border)] bg-white"}`}>
                          <span className="block font-semibold">{option.name}</span>
                          <span className="mt-1 block text-xs text-[var(--muted)]">{option.description}</span>
                          <span className="mt-3 block h-8 rounded border border-[var(--border)] bg-white p-1"><span className={`block h-1 w-12 rounded ${key === "ESSENCIAL" ? "bg-[#303b40]" : "bg-[#0ABFBC]"}`} /><span className="mt-1 block h-1 w-20 max-w-full rounded bg-[#dce8e8]" /></span>
                        </Link>;
                      })}
                    </div>
                  </Card>
                  <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
                    <Card className="min-w-0 shadow-none">
                      <CardHeader className="flex-col"><CardTitle>Prévia técnica do rótulo</CardTitle><CardDescription>{labelFormats[format].name} · {labelFormats[format].widthMm} × {labelFormats[format].heightMm} mm · {labelTemplates[template].name}. Mapa visual, não arquivo para impressão.</CardDescription></CardHeader>
                      <VisualLabelFrame preview={preview} format={format} template={template} />
                      <h3 className="mt-6 text-sm font-semibold">Conteúdo técnico integral</h3>
                      <div className="min-w-0 space-y-5 rounded-[var(--radius-md)] border-2 border-[var(--border-strong)] bg-white p-4 sm:p-6">
                        <div className="border-b border-[var(--border)] pb-4">
                          <h2 className="break-words text-2xl font-bold">{preview.name}</h2>
                          <p className="mt-1 text-sm text-[var(--muted)]">{preview.physicalState === "LIQUID" ? "Líquido" : "Sólido ou semissólido"}</p>
                          <p className="mt-3 font-bold">{preview.netQuantityLabel ?? "Quantidade líquida não informada"}</p>
                        </div>
                        <section aria-label="Ingredientes e declarações" className="space-y-2 text-sm leading-6">
                          <p className="break-words font-semibold">{preview.ingredientsText ?? "INGREDIENTES: informação pendente."}</p>
                          {preview.allergens.length ? <p>ALÉRGICOS: CONTÉM {preview.allergens.join(", ")}.</p> : <p>{preview.allergenStatus === "NONE" ? "ALERGÊNICOS: ausência confirmada na revisão." : "ALERGÊNICOS: informação não determinada; revisão necessária."}</p>}
                          {preview.allergenStatus === "UNKNOWN" && preview.allergens.length > 0 ? <p>Há também informações de alergênicos não determinadas nos ingredientes. Revise antes de exportar.</p> : null}
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
                      {layout?.warning ? <Card className="border-[#f4d5b6] bg-[#fff8f0] text-sm text-[#8a4b15] shadow-none"><p className="font-semibold">Atenção ao espaço do formato</p><p className="mt-2">{layout.message}</p></Card> : null}
                      <Card className="shadow-none">
                        <CardHeader className="flex-col"><CardTitle>Status do rótulo</CardTitle><CardDescription>{preview.status === "READY" ? "Dados disponíveis para esta prévia técnica." : preview.status === "REQUIRES_REVIEW" ? "Há pontos que exigem revisão." : "Há informações que impedem concluir o rótulo."}</CardDescription></CardHeader>
                        <Badge variant="secondary">{preview.status === "READY" ? "Pronto para revisão visual" : preview.status === "INCOMPLETE" ? "Incompleto" : "Requer revisão"}</Badge>
                        {preview.issues.length ? <ul className="mt-4 space-y-3">{preview.issues.map((issue) => <li key={issue.code} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm"><span className="font-semibold">{issue.severity === "WARNING" ? "Aviso" : issue.severity === "REVIEW" ? "Revisão" : "Bloqueio"}: </span>{issue.message}</li>)}</ul> : <p className="mt-4 text-sm">Nenhuma pendência identificada pelos dados disponíveis.</p>}
                      </Card>
                      <Card className="shadow-none">
                        <CardHeader className="flex-col"><CardTitle>{production?.allowed ? "Pronto para imprimir" : "PDF do rótulo"}</CardTitle><CardDescription>O arquivo usa o formato físico e o modelo visual selecionados acima.</CardDescription></CardHeader>
                        {production?.allowed ? (
                          <div className="space-y-4">
                            <dl className="grid grid-cols-1 gap-2 rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm sm:grid-cols-2">
                              <div><dt className="text-[var(--muted)]">Formato</dt><dd className="font-semibold">{production.formatName}</dd></div>
                              <div><dt className="text-[var(--muted)]">Dimensões</dt><dd className="font-semibold">{production.widthMm} × {production.heightMm} mm</dd></div>
                              <div><dt className="text-[var(--muted)]">Orientação</dt><dd className="font-semibold">{production.orientation}</dd></div>
                              <div><dt className="text-[var(--muted)]">Escala do arquivo</dt><dd className="font-semibold">Tamanho real</dd></div>
                            </dl>
                            <p className="text-sm">O PDF foi preparado no tamanho físico real do rótulo.</p>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <a href={production.downloadHref} className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-tiffany)] px-4 text-sm font-semibold text-[var(--brand-navy)]">Baixar PDF</a>
                              <a href={production.printHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--brand-petrol)]">Imprimir</a>
                            </div>
                            <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3 text-xs leading-5 text-[var(--muted)]">
                              <p>Na janela de impressão, use <strong>Tamanho real</strong> ou <strong>Escala 100%</strong>. Evite “Ajustar à página”.</p>
                              <p className="mt-1">As opções disponíveis podem variar conforme o navegador, o leitor de PDF e a impressora.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-[var(--radius-md)] border border-[#f4d5b6] bg-[#fff8f0] p-3 text-sm text-[#8a4b15]">
                            <p className="font-semibold">PDF indisponível</p>
                            <p className="mt-1">{production?.assessment.message}</p>
                          </div>
                        )}
                      </Card>
                      <Link href={`/receitas/${preview.recipeId}/editar`} className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--brand-petrol)]">Editar receita</Link>
                    </aside>
                  </div>
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

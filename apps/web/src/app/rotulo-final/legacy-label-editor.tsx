import Link from "next/link";
import { Badge, Card, CardDescription, CardHeader, CardTitle } from "@/components/design-system";
import { NutritionFactsTable } from "@/components/nutrition/nutrition-facts-table";
import { FrontOfPackNutritionPreview } from "@/components/nutrition/front-of-pack-nutrition-preview";
import type { FinalLabelPreview } from "@/lib/final-label/preview";
import { prepareFinalLabelProduction } from "@/lib/final-label/production";
import { assessLabelLayout, labelFormats, labelPreviewHref, labelTemplates, type LabelFormat, type LabelTemplate } from "@/lib/final-label/visual";
import { VisualLabelFrame } from "./visual-preview";

function disclosure(value: string | null, subject: string) {
  if (value === "CONTAINS") return `CONTÉM ${subject}.`;
  if (value === "DOES_NOT_CONTAIN") return `NÃO CONTÉM ${subject}.`;
  return `${subject}: revisão necessária.`;
}

// Preserved complete-label editor, outside the main MVP table flow.
export function LegacyLabelEditor({ preview, format, template }: { preview: FinalLabelPreview; format: LabelFormat; template: LabelTemplate }) {
  const layout = assessLabelLayout(preview, format);
  const production = prepareFinalLabelProduction(preview, format, template);
  return <>
                  <section aria-label="Modelo e tamanho" className="rounded border bg-white p-4">
                    <h2 className="font-semibold">Modelo e tamanho · {labelTemplates[template].name} · {labelFormats[format].widthMm} × {labelFormats[format].heightMm} mm</h2>
                  <Card className="mt-4 shadow-none">
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
                  </section>
                  <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
                    <Card className="min-w-0 shadow-none">
                      <CardHeader className="flex-col"><CardTitle>{production?.allowed ? "Prévia · PDF disponível" : "Prévia parcial · PDF ainda bloqueado"}</CardTitle><CardDescription>{labelFormats[format].name} · {labelFormats[format].widthMm} × {labelFormats[format].heightMm} mm · {labelTemplates[template].name}. Mapa visual, não arquivo para impressão.</CardDescription></CardHeader>
                      <VisualLabelFrame preview={preview} format={format} template={template} />
                      <section className="mt-6" aria-label="Informações do produto e tabela nutricional">
                      <div className="min-w-0 space-y-5 rounded-[var(--radius-md)] border-2 border-[var(--border-strong)] bg-white p-4 sm:p-6">
                        <div className="border-b border-[var(--border)] pb-4">
                          <h2 className="break-words text-2xl font-bold">{preview.name}</h2>
                          <p className="mt-1 text-sm text-[var(--muted)]">{preview.physicalState === "LIQUID" ? "Líquido" : "Sólido ou semissólido"}</p>
                          <p className="mt-3 font-bold">{preview.netQuantityLabel ?? "Quantidade líquida não informada"}</p>
                        </div>
                        <section aria-label="Ingredientes e declarações" className="space-y-2 text-sm leading-6">
                          <p className="break-words font-semibold">{preview.ingredientsText ?? "INGREDIENTES: informação pendente."}</p>
                          {preview.allergens.length ? <p>ALÉRGICOS: CONTÉM {preview.allergens.join(", ")}.</p> : preview.allergenStatus === "UNKNOWN" ? <p>Alergênicos: informação pendente.</p> : null}
                          {preview.allergenStatus === "UNKNOWN" && preview.allergens.length > 0 ? <p>Há também informações de alergênicos não determinadas nos ingredientes. Revise antes de exportar.</p> : null}
                          <p>{disclosure(preview.glutenStatus, "GLÚTEN")}</p>
                          <p>{disclosure(preview.lactoseStatus, "LACTOSE")}</p>
                          {preview.crossContaminationRisk === "YES" ? <p>PODE CONTER: {preview.crossContaminationAllergens.join(", ") || "informação pendente"}.</p> : null}
                        </section>
                        <section aria-label="Tabela nutricional" className="min-w-0">
                          {preview.nutritionTable ? <NutritionFactsTable model={preview.nutritionTable} showAvailableValues /> : <p className="text-sm text-[var(--muted)]">Tabela nutricional indisponível até completar ingredientes e rendimento.</p>}
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
                      </section>
                    </Card>

                    <aside className="min-w-0 space-y-4">
                      {layout?.warning ? <Card className="border-[#f4d5b6] bg-[#fff8f0] text-sm text-[#8a4b15] shadow-none"><p className="font-semibold">Atenção ao espaço do formato</p><p className="mt-2">{layout.message}</p></Card> : null}
                      <Card className="shadow-none">
                        <CardHeader className="flex-col"><CardTitle>Status do rótulo</CardTitle><CardDescription>{preview.status === "READY" ? "Dados disponíveis para esta prévia técnica." : preview.status === "REQUIRES_REVIEW" ? "Há pontos que exigem revisão." : "Há informações que impedem concluir o rótulo."}</CardDescription></CardHeader>
                        <Badge variant="secondary">{preview.status === "READY" ? "Pronto para revisão visual" : preview.status === "INCOMPLETE" ? "Incompleto" : "Requer revisão"}</Badge>
                        {preview.status !== "READY" ? <a href="#pendencias" className="mt-3 inline-flex min-h-11 items-center text-sm underline">Ver o que falta para finalizar</a> : null}
                      </Card>
                      <Card className="shadow-none">
                        <CardHeader className="flex-col"><CardTitle>{production?.allowed ? "Pronto para imprimir" : "PDF do rótulo"}</CardTitle><CardDescription>PDF do rótulo completo, vinculado ao modelo e tamanho deste editor. Não é um PDF independente da tabela.</CardDescription></CardHeader>
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
  </>;
}

import type { FinalLabelPreview } from "@/lib/final-label/preview";
import { NutritionFactsTable } from "@/components/nutrition/nutrition-facts-table";
import { FrontOfPackNutritionPreview } from "@/components/nutrition/front-of-pack-nutrition-preview";
import { labelFormats, type LabelFormat, type LabelTemplate } from "@/lib/final-label/visual";

const templateStyle: Record<LabelTemplate, { border: string; title: string; accent: string; surface: string }> = {
  ESSENCIAL: { border: "border-[#303b40]", title: "font-semibold", accent: "bg-[#303b40]", surface: "bg-white" },
  CLEAN: { border: "border-[#c4d6d6]", title: "font-medium tracking-wide", accent: "bg-[#0ABFBC]", surface: "bg-[#fbfdfd]" },
  DESTAQUE: { border: "border-[#0ABFBC]", title: "font-extrabold", accent: "bg-[#0ABFBC]", surface: "bg-white" }
};

function disclosure(value: FinalLabelPreview["glutenStatus"], label: string) {
  return value === "CONTAINS" ? `CONTÉM ${label}.` : value === "DOES_NOT_CONTAIN" ? `NÃO CONTÉM ${label}.` : `${label}: declaração pendente de confirmação.`;
}

export function VisualLabelFrame({ preview, format, template }: {
  preview: FinalLabelPreview;
  format: LabelFormat;
  template: LabelTemplate;
}) {
  const dimensions = labelFormats[format];
  const style = templateStyle[template];
  return <div className="min-w-0">
    <div className={`w-full min-w-0 overflow-auto rounded-[var(--radius-md)] border-2 ${style.border} ${style.surface}`} style={{ aspectRatio: `${dimensions.widthMm} / ${dimensions.heightMm}` }} aria-label={`Prévia ${dimensions.name}, ${dimensions.widthMm} por ${dimensions.heightMm} milímetros`} tabIndex={0}>
      <div className="space-y-4 p-3 text-sm sm:p-5">
        <div className={`h-1 w-12 max-w-full rounded-full ${style.accent}`} />
        <h2 className={`break-words text-xl ${style.title}`}>{preview.name}</h2>
        <p className="font-semibold">{preview.netQuantityLabel ?? "Quantidade líquida pendente"}</p>
        <section className="space-y-2" aria-label="Ingredientes e declarações da prévia">
          <p className="break-words">{preview.ingredientsText ?? "INGREDIENTES: adicione os ingredientes da receita."}</p>
          {preview.allergens.length > 0 ? <p>ALÉRGICOS: CONTÉM {preview.allergens.join(", ")}.</p> : null}
          {preview.allergenStatus === "UNKNOWN" ? <p className="font-semibold text-[#8a4b15]">Alergênicos não determinados: revisão obrigatória antes da exportação.</p> : preview.allergenStatus === "NONE" ? <p>ALERGÊNICOS: ausência confirmada na revisão.</p> : null}
          <p>{disclosure(preview.glutenStatus, "GLÚTEN")}</p>
          <p>{disclosure(preview.lactoseStatus, "LACTOSE")}</p>
          {preview.crossContaminationRisk === "YES" ? <p>PODE CONTER: {preview.crossContaminationAllergens.join(", ") || "confirmação pendente"}.</p> : preview.crossContaminationRisk === "UNKNOWN" || !preview.crossContaminationRisk ? <p>Contaminação cruzada: confirmação pendente.</p> : null}
        </section>
        <section aria-label="Tabela nutricional da prévia">{preview.nutritionTable ? <NutritionFactsTable model={preview.nutritionTable} showAvailableValues /> : <p>Tabela nutricional pendente: complete ingredientes e rendimento final.</p>}</section>
        <section aria-label="Lupa da prévia">{preview.frontOfPack ? <FrontOfPackNutritionPreview decision={preview.frontOfPack} /> : <p>Lupa frontal: avaliação pendente.</p>}</section>
        <section aria-label="Código de barras da prévia">
          <p className="font-semibold">{preview.barcode?.type === "INTERNAL" ? "Código interno — não substitui GTIN oficial" : preview.barcode ? "Código oficial GTIN" : "Código de barras ainda não associado"}</p>
          {preview.barcode ? <p className="break-all font-mono text-xs">{preview.barcode.value}</p> : null}
          {preview.barcode?.display.status === "READY" ? <img className="mt-2 max-h-28 w-full object-contain" src={`data:image/svg+xml,${encodeURIComponent(preview.barcode.display.svg)}`} alt="Código de barras associado" /> : null}
        </section>
        {preview.issues.some(issue => issue.severity !== "WARNING") ? <section aria-label="Pendências obrigatórias"><h3 className="font-semibold">Para concluir o rótulo</h3><ul className="list-inside list-disc space-y-1">{preview.issues.filter(issue => issue.severity !== "WARNING").map(issue => <li key={issue.code}>{issue.message}</li>)}</ul></section> : null}
      </div>
    </div>
    <p className="mt-2 text-xs text-[var(--muted)]">Prévia com os dados disponíveis, em proporção física {dimensions.widthMm}:{dimensions.heightMm}. Role para consultar todo o conteúdo. Não é o arquivo de impressão; os bloqueios do PDF continuam ativos.</p>
  </div>;
}

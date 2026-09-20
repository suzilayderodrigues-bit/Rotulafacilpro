import type { FinalLabelPreview } from "@/lib/final-label/preview";
import { labelFormats, type LabelFormat, type LabelTemplate } from "@/lib/final-label/visual";

const templateStyle: Record<LabelTemplate, { border: string; title: string; accent: string; surface: string }> = {
  ESSENCIAL: { border: "border-[#303b40]", title: "font-semibold", accent: "bg-[#303b40]", surface: "bg-white" },
  CLEAN: { border: "border-[#c4d6d6]", title: "font-medium tracking-wide", accent: "bg-[#0ABFBC]", surface: "bg-[#fbfdfd]" },
  DESTAQUE: { border: "border-[#0ABFBC]", title: "font-extrabold", accent: "bg-[#0ABFBC]", surface: "bg-white" }
};

export function VisualLabelFrame({ preview, format, template }: {
  preview: FinalLabelPreview;
  format: LabelFormat;
  template: LabelTemplate;
}) {
  const dimensions = labelFormats[format];
  const style = templateStyle[template];
  const horizontal = dimensions.widthMm > dimensions.heightMm;

  return (
    <div className="min-w-0">
      <div className={`w-full overflow-hidden rounded-[var(--radius-md)] border-2 ${style.border} ${style.surface}`} style={{ aspectRatio: `${dimensions.widthMm} / ${dimensions.heightMm}` }} aria-label={`Mapa visual ${dimensions.name}, ${dimensions.widthMm} por ${dimensions.heightMm} milímetros`}>
        <div className={`flex h-full min-h-0 min-w-0 ${horizontal ? "flex-row" : "flex-col"}`}>
          <div className={`flex min-h-0 min-w-0 flex-col justify-between p-2 sm:p-3 ${horizontal ? "w-[30%] border-r" : "min-h-[25%] border-b"} border-[var(--border)]`}>
            <div className={`h-1 w-12 max-w-full rounded-full ${style.accent}`} />
            <p className={`break-words text-[0.55rem] leading-tight sm:text-sm ${style.title}`}>{preview.name}</p>
            <p className="text-[0.5rem] leading-tight sm:text-xs">{preview.netQuantityLabel ?? "Quantidade pendente"}</p>
          </div>
          <div className={`flex min-h-0 min-w-0 flex-col justify-center gap-1 p-2 sm:p-3 ${horizontal ? "w-[29%] border-r" : "min-h-[25%] border-b"} border-[var(--border)]`}>
            <p className="text-[0.5rem] font-bold sm:text-xs">Ingredientes e declarações</p>
            <p className="text-[0.45rem] sm:text-[0.65rem]">{preview.ingredients.length} ingrediente{preview.ingredients.length === 1 ? "" : "s"} · glúten · lactose</p>
            {preview.frontOfPack?.shouldDisplayOfficialWarning ? <p className="inline-block w-fit rounded bg-black px-1 text-[0.45rem] font-black text-white sm:text-[0.65rem]">ALTO EM</p> : null}
          </div>
          <div className={`flex min-h-0 min-w-0 items-center justify-center p-2 text-center text-[0.5rem] font-bold sm:p-3 sm:text-xs ${horizontal ? "w-[27%] border-r" : "min-h-[32%] border-b"} border-[var(--border)]`}>
            Tabela nutricional · {preview.nutritionTable?.rows.length ?? 0} linhas
          </div>
          <div className={`flex min-h-0 min-w-0 flex-col items-center justify-center p-2 text-center text-[0.45rem] sm:p-3 sm:text-xs ${horizontal ? "w-[14%]" : "flex-1"}`}>
            <span className="font-bold">{preview.barcode?.type === "INTERNAL" ? "Código interno" : preview.barcode ? "GTIN" : "Sem código"}</span>
            {preview.barcode?.display.status === "READY" ? <img className="mt-1 max-h-[55%] w-full object-contain" src={`data:image/svg+xml,${encodeURIComponent(preview.barcode.display.svg)}`} alt="" /> : null}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">Mapa de distribuição em proporção física {dimensions.widthMm}:{dimensions.heightMm}. O conteúdo integral e legível está logo abaixo.</p>
    </div>
  );
}

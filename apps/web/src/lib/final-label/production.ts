import type { FinalLabelPreview } from "./preview";
import { assessFinalLabelPdf } from "./pdf";
import { labelFormats, type LabelFormat, type LabelTemplate } from "./visual";

export type FinalLabelOrientation = "Retrato" | "Paisagem" | "Quadrado";

export function finalLabelOrientation(widthMm: number, heightMm: number): FinalLabelOrientation {
  if (widthMm === heightMm) return "Quadrado";
  return widthMm > heightMm ? "Paisagem" : "Retrato";
}

export function finalLabelPdfHref(
  recipeId: string,
  format: LabelFormat,
  template: LabelTemplate,
  mode: "download" | "print"
) {
  const params = new URLSearchParams({ format, template });
  if (mode === "print") params.set("mode", "print");
  return `/rotulo-final/${encodeURIComponent(recipeId)}/download?${params.toString()}`;
}

export function finalLabelContentDisposition(filename: string, mode: string | null) {
  const disposition = mode === "print" ? "inline" : "attachment";
  return `${disposition}; filename="${filename}"`;
}

export function prepareFinalLabelProduction(
  preview: FinalLabelPreview,
  format: LabelFormat,
  template: LabelTemplate
) {
  const assessment = assessFinalLabelPdf(preview, format);
  const dimensions = labelFormats[format];
  const base = {
    assessment,
    formatName: dimensions.name,
    widthMm: dimensions.widthMm,
    heightMm: dimensions.heightMm,
    orientation: finalLabelOrientation(dimensions.widthMm, dimensions.heightMm)
  };

  if (!assessment.allowed) {
    return { ...base, allowed: false as const, downloadHref: null, printHref: null };
  }

  return {
    ...base,
    allowed: true as const,
    downloadHref: finalLabelPdfHref(preview.recipeId, format, template, "download"),
    printHref: finalLabelPdfHref(preview.recipeId, format, template, "print")
  };
}

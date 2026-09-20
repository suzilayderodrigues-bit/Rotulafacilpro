import type { FinalLabelPreview } from "./preview";

export const labelFormats = {
  CINTA: { name: "Cinta", widthMm: 50, heightMm: 170, description: "Faixa vertical para embalagens semelhantes a palha italiana e brownie.", preset: "Dimensão inicial: 50 × 170 mm." },
  POTE: { name: "Pote", widthMm: 100, heightMm: 70, description: "Retângulo inicial para visualização em pote.", preset: "Preset demonstrativo do MVP; confirme as medidas do seu pote." },
  POUCH: { name: "Stand-up pouch", widthMm: 100, heightMm: 140, description: "Retângulo vertical inicial para stand-up pouch.", preset: "Preset demonstrativo do MVP; confirme as medidas do seu pouch." }
} as const;

export type LabelFormat = keyof typeof labelFormats;
export const labelTemplates = {
  ESSENCIAL: { name: "Essencial", description: "Hierarquia direta e divisões discretas." },
  CLEAN: { name: "Clean", description: "Mais respiro e contraste suave." },
  DESTAQUE: { name: "Destaque", description: "Nome em evidência com acento Tiffany." }
} as const;
export type LabelTemplate = keyof typeof labelTemplates;

export function resolveLabelFormat(value: string | undefined): LabelFormat {
  return value && Object.prototype.hasOwnProperty.call(labelFormats, value) ? value as LabelFormat : "CINTA";
}

export function resolveLabelTemplate(value: string | undefined): LabelTemplate {
  return value && Object.prototype.hasOwnProperty.call(labelTemplates, value) ? value as LabelTemplate : "ESSENCIAL";
}

export type LayoutAssessment = { warning: "CONTENT_OVERFLOW" | null; message: string | null };

export function assessLabelLayout(preview: FinalLabelPreview, format: LabelFormat): LayoutAssessment {
  const { widthMm, heightMm } = labelFormats[format];
  const area = widthMm * heightMm;
  const characters = preview.name.length + (preview.ingredientsText?.length ?? 0)
    + preview.allergens.join(", ").length + preview.crossContaminationAllergens.join(", ").length;
  const requiredArea = 6000 + characters * 18 + (preview.barcode ? 800 : 0)
    + (preview.frontOfPack?.shouldDisplayOfficialWarning ? 650 : 0);
  if (requiredArea > area || (heightMm < 70 && characters > 170)) {
    return {
      warning: "CONTENT_OVERFLOW",
      message: "Este conteúdo pode precisar de um formato maior. A prévia mantém todos os dados abaixo; não reduzimos a fonte nem ocultamos informações para forçar o encaixe."
    };
  }
  return { warning: null, message: null };
}

export function labelPreviewHref(recipeId: string, format: LabelFormat, template: LabelTemplate) {
  const params = new URLSearchParams({ recipeId, format, template });
  return `/rotulo-final?${params.toString()}`;
}

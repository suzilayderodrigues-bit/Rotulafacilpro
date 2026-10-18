import type { FinalLabelPreview } from "./preview";
import { resolveLabelFormat, resolveLabelTemplate } from "./visual";

// Presentation only: the compositor remains responsible for all blocking decisions.
export function finalLabelPending(preview: FinalLabelPreview, format?: string, template?: string) {
  const recipe = `/receitas/${encodeURIComponent(preview.recipeId)}`;
  const context = new URLSearchParams({ returnTo: "label", format: resolveLabelFormat(format), template: resolveLabelTemplate(template) });
  const review = `${recipe}/informacoes?${context}`;
  const destinations: Record<string, [string, string]> = {
    GLUTEN_CONTRADICTION: ["Há ingrediente com glúten. Revise a declaração de glúten em Meu produto.", `${review}#gluten`],
    LACTOSE_CONTRADICTION: ["Há ingrediente com lactose. Revise a declaração de lactose em Meu produto.", `${review}#lactose`],
    MISSING_NET_QUANTITY: ["Informe quanto vai em cada embalagem.", `${recipe}/rendimento`],
    MISSING_INGREDIENTS: ["Adicione os ingredientes e as quantidades usadas.", `${recipe}/ingredientes`],
    ALLERGENS_REQUIRE_REVIEW: ["Confira a informação de alergênicos de cada ingrediente e as declarações confirmadas. Uma confirmação geral não resolve dados desconhecidos.", `${review}#alergenicos`],
    MISSING_REQUIRED_DECLARATION: ["Confira glúten, lactose e a avaliação do processo; salve a revisão do produto.", review],
    MISSING_CROSS_CONTAMINATION_ALLERGENS: ["Informe quais alergênicos apresentam risco de contato durante a produção.", `${review}#processo`],
    DECLARATION_REQUIRES_REVIEW: ["Complete as declarações ainda marcadas para revisão.", review],
    NUTRITION_UNAVAILABLE: ["Confira os ingredientes, as quantidades e o rendimento depois do preparo.", `${recipe}/rendimento`],
    INCOMPLETE_NUTRITION: [preview.issues.find(issue => issue.code === "INCOMPLETE_NUTRITION")?.message ?? "Complete os dados da tabela nutricional.", `${recipe}/ingredientes`],
    FRONT_LABEL_REQUIRES_REVIEW: [`Para avaliar a lupa, informe: ${preview.frontOfPack?.applicability.requiredData.join(", ") || "as informações do tipo de produto e embalagem"}.`, `${review}#enquadramento`],
    FRONT_LABEL_UNKNOWN: ["Complete os dados nutricionais dos ingredientes necessários para avaliar a lupa.", `${recipe}/ingredientes`]
  };
  const pending = preview.issues.filter(issue => issue.severity !== "WARNING").map(issue => ({
    ...issue, message: destinations[issue.code]?.[0] ?? issue.message,
    href: issue.code.startsWith("NUTRIENT_") ? `${recipe}/ingredientes?${context}` : destinations[issue.code]?.[1] ?? review
  }));
  const declaration = pending.find(issue => issue.code === "MISSING_REQUIRED_DECLARATION" || issue.code === "DECLARATION_REQUIRES_REVIEW");
  if (declaration) {
    const fields = [
      ["GLUTEN_PENDING", !preview.glutenStatus || preview.glutenStatus === "NEEDS_REVIEW", "Confira a informação de glúten dos ingredientes e confirme a declaração do produto.", "gluten"],
      ["LACTOSE_PENDING", !preview.lactoseStatus || preview.lactoseStatus === "NEEDS_REVIEW", "Confira a informação de lactose dos ingredientes e confirme a declaração do produto.", "lactose"],
      ["PROCESS_PENDING", !preview.crossContaminationRisk || preview.crossContaminationRisk === "UNKNOWN", "Avalie o risco de contato com outros alergênicos durante a produção.", "processo"]
    ] as const;
    for (const [code, missing, message, anchor] of fields) if (missing) pending.push({ code, severity: declaration.severity, message, href: `${review}#${anchor}` });
    declaration.message = "Salve a revisão das informações obrigatórias depois de completar as pendências indicadas.";
  }
  return pending;
}

// Group presentation only. The compositor and PDF assessment keep every blocking rule.
export function groupedFinalLabelPending(preview: FinalLabelPreview, format?: string, template?: string) {
  const pending = finalLabelPending(preview, format, template);
  const hasNutrientDetails = pending.some(issue => issue.code.startsWith("NUTRIENT_"));
  const hasDeclarationDetails = pending.some(issue => issue.code.endsWith("_PENDING"));
  const groups = new Map<string, typeof pending>();
  for (const issue of pending) {
    // These summaries repeat the specific fields shown below; their blocking decisions remain untouched.
    if (issue.code === "INCOMPLETE_NUTRITION" && hasNutrientDetails) continue;
    if (["MISSING_REQUIRED_DECLARATION", "DECLARATION_REQUIRES_REVIEW"].includes(issue.code) && hasDeclarationDetails) continue;
    const title = issue.code.startsWith("NUTRIENT_") || ["INCOMPLETE_NUTRITION", "FRONT_LABEL_UNKNOWN"].includes(issue.code)
      ? "Dados nutricionais"
      : issue.code.startsWith("FRONT_LABEL_") ? "Avaliação da lupa"
      : /ALLERGEN|DECLARATION|GLUTEN|LACTOSE|PROCESS/.test(issue.code) ? "Declarações do produto"
      : "Receita e embalagem";
    const items = groups.get(title) ?? [];
    if (!items.some(item => item.message === issue.message && item.href === issue.href)) items.push(issue);
    groups.set(title, items);
  }
  return [...groups].map(([title, items]) => ({ title, items }));
}

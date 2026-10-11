"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { labelPreviewHref, resolveLabelFormat, resolveLabelTemplate } from "@/lib/final-label/visual";
import { IngredientComplementError } from "./complement";
import { completeRecipeIngredient } from "./complement-repository";

export async function completeRecipeIngredientAction(_previous: { error: string | null }, form: FormData): Promise<{ error: string | null }> {
  const user = await requireUser();
  const value = (key: string) => typeof form.get(key) === "string" ? String(form.get(key)).trim() : "";
  try {
    await completeRecipeIngredient(user.id, value("recipeId"), value("itemId"), value("ingredientId"), form);
  } catch (error) {
    const messages: Record<IngredientComplementError["code"], string> = {
      source: "Informe o rótulo ou a ficha técnica e confirme que a fonte corresponde ao mesmo produto.",
      number: "Informe somente valores numéricos não negativos. Deixe em branco o que a fonte não informa.",
      precision: "O valor por 100 g/ml deve caber em duas casas decimais e até 99.999.999,99. Não arredonde um valor pequeno para zero; confira a fonte antes de continuar.",
      declaration: "Confira os alergênicos e a declaração completa da fonte. Campo vazio ou aviso de ‘pode conter’ não confirma ausência.",
      unchanged: "Complete pelo menos uma informação ausente. Se não souber, volte ao rótulo sem salvar.",
      stale: "Este ingrediente foi alterado ou já complementado. Volte ao rótulo e abra a pendência novamente.",
      denied: "O ingrediente não está disponível nesta receita e conta. Volte ao rótulo."
    };
    return { error: error instanceof IngredientComplementError ? messages[error.code] : "Não foi possível salvar. Nenhuma complementação parcial foi mantida. Volte ao rótulo para conferir antes de tentar novamente." };
  }
  redirect(labelPreviewHref(value("recipeId"), resolveLabelFormat(value("format")), resolveLabelTemplate(value("template"))));
}

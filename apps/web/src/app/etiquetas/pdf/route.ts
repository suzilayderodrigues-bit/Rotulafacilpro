import { getCurrentUser } from "@/lib/auth/session";
import { findRecipe } from "@/lib/recipes/repository";
import {
  prepareProductionLabelPdf,
  productionLabelContentDisposition,
  renderProductionLabelPdf
} from "@/lib/production-labels/pdf";

export const runtime = "nodejs";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Faça login para gerar etiquetas.", { status: 401 });

  const formData = await request.formData();
  const recipeId = formValue(formData, "recipeId");
  const recipe = await findRecipe(user.id, recipeId);
  if (!recipe) return new Response("Produto não encontrado para esta conta.", { status: 404 });

  const preparation = prepareProductionLabelPdf(recipe, {
    recipeId,
    lot: formValue(formData, "lot"),
    manufacturedAt: formValue(formData, "manufacturedAt"),
    expiresAt: formValue(formData, "expiresAt"),
    format: formValue(formData, "format"),
    quantity: formValue(formData, "quantity"),
    mode: formValue(formData, "mode")
  });
  if (preparation.status === "BLOCKED") {
    return Response.json({ code: preparation.code, message: preparation.message }, { status: 400 });
  }

  const result = await renderProductionLabelPdf(preparation.value);
  return new Response(Uint8Array.from(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": productionLabelContentDisposition(result.filename, formValue(formData, "intent")),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

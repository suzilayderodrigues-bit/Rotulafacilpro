import { getCurrentUser } from "@/lib/auth/session";
import { findBarcode } from "@/lib/barcodes/repository";
import { renderBarcodePrintPdf } from "@/lib/barcodes/print";
import { findRecipe } from "@/lib/recipes/repository";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ barcodeId: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado.", { status: 401, headers });
  const { barcodeId } = await params;
  const recipeId = new URL(request.url).searchParams.get("recipeId");
  const barcode = await findBarcode(user.id, barcodeId);
  if (!barcode || !recipeId || barcode.recipeId !== recipeId) {
    return new Response("Código não encontrado para este produto.", { status: 404, headers });
  }
  const recipe = await findRecipe(user.id, recipeId);
  if (!recipe) return new Response("Produto não encontrado.", { status: 404, headers });
  try {
    const result = await renderBarcodePrintPdf(barcode, recipe.name);
    return new Response(Uint8Array.from(result.buffer), {
      headers: { ...headers, "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${result.filename}"`, "X-Content-Type-Options": "nosniff" }
    });
  } catch {
    return new Response("Não foi possível preparar a impressão do código. Tente novamente.", { status: 503, headers });
  }
}

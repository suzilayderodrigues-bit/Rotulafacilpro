import { getCurrentUser } from "@/lib/auth/session";
import { buildFinalLabelPreview } from "@/lib/final-label/preview";
import { renderNutritionTablePdf } from "@/lib/nutrition-table/pdf";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ recipeId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Faça login para baixar a tabela.", { status: 401 });
  const { recipeId } = await params;
  const preview = await buildFinalLabelPreview(recipeId, user.id);
  if (!preview) return new Response("Tabela não encontrada para esta conta.", { status: 404 });
  // Rebuild from stored data and recheck every guard, including direct route access.
  const result = await renderNutritionTablePdf(preview);
  if (result.status === "BLOCKED") {
    return Response.json({ code: result.assessment.code, message: result.assessment.message }, {
      status: 409, headers: { "Cache-Control": "private, no-store" }
    });
  }
  const inline = new URL(request.url).searchParams.get("mode") === "print";
  return new Response(Uint8Array.from(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${result.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

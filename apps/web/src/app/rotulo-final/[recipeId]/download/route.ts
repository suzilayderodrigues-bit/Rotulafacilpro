import { getCurrentUser } from "@/lib/auth/session";
import { buildFinalLabelPreview } from "@/lib/final-label/preview";
import { renderFinalLabelPdf } from "@/lib/final-label/pdf";
import { finalLabelContentDisposition } from "@/lib/final-label/production";
import { resolveLabelFormat, resolveLabelTemplate } from "@/lib/final-label/visual";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ recipeId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Faça login para baixar o PDF.", { status: 401 });

  const { recipeId } = await params;
  const preview = await buildFinalLabelPreview(recipeId, user.id);
  if (!preview) return new Response("Rótulo não encontrado para esta conta.", { status: 404 });

  const url = new URL(request.url);
  const format = resolveLabelFormat(url.searchParams.get("format") ?? undefined);
  const template = resolveLabelTemplate(url.searchParams.get("template") ?? undefined);
  const mode = url.searchParams.get("mode");
  const result = await renderFinalLabelPdf(preview, format, template);
  if (result.status === "BLOCKED") {
    return Response.json({ code: result.assessment.code, message: result.assessment.message }, { status: 409 });
  }

  return new Response(Uint8Array.from(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": finalLabelContentDisposition(result.filename, mode),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

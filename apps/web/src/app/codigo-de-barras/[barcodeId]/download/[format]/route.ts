import { getCurrentUser } from "@/lib/auth/session";
import { barcodeDownloadName } from "@/lib/barcodes/download";
import { findBarcode } from "@/lib/barcodes/repository";
import { renderBarcodePng, renderBarcodeSvg } from "@/lib/barcodes/render";

export async function GET(_request: Request, { params }: { params: Promise<{ barcodeId: string; format: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado.", { status: 401 });
  const { barcodeId, format } = await params;
  if (format !== "svg" && format !== "png") return new Response("Formato não encontrado.", { status: 404 });
  const barcode = await findBarcode(user.id, barcodeId);
  if (!barcode) return new Response("Código não encontrado.", { status: 404 });

  const input = { value: barcode.value, type: barcode.type, format: barcode.format };
  try {
    const body = format === "svg" ? renderBarcodeSvg(input).svg : await renderBarcodePng(input);
    if (!body) return new Response("Imagem indisponível.", { status: 503 });
    const responseBody = typeof body === "string" ? body : new Uint8Array(body);
    return new Response(responseBody, {
      headers: {
        "Content-Type": format === "svg" ? "image/svg+xml; charset=utf-8" : "image/png",
        "Content-Disposition": `attachment; filename="${barcodeDownloadName(barcode.value, format)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return new Response("Imagem indisponível.", { status: 503 });
  }
}

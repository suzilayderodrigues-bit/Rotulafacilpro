import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/design-system";
import { CreateBarcodeForm } from "@/app/codigo-de-barras/create-barcode-form";
import type { findBarcodeByRecipe } from "@/lib/barcodes/repository";
import { renderBarcodeSvg, type BarcodeRenderResult } from "@/lib/barcodes/render";

type Props = { recipeId: string; recipeName: string; barcode: Awaited<ReturnType<typeof findBarcodeByRecipe>>; status?: string };

const messages: Record<string, string> = {
  "interno-criado": "Código interno criado para este produto.",
  "receita-ocupada": "Este produto já possui um código. Ele foi mantido.",
  "receita-nao-encontrada": "Produto não encontrado nesta conta.",
  "limite-gratis": "O código disponível no plano grátis já foi utilizado.",
  "limite-mensal": "Você atingiu o limite de códigos deste ciclo.",
  "ciclo-indisponivel": "Não foi possível confirmar seu ciclo atual. Tente novamente.",
  "plano-revisao": "Seu plano precisa de conferência antes de gerar um código.",
  duplicado: "Este código já está cadastrado. Confira os códigos existentes.",
  erro: "Não foi possível gerar o código. Tente novamente."
};

export function ProductBarcodeSection({ recipeId, recipeName, barcode, status }: Props) {
  let display: BarcodeRenderResult | null = null;
  if (barcode) {
    try { display = renderBarcodeSvg(barcode); } catch { /* Keep the product page usable for malformed legacy codes. */ }
  }
  const managementHref = `/codigo-de-barras?recipeId=${encodeURIComponent(recipeId)}`;
  return <Card className="min-w-0 space-y-3 shadow-none" id="codigo-interno">
    <CardHeader className="flex-col"><CardTitle>Código de barras do produto</CardTitle><CardDescription>Identifique seu produto e imprima o código separadamente da tabela nutricional.</CardDescription></CardHeader>
    {status && messages[status] ? <p role="status" className="text-sm">{messages[status]}</p> : null}
    {barcode ? <>
      <p className="text-sm font-semibold">{recipeName}</p>
      <p className="break-all font-mono text-sm">{barcode.value}</p>
      {display?.status === "READY" ? <>
        <div className="rounded border bg-white p-4"><img className="max-h-36 w-full object-contain" src={`data:image/svg+xml,${encodeURIComponent(display.svg)}`} alt={`Código de barras de ${recipeName}: ${barcode.value}`} /></div>
        <p className="text-xs text-[var(--muted)]">{barcode.type === "INTERNAL" ? "Código interno — não substitui GTIN oficial" : "Código oficial GTIN"} · {display.symbology}</p>
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <a href={`/codigo-de-barras/${encodeURIComponent(barcode.id)}/download/svg`} className="inline-flex min-h-11 items-center rounded border px-3">Baixar SVG</a>
          <a href={`/codigo-de-barras/${encodeURIComponent(barcode.id)}/download/png`} className="inline-flex min-h-11 items-center rounded border px-3">Baixar PNG</a>
          <a href={`/codigo-de-barras/${encodeURIComponent(barcode.id)}/imprimir?recipeId=${encodeURIComponent(recipeId)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded border px-3">Imprimir código</a>
        </div>
        <p className="text-xs text-[var(--muted)]">A impressão abre um PDF só do código. Use folha A4, tamanho real (100%), sem ajustar à página.</p>
      </> : <p className="text-sm">Não foi possível visualizar este código. Confira o cadastro em Gerenciar códigos.</p>}
    </> : <>
      <p className="text-sm">Gere um código interno para este produto. A geração segue os limites do seu plano.</p>
      <p className="text-xs text-[var(--muted)]">Código interno — não substitui GTIN oficial</p>
      <CreateBarcodeForm internal recipes={[]} fixedProduct={{ id: recipeId, name: recipeName }} />
    </>}
    <Link href={managementHref} className="inline-flex min-h-11 items-center text-sm underline">{barcode ? "Gerenciar códigos" : "Usar um código já cadastrado"}</Link>
  </Card>;
}

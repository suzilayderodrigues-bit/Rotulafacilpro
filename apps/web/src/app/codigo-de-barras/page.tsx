import { Badge, Button, Card, Input, Label } from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { createInternalBarcodeAction, createOfficialBarcodeAction } from "@/lib/barcodes/actions";
import { listBarcodes } from "@/lib/barcodes/repository";
import { renderBarcodeSvg } from "@/lib/barcodes/render";
import { listRecipes } from "@/lib/recipes/repository";
import { DeleteBarcodeForm } from "./delete-barcode-form";

const messages: Record<string, string> = {
  "oficial-criado": "Código oficial cadastrado com sucesso.",
  "interno-criado": "Código interno criado com sucesso.",
  excluido: "Código excluído.",
  comprimento: "Esse código possui uma quantidade de dígitos inválida.",
  digito: "O dígito verificador desse GTIN não confere.",
  "gtin-invalido": "Esse código não é um GTIN válido. Digite apenas números.",
  duplicado: "Este código já está cadastrado na sua conta.",
  "nao-encontrado": "Código não encontrado na sua conta.",
  erro: "Não foi possível concluir a operação. Tente novamente."
};

export default async function BarcodePage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  const [barcodes, recipes, query] = await Promise.all([
    listBarcodes(user.id),
    listRecipes(user.id),
    searchParams
  ]);
  const recipeNames = new Map(recipes.map((recipe) => [recipe.id, recipe.name]));
  const message = query.status ? messages[query.status] : undefined;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar activeItem="Código de Barras" />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl space-y-6 px-5 py-6 lg:px-8 lg:py-8">
            <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <Badge variant="secondary">Código de Barras</Badge>
              <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">Código de Barras</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)] sm:text-base">
                Crie um código interno ou use um GTIN oficial que você já possui.
              </p>
            </section>

            {message ? <p role="status" className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm">{message}</p> : null}

            <section className="grid gap-4 lg:grid-cols-2" aria-label="Criar código de barras">
              <Card className="shadow-none">
                <h2 className="text-lg font-semibold">Já tenho um código oficial</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">Use um GTIN que já pertence ao seu produto.</p>
                <form action={createOfficialBarcodeAction} className="mt-5 space-y-4">
                  <div>
                    <Label htmlFor="gtin">Código GTIN</Label>
                    <Input id="gtin" name="gtin" inputMode="numeric" autoComplete="off" required placeholder="Digite o número do GTIN" />
                  </div>
                  <Button type="submit" className="w-full sm:w-auto">Validar e salvar</Button>
                </form>
              </Card>
              <Card className="shadow-none">
                <h2 className="text-lg font-semibold">Gerar código interno</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">Crie um código para identificação e organização dentro do seu negócio.</p>
                <p className="mt-3 text-sm font-medium text-[var(--brand-petrol)]">Este código não substitui um GTIN oficial.</p>
                <form action={createInternalBarcodeAction} className="mt-5">
                  <Button type="submit" className="w-full sm:w-auto">Gerar código interno</Button>
                </form>
              </Card>
            </section>

            <section aria-labelledby="my-barcodes-title">
              <h2 id="my-barcodes-title" className="mb-4 text-xl font-semibold">Meus códigos</h2>
              {barcodes.length === 0 ? (
                <Card className="text-center shadow-none">
                  <p className="font-semibold">Você ainda não criou nenhum código de barras.</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">Gere um código interno ou cadastre o GTIN oficial do seu produto.</p>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {barcodes.map((barcode) => {
                    const display = renderBarcodeSvg({
                      value: barcode.value,
                      type: barcode.type,
                      format: barcode.format
                    });
                    return (
                      <Card key={barcode.id} className="min-w-0 shadow-none">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{barcode.type === "INTERNAL" ? "Código interno" : "Código oficial"}</p>
                            {barcode.type === "OFFICIAL_GTIN" ? <p className="text-xs text-[var(--muted)]">{barcode.format.replace("_", "-")}</p> : null}
                          </div>
                          <DeleteBarcodeForm barcodeId={barcode.id} />
                        </div>
                        <p className="mt-3 break-all font-mono text-sm">{barcode.value}</p>
                        <div className="mt-4 flex min-h-24 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-3 text-center text-xs text-[var(--muted)]">
                          {display.status === "UNAVAILABLE" ? "Visualização gráfica temporariamente indisponível." : (
                            // A futura biblioteca fornecerá o SVG; nenhum SVG é aceito da pessoa usuária.
                            <img className="max-h-28 w-full object-contain" src={`data:image/svg+xml,${encodeURIComponent(display.svg)}`} alt={`Código de barras ${barcode.value}`} />
                          )}
                        </div>
                        <p className="mt-3 text-xs text-[var(--muted)]">{barcode.recipeId ? `Produto/receita: ${recipeNames.get(barcode.recipeId) ?? "Não disponível"}` : "Sem receita associada"}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">Criado em {barcode.createdAt.toLocaleDateString("pt-BR")}</p>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

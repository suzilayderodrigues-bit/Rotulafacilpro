"use client";

import { useMemo, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle, Input, Label, Select } from "@/components/design-system";
import {
  assessProductionLabelComposition,
  buildProductionLabelPreview,
  defaultProductionLabelFormat,
  maximumProductionLabelQuantity,
  parseProductionLabelQuantity,
  productionLabelFormats,
  productionLabelSummary,
  validateProductionLabelInput,
  type ProductionLabelFormat,
  type ProductionLabelRecipe
} from "@/lib/production-labels/domain";

type ProductionLabelFormProps = {
  recipes: ProductionLabelRecipe[];
};

const previewClasses: Record<ProductionLabelFormat, string> = {
  MINI: "max-w-[22rem] px-4 py-3 text-[11px]",
  COMPACTA: "max-w-[24rem] px-5 py-4 text-xs",
  PADRAO: "max-w-[26rem] px-5 py-4 text-xs"
};

export function ProductionLabelForm({ recipes }: ProductionLabelFormProps) {
  const [recipeId, setRecipeId] = useState("");
  const [lot, setLot] = useState("");
  const [manufacturedAt, setManufacturedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [format, setFormat] = useState<ProductionLabelFormat>(defaultProductionLabelFormat);
  const [quantityInput, setQuantityInput] = useState("1");

  const input = useMemo(() => ({ recipeId, lot, manufacturedAt, expiresAt }), [expiresAt, lot, manufacturedAt, recipeId]);
  const validation = useMemo(() => validateProductionLabelInput(recipes, input), [input, recipes]);
  const preview = useMemo(() => buildProductionLabelPreview(recipes, input), [input, recipes]);
  const quantity = useMemo(() => parseProductionLabelQuantity(quantityInput), [quantityInput]);
  const composition = useMemo(() => assessProductionLabelComposition(preview, format), [format, preview]);
  const formatOption = productionLabelFormats[format];
  const isReady = validation.valid && quantity !== null && composition.status === "READY";

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.75fr)]">
      <div className="min-w-0 space-y-5">
        <Card className="shadow-none">
          <CardHeader className="flex-col">
            <CardTitle>1. Produto</CardTitle>
            <CardDescription>Escolha uma receita da sua conta. O nome será usado como nome do produto.</CardDescription>
          </CardHeader>
          <div>
            <Label htmlFor="production-recipe">Produto</Label>
            <Select
              id="production-recipe"
              value={recipeId}
              onChange={(event) => setRecipeId(event.target.value)}
              fieldState={recipeId && validation.errors.recipeId ? "error" : "default"}
              className="h-12 text-base"
            >
              <option value="">Selecione uma receita</option>
              {recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}
            </Select>
            {recipeId && validation.errors.recipeId ? <p className="mt-2 text-sm text-[var(--error)]">{validation.errors.recipeId}</p> : null}
          </div>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex-col">
            <CardTitle>2. Dados da produção</CardTitle>
            <CardDescription>Preencha os dados desta produção. Nada será salvo nesta etapa.</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="production-lot">Lote</Label>
              <Input
                id="production-lot"
                value={lot}
                onChange={(event) => setLot(event.target.value)}
                placeholder="Ex.: L240926"
                autoComplete="off"
                maxLength={60}
                fieldState={lot && validation.errors.lot ? "error" : "default"}
                className="h-12 text-base"
              />
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Use a identificação que já faz sentido na sua produção.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="manufactured-at">Data de fabricação</Label>
                <Input
                  id="manufactured-at"
                  type="date"
                  value={manufacturedAt}
                  onChange={(event) => setManufacturedAt(event.target.value)}
                  fieldState={manufacturedAt && validation.errors.manufacturedAt ? "error" : "default"}
                  className="h-12 text-base"
                />
                {manufacturedAt && validation.errors.manufacturedAt ? <p className="mt-2 text-sm text-[var(--error)]">{validation.errors.manufacturedAt}</p> : null}
              </div>
              <div>
                <Label htmlFor="expires-at">Data de validade</Label>
                <Input
                  id="expires-at"
                  type="date"
                  value={expiresAt}
                  min={manufacturedAt || undefined}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  fieldState={expiresAt && validation.errors.expiresAt ? "error" : "default"}
                  className="h-12 text-base"
                />
                {expiresAt && validation.errors.expiresAt ? <p className="mt-2 text-sm text-[var(--error)]">{validation.errors.expiresAt}</p> : null}
              </div>
            </div>
          </div>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex-col">
            <CardTitle>3. Formato e quantidade</CardTitle>
            <CardDescription>Escolha o tamanho físico e informe quantas etiquetas deseja preparar.</CardDescription>
          </CardHeader>
          <div className="grid gap-3 sm:grid-cols-3" aria-label="Formato da etiqueta">
            {Object.entries(productionLabelFormats).map(([key, option]) => {
              const value = key as ProductionLabelFormat;
              const selected = value === format;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFormat(value)}
                  className={`min-h-20 rounded-[var(--radius-md)] border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tiffany)] ${selected ? "border-[var(--brand-tiffany)] bg-[#eafffe]" : "border-[var(--border)] bg-white hover:border-[#b9e8ef]"}`}
                >
                  <span className="block font-semibold">{option.name}</span>
                  <span className="mt-1 block text-sm text-[var(--muted)]">{option.widthMm} × {option.heightMm} mm</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 max-w-xs">
            <Label htmlFor="production-label-quantity">Quantidade de etiquetas</Label>
            <Input
              id="production-label-quantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={maximumProductionLabelQuantity}
              step={1}
              value={quantityInput}
              onChange={(event) => setQuantityInput(event.target.value)}
              fieldState={quantityInput && quantity === null ? "error" : "default"}
              className="h-12 text-base"
            />
            {quantityInput && quantity === null ? <p className="mt-2 text-sm text-[var(--error)]">Informe um número inteiro entre 1 e {maximumProductionLabelQuantity}.</p> : null}
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Limite técnico desta tela: {maximumProductionLabelQuantity} etiquetas.</p>
          </div>
        </Card>
      </div>

      <aside className="min-w-0">
        <Card className="sticky top-5 shadow-none">
          <CardHeader className="flex-col">
            <CardTitle>4. Prévia</CardTitle>
            <CardDescription>A etiqueta acompanha os campos enquanto você preenche.</CardDescription>
          </CardHeader>
          <div
            aria-live="polite"
            style={{ aspectRatio: `${formatOption.widthMm} / ${formatOption.heightMm}` }}
            className={`mx-auto flex w-full flex-col justify-center overflow-x-hidden overflow-y-auto rounded-[var(--radius-md)] border-2 border-[var(--border-strong)] bg-white text-center shadow-[var(--shadow-soft)] ${previewClasses[format]}`}
          >
            <p className="break-words font-bold uppercase leading-tight tracking-wide">{preview.productName ?? "NOME DO PRODUTO"}</p>
            <div className="mt-2 space-y-0.5 text-left leading-tight">
              <p><span className="font-semibold">Lote:</span> <span className="break-all">{preview.lot || "—"}</span></p>
              <p><span className="font-semibold">Fab.:</span> {preview.manufacturedAt ?? "—"}</p>
              <p><span className="font-semibold">Val.:</span> {preview.expiresAt ?? "—"}</p>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-[var(--muted)]">Prévia ampliada · Tamanho real: {formatOption.widthMm} × {formatOption.heightMm} mm</p>
          {composition.status === "CONTENT_OVERFLOW" ? (
            <div className="mt-4 rounded-[var(--radius-md)] border border-[#f4d5b6] bg-[#fff8f0] p-3 text-sm text-[#8a4b15]">
              <p className="font-semibold">Conteúdo muito extenso</p>
              <p className="mt-1">{composition.message}</p>
            </div>
          ) : null}
          {quantity !== null ? <p className="mt-4 text-center text-sm font-semibold">{productionLabelSummary(quantity, format)}</p> : null}
          <p className={`mt-4 rounded-[var(--radius-md)] px-3 py-2 text-sm ${isReady ? "bg-[var(--success-bg)] text-[var(--success)]" : "bg-[var(--surface-muted)] text-[var(--muted)]"}`}>
            {isReady ? "Composição pronta para a próxima etapa." : composition.status === "CONTENT_OVERFLOW" ? "Escolha um formato maior para manter a legibilidade." : "Preencha produto, lote, fabricação, validade e quantidade para concluir a prévia."}
          </p>
        </Card>
      </aside>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle, Input, Label, Select } from "@/components/design-system";
import {
  buildProductionLabelPreview,
  validateProductionLabelInput,
  type ProductionLabelRecipe
} from "@/lib/production-labels/domain";

type ProductionLabelFormProps = {
  recipes: ProductionLabelRecipe[];
};

export function ProductionLabelForm({ recipes }: ProductionLabelFormProps) {
  const [recipeId, setRecipeId] = useState("");
  const [lot, setLot] = useState("");
  const [manufacturedAt, setManufacturedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const input = useMemo(() => ({ recipeId, lot, manufacturedAt, expiresAt }), [expiresAt, lot, manufacturedAt, recipeId]);
  const validation = useMemo(() => validateProductionLabelInput(recipes, input), [input, recipes]);
  const preview = useMemo(() => buildProductionLabelPreview(recipes, input), [input, recipes]);

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
      </div>

      <aside className="min-w-0">
        <Card className="sticky top-5 shadow-none">
          <CardHeader className="flex-col">
            <CardTitle>3. Prévia</CardTitle>
            <CardDescription>A etiqueta acompanha os campos enquanto você preenche.</CardDescription>
          </CardHeader>
          <div aria-live="polite" className="mx-auto w-full max-w-sm rounded-[var(--radius-md)] border-2 border-[var(--border-strong)] bg-white px-5 py-6 text-center shadow-[var(--shadow-soft)]">
            <p className="break-words text-lg font-bold uppercase tracking-wide">{preview.productName ?? "NOME DO PRODUTO"}</p>
            <div className="mt-5 space-y-2 text-left text-sm">
              <p><span className="font-semibold">Lote:</span> <span className="break-all">{preview.lot || "—"}</span></p>
              <p><span className="font-semibold">Fab.:</span> {preview.manufacturedAt ?? "—"}</p>
              <p><span className="font-semibold">Val.:</span> {preview.expiresAt ?? "—"}</p>
            </div>
          </div>
          <p className={`mt-4 rounded-[var(--radius-md)] px-3 py-2 text-sm ${validation.valid ? "bg-[var(--success-bg)] text-[var(--success)]" : "bg-[var(--surface-muted)] text-[var(--muted)]"}`}>
            {validation.valid ? "Dados válidos para esta prévia." : "Preencha produto, lote, fabricação e validade para concluir a prévia."}
          </p>
        </Card>
      </aside>
    </div>
  );
}

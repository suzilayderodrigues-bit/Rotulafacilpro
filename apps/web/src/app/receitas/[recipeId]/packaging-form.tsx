"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/design-system";
import type { ServingSuggestion } from "@/lib/regulatory";

type PackagingFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  recipeId: string;
  unit: "GRAM" | "MILLILITER";
  unitLabel: string;
  defaultNetQuantity: string;
  defaultServingSize: string;
  defaultHouseholdMeasure: string;
  suggestion: ServingSuggestion;
};

export function PackagingForm({
  action,
  recipeId,
  unit,
  unitLabel,
  defaultNetQuantity,
  defaultServingSize,
  defaultHouseholdMeasure,
  suggestion
}: PackagingFormProps) {
  const [servingSize, setServingSize] = useState(defaultServingSize);
  const [householdMeasure, setHouseholdMeasure] = useState(defaultHouseholdMeasure);
  const hasSavedServing = Boolean(defaultServingSize || defaultHouseholdMeasure);

  function useSuggestion() {
    if (!suggestion.matched) return;
    setServingSize(String(suggestion.servingSize).replace(".", ","));
    setHouseholdMeasure(suggestion.householdMeasure);
  }

  return (
    <>
      {suggestion.matched ? (
        <div className="mb-4 rounded-[var(--radius-md)] border border-[#d5edf2] bg-[#f3fbfd] px-4 py-3 text-sm text-[var(--brand-petrol)]">
          <p className="font-semibold">Porção sugerida para esta categoria</p>
          <p className="mt-1">
            {suggestion.servingSize} {unitLabel} · {suggestion.householdMeasure}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {suggestion.regulatoryVersion} · {suggestion.sourceReference}
          </p>
          {hasSavedServing ? (
            <p className="mt-2 text-xs text-[var(--muted)]">A porção já salva será preservada até você decidir usar a sugestão e salvar.</p>
          ) : null}
          <Button type="button" variant="secondary" className="mt-3" onClick={useSuggestion}>
            Usar sugestão
          </Button>
        </div>
      ) : (
        <p className="mb-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)]">
          Defina a porção do produto.
        </p>
      )}

      <form action={action} className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr_auto] lg:items-end">
        <input type="hidden" name="recipeId" value={recipeId} />
        <input type="hidden" name="netQuantityUnit" value={unit} />
        <input type="hidden" name="servingUnit" value={unit} />
        <div className="space-y-2">
          <Label htmlFor="netQuantity">Quantidade líquida da embalagem</Label>
          <div className="flex overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white focus-within:ring-2 focus-within:ring-[var(--ring)]">
            <Input id="netQuantity" name="netQuantity" inputMode="decimal" defaultValue={defaultNetQuantity} className="border-0 focus:ring-0" placeholder="500" />
            <span className="flex items-center border-l border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)]">{unitLabel}</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="servingSize">Porção</Label>
          <div className="flex overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white focus-within:ring-2 focus-within:ring-[var(--ring)]">
            <Input id="servingSize" name="servingSize" inputMode="decimal" value={servingSize} onChange={(event) => setServingSize(event.target.value)} className="border-0 focus:ring-0" placeholder="50" />
            <span className="flex items-center border-l border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)]">{unitLabel}</span>
          </div>
          <p className="text-xs leading-5 text-[var(--muted)]">Esse valor será usado para preparar a tabela nutricional.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="householdMeasure">Medida caseira</Label>
          <Input id="householdMeasure" name="householdMeasure" value={householdMeasure} onChange={(event) => setHouseholdMeasure(event.target.value)} placeholder="1 unidade" />
        </div>
        <Button type="submit">Salvar</Button>
      </form>
    </>
  );
}

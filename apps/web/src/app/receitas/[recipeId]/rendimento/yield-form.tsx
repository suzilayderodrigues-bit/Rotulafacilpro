"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button, Input, Label } from "@/components/design-system";
import { validateRecipeYieldInput } from "@/lib/recipes/domain";
import { updateRecipeYieldAction } from "@/lib/recipes/actions";

type YieldFormProps = {
  recipeId: string;
  unitLabel: "g" | "ml";
  finalYieldLabel: string;
  unitWeightLabel: string;
  defaultFinalYieldAmount: string;
  defaultUnitsProduced: string;
  defaultUnitWeight: string;
};

export function YieldForm(props: YieldFormProps) {
  const [mode, setMode] = useState(props.defaultFinalYieldAmount && !props.defaultUnitsProduced ? "BULK" : "UNITS");
  const [unitsProduced, setUnitsProduced] = useState(props.defaultUnitsProduced);
  const [unitWeight, setUnitWeight] = useState(props.defaultUnitWeight);
  const [finalYieldAmount, setFinalYieldAmount] = useState(props.defaultFinalYieldAmount);
  let total: number | null = null;
  try {
    total = validateRecipeYieldInput({ yieldMode: mode, unitsProduced, unitWeight, finalYieldAmount }).finalYieldAmount;
  } catch { /* Incomplete input has no invented total. */ }

  return <form action={updateRecipeYieldAction} className="space-y-5">
    <input type="hidden" name="recipeId" value={props.recipeId} />
    <Label htmlFor="yieldMode">Como o produto é vendido?</Label>
    <select id="yieldMode" name="yieldMode" value={mode} onChange={event => setMode(event.target.value)} className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3">
      <option value="UNITS">Por unidades prontas</option>
      <option value="BULK">Por peso ou volume</option>
    </select>
    <div className="grid gap-4 sm:grid-cols-2">
      {mode === "UNITS" ? <>
        <div><Label htmlFor="unitsProduced">Quantidade de unidades prontas</Label><Input id="unitsProduced" name="unitsProduced" type="number" min="1" step="1" inputMode="numeric" required value={unitsProduced} onChange={event => setUnitsProduced(event.target.value)} /></div>
        <div><Label htmlFor="unitWeight">{props.unitWeightLabel} ({props.unitLabel})</Label><Input id="unitWeight" name="unitWeight" type="number" min="0.01" step="0.01" inputMode="decimal" required value={unitWeight} onChange={event => setUnitWeight(event.target.value)} /></div>
      </> : <div><Label htmlFor="finalYieldAmount">{props.finalYieldLabel} ({props.unitLabel})</Label><Input id="finalYieldAmount" name="finalYieldAmount" type="number" min="0.01" step="0.01" inputMode="decimal" required value={finalYieldAmount} onChange={event => setFinalYieldAmount(event.target.value)} /></div>}
    </div>
    <p className="text-sm text-[var(--muted)]">Use somente o peso ou volume do produto pronto, depois do preparo; não o da massa crua.</p>
    <p role="status" className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3 text-sm font-semibold">Rendimento final total: {total === null ? "preencha os campos acima" : `${total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${props.unitLabel}`}{mode === "UNITS" && total !== null ? " — calculado automaticamente" : ""}.</p>
    <div className="flex justify-end border-t border-[var(--border)] pt-5"><Button type="submit">Continuar<ArrowRight className="size-4" /></Button></div>
  </form>;
}


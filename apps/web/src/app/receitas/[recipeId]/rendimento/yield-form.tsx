"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button, Input, Label } from "@/components/design-system";
import { RecipeValidationError, validateRecipeYieldInput } from "@/lib/recipes/domain";
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

type CalculatedField = "finalYieldAmount" | "unitsProduced" | "unitWeight" | null;

function formatInputNumber(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "";

  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function previewLabel(field: CalculatedField, value: string, unitLabel: "g" | "ml") {
  if (!field || !value) return null;

  if (field === "finalYieldAmount") return "Calculado automaticamente: " + value + " " + unitLabel + " de rendimento final.";
  if (field === "unitsProduced") return "Calculado automaticamente: " + value + " unidades.";
  return "Calculado automaticamente: " + value + " " + unitLabel + " por unidade.";
}

export function YieldForm({
  recipeId,
  unitLabel,
  finalYieldLabel,
  unitWeightLabel,
  defaultFinalYieldAmount,
  defaultUnitsProduced,
  defaultUnitWeight
}: YieldFormProps) {
  const [finalYieldAmount, setFinalYieldAmount] = useState(defaultFinalYieldAmount);
  const [unitsProduced, setUnitsProduced] = useState(defaultUnitsProduced);
  const [unitWeight, setUnitWeight] = useState(defaultUnitWeight);

  const preview = useMemo(() => {
    const emptyFields = [
      ["finalYieldAmount", finalYieldAmount] as const,
      ["unitsProduced", unitsProduced] as const,
      ["unitWeight", unitWeight] as const
    ].filter(([, value]) => value.trim() === "");

    if (emptyFields.length !== 1) {
      return { field: null as CalculatedField, value: "", message: null as string | null };
    }

    try {
      const calculatedField = emptyFields[0];
      if (!calculatedField) {
        return { field: null as CalculatedField, value: "", message: null as string | null };
      }

      const resolved = validateRecipeYieldInput({ finalYieldAmount, unitsProduced, unitWeight });
      const field = calculatedField[0];
      const value = formatInputNumber(resolved[field]);

      return {
        field,
        value,
        message: previewLabel(field, value, unitLabel)
      };
    } catch (error) {
      if (error instanceof RecipeValidationError) {
        return { field: null as CalculatedField, value: "", message: null as string | null };
      }

      throw error;
    }
  }, [finalYieldAmount, unitLabel, unitWeight, unitsProduced]);

  const displayedFinalYieldAmount = preview.field === "finalYieldAmount" ? preview.value : finalYieldAmount;
  const displayedUnitsProduced = preview.field === "unitsProduced" ? preview.value : unitsProduced;
  const displayedUnitWeight = preview.field === "unitWeight" ? preview.value : unitWeight;

  return (
    <form action={updateRecipeYieldAction} className="space-y-5">
      <input type="hidden" name="recipeId" value={recipeId} />

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="finalYieldAmount">{finalYieldLabel}</Label>
          <div className="relative">
            <Input
              id="finalYieldAmount"
              name="finalYieldAmount"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={displayedFinalYieldAmount}
              onChange={(event) => setFinalYieldAmount(event.target.value)}
              className="h-12 pr-12 text-base"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--muted)]">
              {unitLabel}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Considere o peso ou volume depois do preparo.</p>
        </div>

        <div>
          <Label htmlFor="unitsProduced">Quantas unidades essa receita rende?</Label>
          <Input
            id="unitsProduced"
            name="unitsProduced"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={displayedUnitsProduced}
            onChange={(event) => setUnitsProduced(event.target.value)}
            className="h-12 text-base"
          />
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Informe apenas números inteiros, como 10.</p>
        </div>

        <div>
          <Label htmlFor="unitWeight">{unitWeightLabel}</Label>
          <div className="relative">
            <Input
              id="unitWeight"
              name="unitWeight"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={displayedUnitWeight}
              onChange={(event) => setUnitWeight(event.target.value)}
              className="h-12 pr-12 text-base"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--muted)]">
              {unitLabel}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Use o peso ou volume médio de cada unidade pronta.</p>
        </div>
      </div>

      {preview.message ? (
        <div className="rounded-[var(--radius-md)] border border-[#f4d5b6] bg-[#fff8f0] px-4 py-3 text-sm font-semibold text-[#9b4f13]">
          {preview.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-end">
        <Button type="submit" className="sm:min-w-36">
          Continuar
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </form>
  );
}


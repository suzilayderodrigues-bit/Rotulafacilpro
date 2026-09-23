"use client";

import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle, Input, Label, Select } from "@/components/design-system";
import { frontOfPackPackagingConditionOptions, type FrontOfPackPackagingCondition } from "@/lib/regulatory";
import { calculateMainPanelAreaCm2 } from "@/lib/recipes/main-panel";

type RegulatoryPackagingFieldsProps = {
  defaultCondition: FrontOfPackPackagingCondition | null;
  defaultWidthCm: string;
  defaultHeightCm: string;
};

function decimalValue(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function RegulatoryPackagingFields({
  defaultCondition,
  defaultWidthCm,
  defaultHeightCm
}: RegulatoryPackagingFieldsProps) {
  const [condition, setCondition] = useState<FrontOfPackPackagingCondition | "">(defaultCondition ?? "");
  const [widthCm, setWidthCm] = useState(defaultWidthCm);
  const [heightCm, setHeightCm] = useState(defaultHeightCm);
  const requiresPanel = condition === "PACKAGED_IN_ABSENCE_OF_CONSUMER";
  const area = calculateMainPanelAreaCm2(decimalValue(widthCm), decimalValue(heightCm));

  function changeCondition(value: string) {
    const next = value as FrontOfPackPackagingCondition | "";
    setCondition(next);
    if (next !== "PACKAGED_IN_ABSENCE_OF_CONSUMER") {
      setWidthCm("");
      setHeightCm("");
    }
  }

  return (
    <>
      <Card className="shadow-none">
        <CardHeader className="flex-col">
          <div>
            <CardTitle>Como você vende este produto?</CardTitle>
            <CardDescription>Escolha a opção que representa como o produto chega ao cliente.</CardDescription>
          </div>
        </CardHeader>
        <Label htmlFor="packagingCondition">Forma de venda</Label>
        <Select
          id="packagingCondition"
          name="packagingCondition"
          value={condition}
          onChange={(event) => changeCondition(event.target.value)}
          required
        >
          <option value="" disabled>Selecione como o produto é vendido</option>
          {frontOfPackPackagingConditionOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </Card>

      {requiresPanel ? (
        <Card className="shadow-none">
          <CardHeader className="flex-col">
            <div>
              <CardTitle>Qual é o tamanho da frente principal da embalagem?</CardTitle>
              <CardDescription>Informe somente a parte principal que fica visível para o cliente. Não use o tamanho total da cinta ou do rótulo.</CardDescription>
            </div>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="mainPanelWidthCm">Largura</Label>
              <div className="flex items-center gap-2">
                <Input id="mainPanelWidthCm" name="mainPanelWidthCm" inputMode="decimal" value={widthCm} onChange={(event) => setWidthCm(event.target.value)} required />
                <span className="text-sm font-semibold text-[var(--muted)]">cm</span>
              </div>
            </div>
            <div>
              <Label htmlFor="mainPanelHeightCm">Altura</Label>
              <div className="flex items-center gap-2">
                <Input id="mainPanelHeightCm" name="mainPanelHeightCm" inputMode="decimal" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} required />
                <span className="text-sm font-semibold text-[var(--muted)]">cm</span>
              </div>
            </div>
          </div>
          {area !== null ? (
            <p className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--brand-petrol)]" aria-live="polite">
              Área calculada pelo Rotula: {area.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} cm²
            </p>
          ) : null}
          <details className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-3 text-sm">
            <summary className="cursor-pointer font-semibold text-[var(--brand-petrol)]">Onde devo medir?</summary>
            <p className="mt-2 leading-6 text-[var(--muted)]">Meça a parte principal da embalagem que fica visível para o cliente. Não inclua dobras, áreas de fechamento, selagem ou partes de difícil visualização.</p>
          </details>
        </Card>
      ) : null}
    </>
  );
}

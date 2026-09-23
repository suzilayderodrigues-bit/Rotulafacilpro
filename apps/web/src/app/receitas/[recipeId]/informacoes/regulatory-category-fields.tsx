"use client";

import { useState } from "react";
import type {
  FrontOfPackNutrientAdditionStatus,
  FrontOfPackRegulatoryCategory
} from "@rotula-facil-pro/db";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/design-system";
import {
  conditionalAnnexXviCategories,
  primaryFrontOfPackRegulatoryCategoryOptions,
  specialFrontOfPackRegulatoryCategoryOptions
} from "@/lib/regulatory";

type RegulatoryCategoryFieldsProps = {
  defaultCategory: FrontOfPackRegulatoryCategory | null;
  defaultAddedSugarsAddition: FrontOfPackNutrientAdditionStatus | null;
  defaultSaturatedFatAddition: FrontOfPackNutrientAdditionStatus | null;
  defaultSodiumAddition: FrontOfPackNutrientAdditionStatus | null;
};

const additionOptions = [
  ["YES", "Sim"],
  ["NO", "Não"],
  ["UNKNOWN", "Não sei"]
] as const;

const nutrientQuestions = [
  ["addedSugarsAddition", "Foram adicionados ingredientes que acrescentam açúcares ao produto?"],
  ["saturatedFatAddition", "Foram adicionados ingredientes que aumentam a gordura saturada do produto?"],
  ["sodiumAddition", "Foram adicionados ingredientes que aumentam o sódio do produto?"]
] as const;

function Choice({
  name,
  value,
  label,
  defaultChecked,
  required,
  onChange
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
  required?: boolean;
  onChange?: () => void;
}) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        required={required}
        onChange={onChange}
        className="size-4 accent-[var(--brand-tiffany)]"
      />
      {label}
    </label>
  );
}

export function RegulatoryCategoryFields({
  defaultCategory,
  defaultAddedSugarsAddition,
  defaultSaturatedFatAddition,
  defaultSodiumAddition
}: RegulatoryCategoryFieldsProps) {
  const [category, setCategory] = useState<FrontOfPackRegulatoryCategory | null>(defaultCategory);
  const showsNutrientQuestions = category !== null && conditionalAnnexXviCategories.includes(category);
  const usesOptionalIngredientsWording = category === "CHEESE" || category === "FERMENTED_MILK";
  const specialSelected = specialFrontOfPackRegulatoryCategoryOptions.some(({ value }) => value === category);
  const defaults: Record<(typeof nutrientQuestions)[number][0], FrontOfPackNutrientAdditionStatus | null> = {
    addedSugarsAddition: defaultAddedSugarsAddition,
    saturatedFatAddition: defaultSaturatedFatAddition,
    sodiumAddition: defaultSodiumAddition
  };

  return (
    <>
      <Card className="shadow-none">
        <CardHeader className="flex-col">
          <div>
            <CardTitle>Seu produto se encaixa em alguma destas opções?</CardTitle>
            <CardDescription>Escolha uma opção simples. O Rotula interpreta as regras regulatórias para você.</CardDescription>
          </div>
        </CardHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          {primaryFrontOfPackRegulatoryCategoryOptions.map((option) => (
            <Choice
              key={option.value}
              name="regulatoryCategory"
              value={option.value}
              label={option.label}
              defaultChecked={defaultCategory === option.value}
              required
              onChange={() => setCategory(option.value)}
            />
          ))}
        </div>

        <details className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-3" open={specialSelected || undefined}>
          <summary className="cursor-pointer text-sm font-semibold text-[var(--brand-petrol)]">Meu produto é de outro tipo especial</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {specialFrontOfPackRegulatoryCategoryOptions.map((option) => (
              <Choice
                key={option.value}
                name="regulatoryCategory"
                value={option.value}
                label={option.label}
                defaultChecked={defaultCategory === option.value}
                required
                onChange={() => setCategory(option.value)}
              />
            ))}
          </div>
        </details>
      </Card>

      {showsNutrientQuestions ? (
        <Card className="shadow-none">
          <CardHeader className="flex-col">
            <div>
              <CardTitle>Só precisamos confirmar uma informação</CardTitle>
              <CardDescription>
                A Anvisa possui uma regra específica para este tipo de produto. Responda sobre os {usesOptionalIngredientsWording ? "ingredientes opcionais adicionados" : "ingredientes adicionados"} para o Rotula determinar corretamente a lupa frontal.
              </CardDescription>
            </div>
          </CardHeader>
          <div className="space-y-5">
            {nutrientQuestions.map(([name, question]) => (
              <fieldset key={name}>
                <legend className="mb-2 text-sm font-semibold text-[var(--foreground)]">{question}</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {additionOptions.map(([value, label]) => (
                    <Choice
                      key={value}
                      name={name}
                      value={value}
                      label={label}
                      defaultChecked={defaults[name] === value}
                      required
                    />
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </Card>
      ) : null}
    </>
  );
}

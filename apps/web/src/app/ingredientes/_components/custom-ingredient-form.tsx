"use client";

import { useState } from "react";
import { Plus, Save } from "lucide-react";
import { Button, Input, Label, Radio, Select, Textarea } from "@/components/design-system";
import { ingredientCategories } from "@/lib/ingredients/categories";
import {
  createCustomIngredientAction,
  updateCustomIngredientAction
} from "@/lib/ingredients/actions";

export type CustomIngredientFormInitial = {
  id?: string;
  name?: string;
  category?: string;
  baseUnit?: "GRAM" | "MILLILITER";
  nutrients?: Record<string, string | null>;
  containsGluten?: "yes" | "no" | "unknown";
  containsLactose?: "yes" | "no" | "unknown";
  allergens?: string;
  allergenStatus?: "UNKNOWN" | "KNOWN" | "NONE";
};

const nutrientFields = [
  ["Valor energético (kcal)", "caloriesKcal", "Ex.: 120"],
  ["Carboidratos (g)", "carbohydratesG", "Ex.: 10"],
  ["Açúcares totais (g)", "sugarsG", "Ex.: 8"],
  ["Açúcares adicionados (g)", "addedSugarsG", "Ex.: 0"],
  ["Proteínas (g)", "proteinsG", "Ex.: 3,5"],
  ["Gorduras totais (g)", "totalFatG", "Ex.: 4"],
  ["Gorduras saturadas (g)", "saturatedFatG", "Ex.: 2"],
  ["Gorduras trans (g)", "transFatG", "Ex.: 0"],
  ["Fibra alimentar (g)", "fiberG", "Ex.: 1"],
  ["Sódio (mg)", "sodiumMg", "Ex.: 65"],
  ["Cálcio (mg)", "calciumMg", "Ex.: 120"],
  ["Ferro (mg)", "ironMg", "Ex.: 0,2"]
] as const;

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  return (
    <Button type="submit" className="w-full sm:w-auto">
      {mode === "create" ? <Plus className="size-4" /> : <Save className="size-4" />}
      {mode === "create" ? "Cadastrar ingrediente" : "Salvar alterações"}
    </Button>
  );
}

export function CustomIngredientForm({
  mode,
  initial
}: {
  mode: "create" | "edit";
  initial?: CustomIngredientFormInitial;
}) {
  const [baseUnit, setBaseUnit] = useState(initial?.baseUnit ?? "GRAM");
  const [portionMode, setPortionMode] = useState<"per100" | "portion">("per100");
  const baseLabel = baseUnit === "MILLILITER" ? "ml" : "g";
  const action = mode === "create" ? createCustomIngredientAction : updateCustomIngredientAction;

  return (
    <form action={action} className="space-y-6">
      {initial?.id ? <input type="hidden" name="ingredientId" value={initial.id} /> : null}

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Ingrediente</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Identifique o ingrediente exatamente como você usa na produção.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Nome do ingrediente</Label>
            <Input id="name" name="name" required placeholder="Chocolate ao leite Marca X" defaultValue={initial?.name ?? ""} />
          </div>
          <div>
            <Label htmlFor="category">Categoria</Label>
            <Select id="category" name="category" required defaultValue={initial?.category ?? ""}>
              <option value="" disabled>Selecione uma categoria</option>
              {ingredientCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="baseUnit">Base do produto</Label>
            <Select
              id="baseUnit"
              name="baseUnit"
              value={baseUnit}
              onChange={(event) => setBaseUnit(event.target.value as "GRAM" | "MILLILITER")}
            >
              <option value="GRAM">g</option>
              <option value="MILLILITER">ml</option>
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">De onde você vai copiar os valores?</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Use a tabela nutricional da embalagem do ingrediente.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Radio
            name="portionMode"
            value="per100"
            label={`Coluna de 100 ${baseLabel}`}
            checked={portionMode === "per100"}
            onChange={() => setPortionMode("per100")}
          />
          <Radio
            name="portionMode"
            value="portion"
            label="Uma porção da embalagem"
            checked={portionMode === "portion"}
            onChange={() => setPortionMode("portion")}
          />
        </div>
        {portionMode === "portion" ? (
          <div className="max-w-xs">
            <Label htmlFor="portionSize">Tamanho da porção informada na embalagem</Label>
            <div className="flex items-center gap-2">
              <Input id="portionSize" name="portionSize" type="number" min="0.0001" step="any" required placeholder={baseUnit === "MILLILITER" ? "200" : "25"} />
              <span className="text-sm font-semibold text-[var(--muted)]">{baseLabel}</span>
            </div>
          </div>
        ) : (
          <input type="hidden" name="portionSize" value="100" />
        )}
        {mode === "edit" ? (
          <p className="rounded-[var(--radius-md)] border border-[#b9e8ef] bg-[#e8f7fa] px-3 py-2 text-sm text-[var(--brand-petrol)]">
            Edição mostrando valores por 100 {baseLabel}. Não é feita reconstrução da porção original.
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Informação nutricional</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Preencha somente os valores que aparecem na embalagem.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {nutrientFields.map(([label, name, placeholder]) => (
            <div key={name}>
              <Label htmlFor={name}>{label}</Label>
              <Input
                id={name}
                name={name}
                type="number"
                min="0"
                step="any"
                placeholder={placeholder}
                defaultValue={initial?.nutrients?.[name] ?? ""}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Informações da embalagem</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Copie a declaração da embalagem, sem inferências automáticas.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Contém glúten?</Label>
            <div className="flex flex-wrap gap-3">
              <Radio name="containsGluten" value="yes" label="Sim" defaultChecked={initial?.containsGluten === "yes"} />
              <Radio name="containsGluten" value="no" label="Não" defaultChecked={initial?.containsGluten === "no"} />
              <Radio name="containsGluten" value="unknown" label="Não informado" defaultChecked={!initial?.containsGluten || initial.containsGluten === "unknown"} />
            </div>
          </div>
          <div>
            <Label>Contém lactose?</Label>
            <div className="flex flex-wrap gap-3">
              <Radio name="containsLactose" value="yes" label="Sim" defaultChecked={initial?.containsLactose === "yes"} />
              <Radio name="containsLactose" value="no" label="Não" defaultChecked={initial?.containsLactose === "no"} />
              <Radio name="containsLactose" value="unknown" label="Não informado" defaultChecked={!initial?.containsLactose || initial.containsLactose === "unknown"} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="allergens">Alergênicos declarados na embalagem</Label>
            <div className="my-2 grid gap-2 sm:grid-cols-3">
              <Radio name="allergenStatus" value="UNKNOWN" label="Não determinado" defaultChecked={!initial?.allergenStatus || initial.allergenStatus === "UNKNOWN"} />
              <Radio name="allergenStatus" value="KNOWN" label="Informados na fonte" defaultChecked={initial?.allergenStatus === "KNOWN"} />
              <Radio name="allergenStatus" value="NONE" label="Ausência confirmada" defaultChecked={initial?.allergenStatus === "NONE"} />
            </div>
            <Textarea id="allergens" name="allergens" placeholder="Leite, soja e derivados de amendoim" defaultValue={initial?.allergens ?? ""} />
            <p className="mt-2 text-xs text-[var(--muted)]">Campo vazio não confirma ausência. Se informar alergênicos, selecione “Informados na fonte”. Use ausência confirmada somente com informação explícita da fonte.</p>
          </div>
        </div>
      </section>

      <div className="flex justify-end border-t border-[var(--border)] pt-5">
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}


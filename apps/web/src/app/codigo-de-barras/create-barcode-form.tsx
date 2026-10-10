"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Input, Label } from "@/components/design-system";
import { createInternalBarcodeAction, createOfficialBarcodeAction } from "@/lib/barcodes/actions";

function Submit({ internal }: { internal: boolean }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} className="w-full sm:w-auto">{pending ? "Salvando..." : internal ? "Gerar código interno" : "Validar e salvar"}</Button>;
}

export function CreateBarcodeForm({ internal, recipes, initialRecipeId }: {
  internal: boolean;
  recipes: { id: string; name: string }[];
  initialRecipeId?: string;
}) {
  const [recipeId, setRecipeId] = useState(initialRecipeId ?? "");
  const [gtin, setGtin] = useState("");
  const selectId = internal ? "internal-recipe" : "official-recipe";
  return <form action={internal ? createInternalBarcodeAction : createOfficialBarcodeAction} className="mt-5 space-y-4">
    {!internal ? <div><Label htmlFor="gtin">Código GTIN</Label><Input id="gtin" name="gtin" value={gtin} onChange={event => setGtin(event.target.value)} inputMode="numeric" autoComplete="off" required placeholder="Digite o número do GTIN" /></div> : null}
    <div><Label htmlFor={selectId}>Produto/receita (opcional)</Label>
      <select id={selectId} name="recipeId" value={recipeId} onChange={event => setRecipeId(event.target.value)} className="h-10 w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 text-sm">
        <option value="">Sem receita associada</option>{recipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}
      </select>
    </div>
    <Submit internal={internal} />
  </form>;
}

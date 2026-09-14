"use client";

import { useState } from "react";
import { Button } from "@/components/design-system";
import { deleteRecipeAction } from "@/lib/recipes/actions";

export function DeleteRecipeForm({ recipeId }: { recipeId: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return <Button type="button" variant="outline" className="h-9 w-full" onClick={() => setConfirming(true)}>Excluir</Button>;
  }

  return (
    <form action={deleteRecipeAction} className="rounded-[var(--radius-md)] border border-[#f0c4c0] bg-[var(--error-bg)] p-3 text-sm sm:col-span-3">
      <input type="hidden" name="recipeId" value={recipeId} />
      <p className="font-semibold">Excluir esta receita?</p>
      <p className="mt-1">Essa ação não pode ser desfeita. O código de barras associado será preservado, mas ficará sem receita.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={() => setConfirming(false)}>Cancelar</Button>
        <Button type="submit">Confirmar exclusão</Button>
      </div>
    </form>
  );
}

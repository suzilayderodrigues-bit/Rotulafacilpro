"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/design-system";
import { deleteCustomIngredientAction } from "@/lib/ingredients/actions";

export function DeleteCustomIngredientForm({ ingredientId }: { ingredientId: string }) {
  return (
    <form
      action={deleteCustomIngredientAction}
      onSubmit={(event) => {
        if (!window.confirm("Excluir ingrediente?\n\nEssa ação não poderá ser desfeita.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="ingredientId" value={ingredientId} />
      <Button type="submit" variant="danger" className="w-full sm:w-auto">
        <Trash2 className="size-4" />
        Excluir
      </Button>
    </form>
  );
}

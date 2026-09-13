"use client";

import { Button } from "@/components/design-system";
import { deleteBarcodeAction } from "@/lib/barcodes/actions";

export function DeleteBarcodeForm({ barcodeId }: { barcodeId: string }) {
  return (
    <form
      action={deleteBarcodeAction}
      onSubmit={(event) => {
        if (!window.confirm("Excluir este código?\n\nEsta ação remove o código cadastrado.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="barcodeId" value={barcodeId} />
      <Button type="submit" variant="ghost" className="h-9">Excluir</Button>
    </form>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, Input, Label } from "@/components/design-system";
import { addRecipeIngredientAction } from "@/lib/recipes/actions";

type Result = { id: string; name: string; category: string; source: string; baseUnit: string };

export function IngredientSelector({ recipeId, addedIds, initialPage }: { recipeId: string; addedIds: string[]; initialPage: { items: Result[]; hasMore: boolean } }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [results, setResults] = useState<Result[]>(initialPage.items);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Result | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!search.trim() && page === 0) {
      setResults(initialPage.items); setHasMore(initialPage.hasMore); setLoading(false); setError("");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/receitas/${encodeURIComponent(recipeId)}/ingredientes/busca?q=${encodeURIComponent(search)}&page=${page}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Não foi possível buscar. Entre novamente se sua sessão expirou.");
        const data = await response.json() as { items: Result[]; hasMore: boolean };
        if (!controller.signal.aborted) { setResults(data.items); setHasMore(data.hasMore); }
      } catch {
        if (!controller.signal.aborted) setError("Não foi possível buscar ingredientes. Tente novamente.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, search ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, search, page, recipeId, initialPage]);

  function close() {
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  }

  return <>
    <Button type="button" onClick={(event) => {
      trigger.current = event.currentTarget;
      setSelected(null); setResults(initialPage.items); setHasMore(initialPage.hasMore); setSearch(""); setPage(0); setLoading(false);
      setOpen(true); dialog.current?.showModal();
    }}>+ Adicionar ingrediente</Button>
    <dialog ref={dialog} aria-labelledby="ingredient-selector-title" onCancel={close} onClose={() => setOpen(false)} className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-xl border border-[var(--border)] bg-white p-4 text-[var(--foreground)] shadow-xl backdrop:bg-black/40 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="ingredient-selector-title" className="font-semibold">Adicionar ingrediente</h2>
        <Button type="button" variant="outline" onClick={close}>Fechar</Button>
      </div>
      {selected ? <form action={addRecipeIngredientAction} className="space-y-4">
        <p className="break-words font-semibold">{selected.name}</p>
        <input type="hidden" name="recipeId" value={recipeId} />
        <input type="hidden" name="ingredientId" value={selected.id} />
        <input type="hidden" name="unit" value={selected.baseUnit} />
        <Label htmlFor="selector-amount">Quantidade utilizada ({selected.baseUnit === "MILLILITER" ? "ml" : "g"})</Label>
        <Input id="selector-amount" name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required autoFocus />
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Adicionar à receita</Button>
          <Button type="button" variant="outline" onClick={() => setSelected(null)}>Trocar ingrediente</Button>
        </div>
      </form> : <>
        <Label htmlFor="ingredient-search" className="sr-only">Buscar ingrediente</Label>
        <Input id="ingredient-search" maxLength={120} value={search} placeholder="Buscar pelo início do nome..." autoFocus onChange={(event) => { setSearch(event.target.value); setPage(0); setResults(event.target.value.trim() ? [] : initialPage.items); setHasMore(false); setLoading(true); }} />
        <p className="mt-2 text-xs text-[var(--muted)]">Base Rotula e ingredientes da sua conta.</p>
        <div className="mt-3 max-h-[45dvh] overflow-y-auto" aria-live="polite" aria-busy={loading}>
          {error ? <p role="alert">{error}</p> : results.length === 0 ? <p>{loading ? "Buscando..." : "Nenhum ingrediente encontrado."}</p> : <ul className="divide-y divide-[var(--border)]">
            {results.map((item) => <li key={item.id}>
              <button type="button" disabled={loading || addedIds.includes(item.id)} onClick={() => setSelected(item)} className="w-full rounded-md px-2 py-3 text-left hover:bg-[var(--surface-muted)] focus-visible:outline-2 disabled:opacity-50">
                <span className="block break-words text-sm font-semibold">{item.name}</span>
                <span className="block text-xs text-[var(--muted)]">{item.category} · {item.source === "CUSTOM" ? "Meu ingrediente" : "Base Rotula"}{addedIds.includes(item.id) ? " · Já adicionado" : ""}</span>
              </button>
            </li>)}
          </ul>}
        </div>
        <Link href="/ingredientes?aba=meus&modal=novo" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline">Cadastrar ingrediente próprio</Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" disabled={loading || page === 0} onClick={() => { setPage(page - 1); setLoading(true); }}>Anterior</Button>
          <span className="text-sm">Página {page + 1}</span>
          <Button type="button" variant="outline" disabled={loading || !hasMore} onClick={() => { setPage(page + 1); setLoading(true); }}>Próxima</Button>
        </div>
      </>}
    </dialog>
  </>;
}

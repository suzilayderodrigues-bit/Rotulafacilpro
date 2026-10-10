"use client";

import { useRef, useState } from "react";
import { Card, Input, Label } from "@/components/design-system";
import { RecipeSubmitButton } from "@/components/layout/recipe-submit-button";
import { updateRecipeProductAction } from "@/lib/recipes/actions";

type Identity = { id: string; name: string; foodCategory: string | null; physicalState: string };

export function RecipeComposition({ recipe, children }: { recipe: Identity; children: React.ReactNode }) {
  const form = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(recipe.name);
  const [category, setCategory] = useState(recipe.foodCategory ?? "");
  const [physicalState, setPhysicalState] = useState(recipe.physicalState);
  const [notice, setNotice] = useState(false);
  const dirty = name !== recipe.name || category !== (recipe.foodCategory ?? "") || physicalState !== recipe.physicalState;

  return <div className="space-y-5" onSubmitCapture={event => {
    if (dirty && event.target !== form.current) { event.preventDefault(); setNotice(true); form.current?.scrollIntoView({ block: "center", behavior: "smooth" }); }
  }} onClickCapture={event => {
    const anchor = (event.target as HTMLElement).closest?.("a");
    if (dirty && anchor && !anchor.getAttribute("href")?.startsWith("#")) { event.preventDefault(); setNotice(true); }
  }}>
    <Card className="shadow-none">
      <form ref={form} action={updateRecipeProductAction} className="space-y-4">
        <input type="hidden" name="recipeId" value={recipe.id} />
        <input type="hidden" name="productContext" value="composition" />
        <div><Label htmlFor="recipe-name">Nome do produto</Label><Input id="recipe-name" name="name" value={name} onChange={event => setName(event.target.value)} required /></div>
        <div><Label htmlFor="recipe-category">Categoria do alimento</Label><Input id="recipe-category" name="foodCategory" value={category} onChange={event => setCategory(event.target.value)} /></div>
        <fieldset><legend className="mb-2 text-sm font-semibold">Tipo do produto</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex min-h-11 items-center gap-2 rounded-md border p-3"><input type="radio" name="physicalState" value="SOLID_OR_SEMISOLID" checked={physicalState === "SOLID_OR_SEMISOLID"} onChange={event => setPhysicalState(event.target.value)} required /> Sólido ou semissólido</label>
            <label className="flex min-h-11 items-center gap-2 rounded-md border p-3"><input type="radio" name="physicalState" value="LIQUID" checked={physicalState === "LIQUID"} onChange={event => setPhysicalState(event.target.value)} required /> Líquido</label>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">Ao trocar sólido/líquido, o rendimento e a embalagem incompatíveis serão limpos para você revisar.</p>
        </fieldset>
        {dirty ? <p role={notice ? "alert" : "status"} className="text-sm font-semibold text-[var(--brand-petrol)]">Salve os dados acima antes de adicionar ingredientes ou continuar.</p> : null}
        <RecipeSubmitButton>Salvar dados da receita</RecipeSubmitButton>
      </form>
    </Card>
    {children}
  </div>;
}

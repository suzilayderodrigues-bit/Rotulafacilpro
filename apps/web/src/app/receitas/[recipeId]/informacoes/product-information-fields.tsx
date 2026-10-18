"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/design-system";
import type { ProductInformationModel } from "@/lib/recipes/product-information";
import { ingredientComplementHref } from "@/lib/ingredients/complement";
import { ProcessReview } from "./process-review";

type Props = { model: ProductInformationModel; children?: ReactNode; format?: string; template?: string };

export function ProductInformationFields({ model, children, format, template }: Props) {
  const [reviewed, setReviewed] = useState(model.reviewed);
  const [needsReview, setNeedsReview] = useState(!model.reviewed);
  const [editAllergens, setEditAllergens] = useState(false);
  const [editGluten, setEditGluten] = useState(false);
  const [editLactose, setEditLactose] = useState(false);
  function startEditing(edit: (value: boolean) => void) { edit(true); setReviewed(false); setNeedsReview(true); }
  function disclosure(id: "gluten" | "lactose", title: string, value: ProductInformationModel["gluten"], editing: boolean, setEditing: (value: boolean) => void) {
    const field = id === "gluten" ? "glutenStatus" : "lactoseStatus";
    const short = value.value === "CONTAINS" ? `Contém ${title.toLowerCase()}` : value.value === "DOES_NOT_CONTAIN" ? `Não contém ${title.toLowerCase()}` : "Precisa de revisão";
    return <section id={id} className="space-y-2 rounded border p-3">
      <h3 className="font-semibold">{title}</h3>
      {value.sourceContains ? <p className="text-sm">Há ingrediente com presença informada na fonte.</p> : value.sourceAbsence ? <p className="text-sm">As fontes dos ingredientes informam ausência. Confira também o preparo do produto.</p> : value.sourceUnknown ? <p className="text-sm">Há ingrediente sem essa informação. Dado desconhecido não confirma ausência.</p> : null}
      {(value.verified || (value.sourceContains && value.value === "CONTAINS")) && !editing ? <>
        <p className="text-sm font-semibold">{short}{value.verified ? " · declaração salva" : " · informado pelos ingredientes"}</p>
        <input type="hidden" name={field} value={value.value} />
        <button type="button" className="min-h-11 text-sm underline" onClick={() => startEditing(setEditing)}>Revisar {title.toLowerCase()}</button>
      </> : <fieldset>
        <legend className="text-sm">Qual informação deve constar no produto?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {([["CONTAINS", `Contém ${title.toLowerCase()}`], ["DOES_NOT_CONTAIN", `Não contém ${title.toLowerCase()}`], ["NEEDS_REVIEW", "Preciso revisar"]] as const).map(([status, label]) => <label key={status} className="flex min-h-11 items-center gap-2 rounded border p-2 text-sm">
            <input type="radio" name={field} value={status} defaultChecked={value.value === status} disabled={value.sourceContains && status === "DOES_NOT_CONTAIN"} required />{label}
          </label>)}
        </div>
        {value.sourceContains ? <p className="mt-2 text-xs text-[var(--muted)]">Para corrigir uma informação da fonte, revise o ingrediente.</p> : null}
      </fieldset>}
    </section>;
  }
  return <Card className="space-y-4 shadow-none" id="informacoes-produto" onChangeCapture={event => {
    const target = event.target as HTMLInputElement;
    if (target.name !== "reviewed") { setReviewed(false); setNeedsReview(true); }
  }}>
    <input type="hidden" name="productInformation" value="on" />
    <CardHeader className="flex-col"><CardTitle>Informações e alergênicos</CardTitle><CardDescription>Usamos os dados dos ingredientes e o que você já conferiu. Complete apenas o que falta.</CardDescription></CardHeader>
    <section id="alergenicos" className="space-y-2 rounded border p-3">
      <h3 className="font-semibold">Alergênicos dos ingredientes</h3>
      {model.knownAllergens.length ? <p className="text-sm">Presença informada: <strong>{model.knownAllergens.join(", ")}</strong>.</p>
        : <p className="text-sm">{model.allSourcesDeclareNone ? "As fontes dos ingredientes informam que não há alergênicos declarados." : "Não há alergênicos conhecidos para mostrar."}</p>}
      {model.knownAllergens.map(value => <input key={value} type="hidden" name="confirmedAllergens" value={value} />)}
      {model.unknownIngredients.length ? <div className="space-y-2 text-sm">
        <p>Falta conferir alguns ingredientes. Isso não significa ausência de alergênicos; o PDF continua bloqueado.</p>
        <ul>{model.unknownIngredients.map(item => <li key={item.id}>{item.name} · <Link className="inline-flex min-h-11 items-center underline" href={ingredientComplementHref(model.recipeId, item.id, format, template)}>Conferir ingrediente</Link></li>)}</ul>
      </div> : null}
      {model.additionalAllergens.length && !editAllergens ? <p className="text-sm">Outros alergênicos já informados: {model.additionalAllergens.join(", ")}.</p> : null}
      {editAllergens ? <div><Label htmlFor="additionalAllergens">Outros alergênicos do produto</Label><Input id="additionalAllergens" name="additionalAllergens" defaultValue={model.additionalAllergens.join(", ")} placeholder="Ex.: amendoim" /></div>
        : <><input type="hidden" name="additionalAllergens" value={model.additionalAllergens.join(", ")} /><button type="button" className="min-h-11 text-sm underline" onClick={() => startEditing(setEditAllergens)}>Revisar ou acrescentar alergênicos</button></>}
    </section>
    {disclosure("gluten", "Glúten", model.gluten, editGluten, setEditGluten)}
    {disclosure("lactose", "Lactose", model.lactose, editLactose, setEditLactose)}
    <ProcessReview defaultRisk={model.processRisk} defaultAllergens={model.processAllergens} />
    {children}
    {!needsReview ? <><input type="hidden" name="reviewed" value="on" /><p className="text-sm">Conferência salva. Você pode revisar as informações acima quando precisar.</p></>
      : <label className="flex items-start gap-2 text-sm font-semibold"><input type="checkbox" name="reviewed" checked={reviewed} onChange={event => setReviewed(event.target.checked)} required className="mt-1" />Conferi as informações do produto e do preparo.</label>}
  </Card>;
}

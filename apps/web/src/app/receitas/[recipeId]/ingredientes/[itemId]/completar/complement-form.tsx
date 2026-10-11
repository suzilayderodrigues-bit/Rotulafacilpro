"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Input, Label, Select, Textarea } from "@/components/design-system";
import { RecipeSubmitButton } from "@/components/layout/recipe-submit-button";
import { resolveIngredientAllergenState } from "@rotula-facil-pro/db/allergens";
import { completeRecipeIngredientAction } from "@/lib/ingredients/complement-actions";
import { complementNutrientLabels } from "@/lib/ingredients/complement";
import { ingredientNutrientFields, type IngredientNutrientField } from "@/lib/ingredients/nutrition";
import { labelPreviewHref, type LabelFormat, type LabelTemplate } from "@/lib/final-label/visual";

export function ComplementForm({ recipeId, itemId, format, template, ingredient }: {
  recipeId: string; itemId: string; format: LabelFormat; template: LabelTemplate;
  ingredient: { id: string; name: string; baseUnit: string; nutrients: Record<IngredientNutrientField, string | null>;
    allergens: string[]; allergenStatus: string | null; containsGluten: boolean | null; containsLactose: boolean | null };
}) {
  const [state, action] = useActionState(completeRecipeIngredientAction, { error: null });
  const [values, setValues] = useState<Record<string, string>>({ sourceKind: "", sourceReference: "", allergenStatus: "UNKNOWN", allergens: "", containsGluten: "unknown", containsLactose: "unknown" });
  const [sameProduct, setSameProduct] = useState(false);
  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);
  const field = (name: string) => ({ value: values[name] ?? "", onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setValues(previous => ({ ...previous, [name]: event.target.value })) });
  const unknownAllergens = resolveIngredientAllergenState(ingredient) === "UNKNOWN";
  const missing = ingredientNutrientFields.filter(name => ingredient.nutrients[name] === null);
  const hasMissing = missing.length > 0 || unknownAllergens || ingredient.containsGluten === null || ingredient.containsLactose === null;
  const basis = ingredient.baseUnit === "MILLILITER" ? "100 ml" : "100 g";
  if (!hasMissing) return <p className="text-sm">Este ingrediente não tem informações ausentes para complementar. <Link className="underline" href={labelPreviewHref(recipeId, format, template)}>Voltar ao rótulo</Link></p>;

  return <form action={action} className="space-y-5">
    <input type="hidden" name="recipeId" value={recipeId} /><input type="hidden" name="itemId" value={itemId} />
    <input type="hidden" name="ingredientId" value={ingredient.id} /><input type="hidden" name="format" value={format} /><input type="hidden" name="template" value={template} />
    <details className="rounded border p-3"><summary className="cursor-pointer font-semibold">Informações já conhecidas · serão preservadas</summary>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">{ingredientNutrientFields.filter(name => ingredient.nutrients[name] !== null).map(name => <div key={name}><dt>{complementNutrientLabels[name]}</dt><dd>{ingredient.nutrients[name]} por {basis}</dd></div>)}
        {!unknownAllergens ? <div><dt>Alergênicos</dt><dd>{ingredient.allergens.join(", ") || "Ausência explicitamente confirmada na fonte"}</dd></div> : null}
        {ingredient.containsGluten !== null ? <div><dt>Glúten</dt><dd>{ingredient.containsGluten ? "Contém" : "Ausência informada na fonte"}</dd></div> : null}
        {ingredient.containsLactose !== null ? <div><dt>Lactose</dt><dd>{ingredient.containsLactose ? "Contém" : "Ausência informada na fonte"}</dd></div> : null}
      </dl>
    </details>
    <section className="space-y-3"><h2 className="font-semibold">O que pode completar</h2>
      <p className="text-sm">Copie os valores por {basis}. Se a fonte não informar, deixe em branco: desconhecido não é zero. Se houver apenas uma coluna por porção, use o cadastro manual de outro ingrediente; não misture as colunas.</p>
      <div className="grid gap-3 sm:grid-cols-2">{missing.map(name => <div key={name}><Label htmlFor={name}>{complementNutrientLabels[name]} por {basis}</Label><Input id={name} name={name} type="number" inputMode="decimal" min="0" max="99999999.99" step="0.01" {...field(name)} /></div>)}</div>
      {unknownAllergens ? <fieldset className="space-y-3 rounded border p-3"><legend className="px-1 font-semibold">Alergênicos desconhecidos</legend>
        <Label htmlFor="allergenStatus">O que a fonte informa?</Label><Select id="allergenStatus" name="allergenStatus" {...field("allergenStatus")}>
          <option value="UNKNOWN">Não tenho essa informação</option><option value="KNOWN">Declara quais alergênicos CONTÉM</option><option value="NONE">Confirma explicitamente ausência de alergênicos</option>
        </Select>
        {values.allergenStatus === "KNOWN" ? <><Label htmlFor="allergens">Copie todos os alergênicos declarados, separados por vírgula</Label><Textarea id="allergens" name="allergens" required {...field("allergens")} /></> : null}
        <p className="text-xs">A falta de aviso e uma lista vazia não confirmam ausência. “PODE CONTER” não é “CONTÉM”; se essa for a única informação disponível, mantenha desconhecido nesta etapa.</p>
        {values.allergenStatus !== "UNKNOWN" ? <label className="flex min-h-11 items-start gap-2 text-sm"><input type="checkbox" name="declarationConfirmed" checked={declarationConfirmed} onChange={event => setDeclarationConfirmed(event.target.checked)} required className="mt-1" /> Conferi a declaração completa da fonte. Não estou deduzindo ausência a partir de um campo vazio.</label> : null}
      </fieldset> : null}
      {([['containsGluten', 'Glúten', ingredient.containsGluten], ['containsLactose', 'Lactose', ingredient.containsLactose]] as const).filter(([, , known]) => known === null).map(([name, label]) => <div key={name}><Label htmlFor={name}>{label} · declaração da fonte</Label><Select id={name} name={name} {...field(name)}><option value="unknown">Não tenho essa informação</option><option value="yes">Contém</option><option value="no">A fonte declara que não contém</option></Select></div>)}
    </section>
    <section className="space-y-3"><h2 className="font-semibold">Fonte da complementação</h2>
      <Label htmlFor="sourceKind">Documento consultado</Label><Select id="sourceKind" name="sourceKind" required {...field("sourceKind")}><option value="">Selecione</option><option value="LABEL">Rótulo do fabricante</option><option value="TECHNICAL_SHEET">Ficha técnica do fabricante</option></Select>
      <Label htmlFor="sourceReference">Identifique a fonte e o produto</Label><Input id="sourceReference" name="sourceReference" required maxLength={500} placeholder="Marca, nome do produto e identificação/data da ficha ou rótulo" {...field("sourceReference")} />
      <label className="flex min-h-11 items-start gap-2 text-sm"><input type="checkbox" name="sameProduct" checked={sameProduct} onChange={event => setSameProduct(event.target.checked)} required className="mt-1" /> A fonte corresponde ao mesmo ingrediente/produto e não contradiz as informações conhecidas acima.</label>
    </section>
    <p className="rounded border p-3 text-sm">Será criada uma cópia privada usada somente nesta receita, com a mesma quantidade e unidade. As outras receitas e a Base Rotula não serão alteradas. Se ainda houver dados obrigatórios desconhecidos, o PDF continuará bloqueado. Ao alterar declarações, a revisão do produto precisará ser confirmada novamente.</p>
    {state.error ? <p role="alert" className="text-sm text-[var(--error)]">{state.error}</p> : null}
    <RecipeSubmitButton>Salvar complementação e voltar ao rótulo</RecipeSubmitButton>
  </form>;
}

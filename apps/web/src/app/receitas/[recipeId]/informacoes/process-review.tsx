"use client";

import { useState } from "react";
import { Card, CardTitle, Input, Label } from "@/components/design-system";

export function ProcessReview({ defaultRisk, defaultAllergens }: { defaultRisk: string | null; defaultAllergens: string[] }) {
  const [risk, setRisk] = useState(defaultRisk ?? "");
  return <details id="processo" open={!risk || risk === "UNKNOWN" || (risk === "YES" && defaultAllergens.length === 0)} className="rounded border bg-white p-3">
    <summary className="cursor-pointer text-sm font-semibold">Processo de produção · {risk === "NO" ? "avaliação salva, sem risco identificado" : risk === "YES" ? "risco identificado" : "avaliar"}</summary>
    <Card className="shadow-none">
    <CardTitle>Avaliação do processo de produção</CardTitle>
    <fieldset className="mt-3">
      <legend className="text-sm">Depois de avaliar utensílios, equipamentos e ambiente, há risco de contato com outros alergênicos?</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {([["YES", "Sim, identifiquei risco"], ["NO", "Avaliei e não identifiquei risco"], ["UNKNOWN", "Ainda preciso avaliar"]] as const).map(([value, label]) =>
          <label key={value} className="flex min-h-12 items-center gap-2 rounded border p-3 text-sm">
            <input type="radio" name="crossContaminationRisk" value={value} checked={risk === value} onChange={() => setRisk(value)} required />{label}
          </label>)}
      </div>
    </fieldset>
    {risk === "YES" ? <div className="mt-4"><Label htmlFor="crossContaminationAllergens">Quais alergênicos podem entrar em contato com o produto?</Label><Input id="crossContaminationAllergens" name="crossContaminationAllergens" defaultValue={defaultAllergens.join(", ")} required /></div>
      : <input type="hidden" name="crossContaminationAllergens" value="" />}
    <p className="mt-3 text-xs text-[var(--muted)]">Esta avaliação não confirma os alergênicos desconhecidos dos ingredientes.</p>
    </Card>
  </details>;
}

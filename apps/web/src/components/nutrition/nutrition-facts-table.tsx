import type { NutritionTableViewModel } from "@/lib/regulatory";

type NutritionFactsTableProps = {
  model: NutritionTableViewModel;
};

function DeclaredValue({ value }: { value: string | null }) {
  return value === null ? <span className="font-normal">Não informado</span> : value;
}

export function NutritionFactsTable({ model }: NutritionFactsTableProps) {
  if (model.configurationRequired) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[#f4d5b6] bg-[#fff8f0] px-4 py-3 text-sm leading-6 text-[#8a4b15]">
        {model.statusMessage}
      </div>
    );
  }

  return (
    <div>
      <p
        className={
          model.status === "COMPLETE"
            ? "mb-4 rounded-[var(--radius-md)] border border-[#b9ded5] bg-[#f1faf7] px-4 py-3 text-sm text-[#286554]"
            : "mb-4 rounded-[var(--radius-md)] border border-[#f4d5b6] bg-[#fff8f0] px-4 py-3 text-sm text-[#8a4b15]"
        }
      >
        {model.statusMessage}
      </p>

      <div className="overflow-x-auto pb-1">
        <div className="min-w-[34rem] max-w-[40rem] border-[3px] border-black bg-white font-sans text-black">
          <div className="px-3 py-2">
            <h3 className="text-xl font-black leading-tight tracking-normal">INFORMAÇÃO NUTRICIONAL</h3>
            {!model.isIndividualPackage && model.servingsPerPackageLabel ? (
              <p className="mt-2 text-[0.75rem] leading-tight">
                Porções por embalagem: {model.servingsPerPackageLabel}
              </p>
            ) : null}
            <p className="mt-1 text-[0.75rem] leading-tight">
              Porção: {model.servingLabel}
              {model.householdMeasure ? ` (${model.householdMeasure})` : ""}
            </p>
          </div>

          <table className="w-full table-fixed border-collapse text-[0.75rem] leading-tight">
            <caption className="sr-only">Tabela de informação nutricional</caption>
            <colgroup>
              <col className="w-[43%]" />
              <col className="w-[19%]" />
              <col className="w-[19%]" />
              <col className="w-[19%]" />
            </colgroup>
            <thead className="border-y-[5px] border-black">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold" scope="col">Nutriente</th>
                <th className="px-2 py-1.5 text-right font-bold" scope="col">{model.basisLabel}</th>
                <th className="px-2 py-1.5 text-right font-bold" scope="col">{model.servingLabel}</th>
                <th className="px-2 py-1.5 text-right font-bold" scope="col">%VD*</th>
              </tr>
            </thead>
            <tbody>
              {model.rows.map((row) => (
                <tr key={row.nutrient} className="border-b border-black last:border-b-0">
                  <th
                    className={`px-2 py-1.5 text-left font-bold ${row.indented ? "pl-5" : ""}`}
                    scope="row"
                  >
                    {row.label} ({row.unit})
                  </th>
                  <td className="px-2 py-1.5 text-right font-bold">
                    <DeclaredValue value={row.per100Value} />
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold">
                    <DeclaredValue value={row.perServingValue} />
                  </td>
                  <td
                    aria-label={row.hasEstablishedDailyValue ? undefined : "Não se aplica"}
                    className="px-2 py-1.5 text-right font-bold"
                  >
                    {row.hasEstablishedDailyValue ? (
                      row.dailyValuePercent === null ? (
                        <span className="font-normal">Não informado</span>
                      ) : (
                        `${row.dailyValuePercent}%`
                      )
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="border-t-[5px] border-black px-2 py-2 text-[0.6875rem] leading-tight">
            {model.dailyValueFootnote}
          </p>
        </div>
      </div>
    </div>
  );
}

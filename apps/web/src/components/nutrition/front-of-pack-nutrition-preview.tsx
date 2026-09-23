import { Search } from "lucide-react";
import type { FinalFrontOfPackDecision } from "@/lib/regulatory";

type FrontOfPackNutritionPreviewProps = {
  decision: FinalFrontOfPackDecision;
};

export function FrontOfPackNutritionPreview({
  decision
}: FrontOfPackNutritionPreviewProps) {
  const { applicability } = decision;

  return (
    <div className="space-y-4">
      <p
        className={
          applicability.status === "APPLICABLE"
            ? "rounded-[var(--radius-md)] border border-[#b9ded5] bg-[#f1faf7] px-4 py-3 text-sm leading-6 text-[#286554]"
            : applicability.status === "NOT_APPLICABLE"
              ? "rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]"
              : "rounded-[var(--radius-md)] border border-[#f4d5b6] bg-[#fff8f0] px-4 py-3 text-sm leading-6 text-[#8a4b15]"
        }
      >
        {applicability.reason}
      </p>

      {decision.shouldDisplayOfficialWarning ? (
        <div className="inline-grid max-w-full overflow-hidden rounded-md border-[3px] border-black bg-white p-[3px] text-black">
          <div className="flex items-center gap-1.5 border-b-[3px] border-black px-2 py-1.5">
            <Search aria-hidden="true" className="size-9 shrink-0 stroke-[3] sm:size-10" />
            <span className="text-lg font-black leading-none sm:text-xl">ALTO EM</span>
          </div>
          <div className="grid min-w-0 gap-[3px] pt-[3px]">
            {decision.finalHighIn.map((nutrient) => (
              <div key={nutrient.nutrient} className="rounded-[3px] bg-black px-3 py-2 text-center text-white sm:px-4">
                <strong className="block break-words text-sm font-black leading-tight sm:text-base">
                  {nutrient.label}
                </strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {decision.status === "NO_WARNING" && !decision.hasUnknownData ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
          Este produto não atinge os limites para rotulagem nutricional frontal.
        </p>
      ) : null}

      {applicability.status !== "APPLICABLE" && decision.technicalHighIn.length > 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
          <p className="font-semibold">Limites técnicos atingidos</p>
          <ul className="mt-1 list-inside list-disc text-[var(--muted)]">
            {decision.technicalHighIn.map((nutrient) => (
              <li key={nutrient.nutrient}>{nutrient.label}</li>
            ))}
          </ul>
          <p className="mt-2 text-[var(--muted)]">
            {applicability.status === "REQUIRES_REVIEW"
              ? "Este resultado não representa uma decisão regulatória final enquanto o enquadramento não estiver confirmado."
              : "A avaliação matemática permanece disponível, mas a lupa não é exibida como decisão final nesta condição."}
          </p>
        </div>
      ) : null}

      {decision.hasUnknownData ? (
        <p className="rounded-[var(--radius-md)] border border-[#f4d5b6] bg-[#fff8f0] px-4 py-3 text-sm leading-6 text-[#8a4b15]">
          Alguns dados necessários para avaliar a rotulagem frontal não estão disponíveis.
        </p>
      ) : null}
    </div>
  );
}

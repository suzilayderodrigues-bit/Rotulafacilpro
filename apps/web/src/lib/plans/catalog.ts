import type { CommercialPlan } from "@rotula-facil-pro/db";

export type PlanBillingPeriod = "FREE" | "MONTHLY" | "ANNUAL";

export type PlanCatalogEntry = {
  code: CommercialPlan;
  label: string;
  priceInCents: number;
  billingPeriod: PlanBillingPeriod;
  priceLabel: string;
  benefits: readonly string[];
};

export const planCatalog = {
  FREE: {
    code: "FREE",
    label: "Grátis",
    priceInCents: 0,
    billingPeriod: "FREE",
    priceLabel: "R$ 0",
    benefits: ["1 tabela nutricional", "Até 5 ingredientes"]
  },
  MONTHLY: {
    code: "MONTHLY",
    label: "Mensal",
    priceInCents: 2_990,
    billingPeriod: "MONTHLY",
    priceLabel: "R$ 29,90/mês",
    benefits: ["Tabelas e ingredientes ilimitados", "10 códigos de barras por ciclo mensal"]
  },
  ANNUAL: {
    code: "ANNUAL",
    label: "Anual",
    priceInCents: 29_700,
    billingPeriod: "ANNUAL",
    priceLabel: "R$ 297/ano",
    benefits: ["Tabelas, ingredientes e códigos ilimitados", "Etiquetas incluídas"]
  }
} as const satisfies Record<CommercialPlan, PlanCatalogEntry>;

export const orderedPlans: readonly PlanCatalogEntry[] = [
  planCatalog.FREE,
  planCatalog.MONTHLY,
  planCatalog.ANNUAL
];

export function getPlanCatalogEntry(plan: CommercialPlan) {
  return planCatalog[plan];
}

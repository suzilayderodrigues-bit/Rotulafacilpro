import { Check } from "lucide-react";
import { Badge, Card, CardDescription, CardHeader, CardTitle } from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { orderedPlans } from "@/lib/plans/catalog";
import { getCurrentPlan } from "@/lib/plans/current";
import { cn } from "@/lib/utils";

export default async function PlansPage() {
  const user = await requireUser();
  const current = await getCurrentPlan(user.id);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-5 py-6 lg:px-8 lg:py-8">
            <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <Badge variant="secondary">Planos</Badge>
              <h1 className="mt-4 text-2xl font-semibold tracking-normal sm:text-3xl">Escolha o plano ideal para o seu negócio</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                Conheça as opções do Rotula Fácil Pro. As assinaturas pagas estarão disponíveis em breve.
              </p>
            </section>

            <section className="grid gap-5 lg:grid-cols-3" aria-label="Planos disponíveis">
              {orderedPlans.map((plan) => {
                const isCurrent = current.plan === plan.code;
                return (
                  <Card key={plan.code} className={cn("flex min-h-full flex-col shadow-none", isCurrent && "border-[var(--brand-tiffany)] ring-1 ring-[var(--brand-tiffany)]")}>
                    <CardHeader className="flex-col">
                      <div className="flex w-full items-center justify-between gap-3">
                        <CardTitle>{plan.label}</CardTitle>
                        {isCurrent ? <Badge variant="secondary">Plano atual</Badge> : null}
                      </div>
                      <CardDescription>{plan.code === "FREE" ? "Para começar" : "Para ampliar sua produção"}</CardDescription>
                    </CardHeader>
                    <p className="text-2xl font-semibold text-[var(--brand-petrol)]">{plan.priceLabel}</p>
                    <ul className="mt-5 flex-1 space-y-3 text-sm text-[var(--foreground)]">
                      {plan.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2">
                          <Check className="mt-0.5 size-4 shrink-0 text-[var(--brand-tiffany)]" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-center text-sm font-semibold text-[var(--muted)]">
                      {plan.code === "FREE" ? (isCurrent ? "Seu plano atual" : "Disponível") : "Assinatura em breve"}
                    </div>
                  </Card>
                );
              })}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

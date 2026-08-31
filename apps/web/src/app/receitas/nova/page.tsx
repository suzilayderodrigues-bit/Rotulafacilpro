import Link from "next/link";
import { ArrowLeft, Check, Circle, Plus } from "lucide-react";
import { Badge, Button, Card, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { createRecipeProductAction } from "@/lib/recipes/actions";
import { cn } from "@/lib/utils";

type NewRecipePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const steps = ["Produto", "Ingredientes", "Rendimento", "Informações"];

const errorMessages: Record<string, string> = {
  nome: "Informe o nome do produto.",
  tipo: "Selecione se o produto é sólido/semissólido ou líquido.",
  formulario: "Não foi possível criar a receita. Revise os dados e tente novamente."
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function Stepper() {
  return (
    <ol className="grid gap-2 sm:grid-cols-4" aria-label="Etapas da receita">
      {steps.map((step, index) => {
        const isActive = index === 0;
        const Icon = isActive ? Check : Circle;

        return (
          <li
            key={step}
            className={cn(
              "rounded-[var(--radius-md)] border bg-white px-3 py-3 text-sm",
              isActive ? "border-[#b9e8ef] bg-[#e8f7fa] text-[var(--brand-petrol)]" : "border-[var(--border)] text-[var(--muted)]"
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  isActive ? "border-[var(--brand-tiffany)] bg-white text-[var(--brand-petrol)]" : "border-[var(--border)] bg-[var(--surface-muted)]"
                )}
              >
                {isActive ? <Icon className="size-3.5" /> : index + 1}
              </span>
              <span className="font-semibold">{step}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default async function NewRecipePage({ searchParams }: NewRecipePageProps) {
  await requireUser();
  const params = searchParams ? await searchParams : {};
  const error = firstParam(params.erro);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar activeItem="Receitas" />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-5xl px-5 py-6 lg:px-8 lg:py-8">
            <div className="mb-5">
              <Link
                href="/receitas"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-petrol)] hover:text-[var(--accent-orange)]"
              >
                <ArrowLeft className="size-4" />
                Voltar para receitas
              </Link>
            </div>

            <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <Badge variant="secondary" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-[var(--accent-orange)]" />
                Nova receita
              </Badge>
              <h1 className="mt-4 text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">
                Nova receita
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                Vamos começar pelas informações básicas do seu produto.
              </p>
            </section>

            <div className="mb-6">
              <Stepper />
            </div>

            <Card className="shadow-none">
              <CardHeader className="flex-col">
                <div>
                  <CardTitle>Sobre o produto</CardTitle>
                  <CardDescription>Preencha apenas os dados básicos. O rendimento será informado em uma próxima etapa.</CardDescription>
                </div>
              </CardHeader>

              {error ? (
                <div className="mb-5 rounded-[var(--radius-md)] border border-[#f0c4c0] bg-[var(--error-bg)] px-4 py-3 text-sm font-medium text-[var(--error)]">
                  {errorMessages[error] ?? errorMessages.formulario}
                </div>
              ) : null}

              <form action={createRecipeProductAction} className="space-y-5">
                <div>
                  <Label htmlFor="name">Nome do produto</Label>
                  <Input id="name" name="name" placeholder="Ex.: Brownie tradicional" required />
                </div>

                <div>
                  <Label htmlFor="foodCategory">Categoria do alimento</Label>
                  <Input id="foodCategory" name="foodCategory" placeholder="Ex.: Brownies, geleias, molhos..." />
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-[var(--foreground)]">Tipo do produto</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[#b9e8ef] hover:bg-[var(--surface-muted)]">
                      <input
                        type="radio"
                        name="physicalState"
                        value="SOLID_OR_SEMISOLID"
                        required
                        className="size-4 accent-[var(--brand-tiffany)]"
                      />
                      Sólido ou semissólido
                    </label>
                    <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[#b9e8ef] hover:bg-[var(--surface-muted)]">
                      <input
                        type="radio"
                        name="physicalState"
                        value="LIQUID"
                        required
                        className="size-4 accent-[var(--brand-tiffany)]"
                      />
                      Líquido
                    </label>
                  </div>
                </fieldset>

                <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-end">
                  <Link
                    href="/receitas"
                    className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--brand-petrol)] transition hover:bg-[var(--surface-muted)]"
                  >
                    Cancelar
                  </Link>
                  <Button type="submit" className="sm:min-w-36">
                    <Plus className="size-4" />
                    Continuar
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

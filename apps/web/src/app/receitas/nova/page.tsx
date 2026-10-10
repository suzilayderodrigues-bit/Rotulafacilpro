import { RecipeSteps } from "@/components/layout/recipe-steps";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge, Card, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { createRecipeProductAction } from "@/lib/recipes/actions";
import { RecipeSubmitButton } from "@/components/layout/recipe-submit-button";


type NewRecipePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};



const errorMessages: Record<string, string> = {
  nome: "Informe o nome do produto.",
  tipo: "Selecione se o produto é sólido/semissólido ou líquido.",
  formulario: "Não foi possível criar a receita. Revise os dados e tente novamente."
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
                Minha receita
              </Badge>
              <h1 className="mt-4 text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">
                Nova receita
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                Dê um nome à receita para começar. Na mesma etapa, você poderá editar o nome e adicionar os ingredientes e quantidades.
              </p>
            </section>

            <div className="mb-6">
              <RecipeSteps current={1} detail="Nome e ingredientes" />
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
                  <RecipeSubmitButton>Salvar e adicionar ingredientes</RecipeSubmitButton>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

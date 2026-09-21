import Link from "next/link";
import { Badge, EmptyState } from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { listRecipes } from "@/lib/recipes/repository";
import { ProductionLabelForm } from "./production-label-form";

export default async function ProductionLabelsPage() {
  const user = await requireUser();
  const recipes = await listRecipes(user.id);
  const options = recipes.map((recipe) => ({ id: recipe.id, name: recipe.name }));

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar activeItem="Etiquetas" />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl space-y-5 px-5 py-6 lg:px-8 lg:py-8">
            <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <Badge variant="secondary">Produção</Badge>
              <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">Etiquetas</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)] sm:text-base">Crie etiquetas de lote, fabricação e validade para seus produtos.</p>
            </section>

            {options.length === 0 ? (
              <EmptyState
                title="Crie uma receita antes de montar etiquetas."
                description="O nome do produto vem de uma receita da sua conta."
                action={<Link href="/receitas/nova" className="inline-flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--brand-tiffany)] px-4 font-semibold text-[var(--brand-navy)]">Criar receita</Link>}
              />
            ) : <ProductionLabelForm recipes={options} />}
          </div>
        </div>
      </div>
    </main>
  );
}

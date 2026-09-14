import Link from "next/link";
import { Badge, Button, Card, Input, Label } from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { updateRecipeProductAction } from "@/lib/recipes/actions";
import { findRecipe } from "@/lib/recipes/repository";

export default async function EditRecipePage({ params, searchParams }: {
  params: Promise<{ recipeId: string }>;
  searchParams?: Promise<{ erro?: string }>;
}) {
  const user = await requireUser();
  const { recipeId } = await params;
  const recipe = await findRecipe(user.id, recipeId);
  const query = searchParams ? await searchParams : {};

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar activeItem="Receitas" />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-5xl px-5 py-6 lg:px-8">
            {!recipe ? (
              <Card>Receita não encontrada nesta conta. <Link href="/receitas" className="underline">Voltar às receitas</Link></Card>
            ) : (
              <>
                <Link href={`/receitas/${recipe.id}`} className="text-sm font-semibold text-[var(--brand-petrol)]">Voltar ao resumo</Link>
                <section className="my-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5">
                  <Badge variant="secondary">Etapa 1 de 4</Badge>
                  <h1 className="mt-4 text-2xl font-semibold">Editar receita</h1>
                  <p className="mt-2 text-sm text-[var(--muted)]">Os dados existentes estão carregados. Continue pelas etapas para revisar ingredientes, rendimento e informações.</p>
                </section>
                <Card>
                  {query.erro ? <p role="alert" className="mb-4 text-sm text-[var(--error)]">Revise o nome e o tipo do produto antes de continuar.</p> : null}
                  <form action={updateRecipeProductAction} className="space-y-5">
                    <input type="hidden" name="recipeId" value={recipe.id} />
                    <div><Label htmlFor="name">Nome do produto</Label><Input id="name" name="name" defaultValue={recipe.name} required /></div>
                    <div><Label htmlFor="foodCategory">Categoria do alimento</Label><Input id="foodCategory" name="foodCategory" defaultValue={recipe.foodCategory ?? ""} /></div>
                    <fieldset>
                      <legend className="mb-2 text-sm font-semibold">Tipo do produto</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex min-h-12 items-center gap-2 rounded-[var(--radius-md)] border p-3"><input type="radio" name="physicalState" value="SOLID_OR_SEMISOLID" defaultChecked={recipe.physicalState === "SOLID_OR_SEMISOLID"} required /> Sólido ou semissólido</label>
                        <label className="flex min-h-12 items-center gap-2 rounded-[var(--radius-md)] border p-3"><input type="radio" name="physicalState" value="LIQUID" defaultChecked={recipe.physicalState === "LIQUID"} required /> Líquido</label>
                      </div>
                      <p className="mt-2 text-xs text-[var(--muted)]">Ao mudar o tipo, revise rendimento e embalagem: esses valores serão redefinidos para evitar unidades incompatíveis.</p>
                    </fieldset>
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end"><Button type="submit">Salvar e continuar</Button></div>
                  </form>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

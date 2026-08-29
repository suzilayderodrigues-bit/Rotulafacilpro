import Link from "next/link";
import { Filter, Leaf, Search, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
  Select
} from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ingredientCategories } from "@/lib/ingredients/categories";
import { findBaseRotulaIngredient, listBaseRotulaIngredients } from "@/lib/ingredients/repository";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

type IngredientSearchParams = {
  busca?: string | string[];
  categoria?: string | string[];
  ingrediente?: string | string[];
};

type IngredientsPageProps = {
  searchParams?: Promise<IngredientSearchParams>;
};

const nutrientLabels = [
  ["Valor energético", "caloriesKcal", "kcal"],
  ["Carboidratos", "carbohydratesG", "g"],
  ["Açúcares totais", "sugarsG", "g"],
  ["Açúcares adicionados", "addedSugarsG", "g"],
  ["Proteínas", "proteinsG", "g"],
  ["Gorduras totais", "totalFatG", "g"],
  ["Gorduras saturadas", "saturatedFatG", "g"],
  ["Gorduras trans", "transFatG", "g"],
  ["Fibra alimentar", "fiberG", "g"],
  ["Sódio", "sodiumMg", "mg"],
  ["Cálcio", "calciumMg", "mg"],
  ["Ferro", "ironMg", "mg"]
] as const;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanParam(value: string | string[] | undefined) {
  const parsed = firstParam(value)?.trim();
  return parsed ? parsed : undefined;
}

function formatDecimal(value: unknown, unit?: string) {
  if (value === null || value === undefined) {
    return "Não informado";
  }

  const formatted = Number(value).toLocaleString("pt-BR", {
    maximumFractionDigits: 2
  });

  return unit ? `${formatted} ${unit}` : formatted;
}

function referenceLabel(baseQuantity: unknown, baseUnit: string) {
  const unit = baseUnit === "MILLILITER" ? "ml" : "g";
  return `${formatDecimal(baseQuantity)} ${unit}`;
}

function sourceLabel(dataOrigin: string) {
  return dataOrigin.replace(/^FABRICANTE - /, "");
}

function buildIngredientHref(id: string, search?: string, category?: string) {
  const params = new URLSearchParams();

  if (search) params.set("busca", search);
  if (category) params.set("categoria", category);
  params.set("ingrediente", id);

  return `/ingredientes?${params.toString()}`;
}

function buildCloseHref(search?: string, category?: string) {
  const params = new URLSearchParams();

  if (search) params.set("busca", search);
  if (category) params.set("categoria", category);

  const query = params.toString();
  return query ? `/ingredientes?${query}` : "/ingredientes";
}

export default async function IngredientsPage({ searchParams }: IngredientsPageProps) {
  await requireUser();

  const params = await searchParams;
  const search = cleanParam(params?.busca);
  const category = cleanParam(params?.categoria);
  const selectedIngredientId = cleanParam(params?.ingrediente);
  const safeCategory = ingredientCategories.includes(category as (typeof ingredientCategories)[number])
    ? category
    : undefined;

  const [ingredients, selectedIngredient] = await Promise.all([
    listBaseRotulaIngredients({ search, category: safeCategory }),
    selectedIngredientId ? findBaseRotulaIngredient(selectedIngredientId) : Promise.resolve(null)
  ]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar activeItem="Ingredientes" />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl px-5 py-6 lg:px-8 lg:py-8">
            <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <Badge variant="secondary" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-[var(--accent-orange)]" />
                Base Rotula
              </Badge>
              <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">
                    Ingredientes
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                    Encontre ingredientes da Base Rotula ou cadastre os seus próprios ingredientes.
                  </p>
                </div>
              </div>
            </section>

            <div className="mb-5 flex gap-2 overflow-x-auto" aria-label="Tipos de ingrediente">
              <Link
                href="/ingredientes"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[#b9e8ef] bg-[#e8f7fa] px-4 text-sm font-semibold text-[var(--brand-petrol)]"
              >
                Base Rotula
              </Link>
              <button
                type="button"
                disabled
                className="inline-flex h-10 shrink-0 cursor-not-allowed items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--muted)] opacity-70"
              >
                Meus ingredientes
              </button>
            </div>

            <Card className="shadow-none">
              <CardHeader className="flex-col gap-3 lg:flex-row lg:items-end">
                <div>
                  <CardTitle>Base Rotula</CardTitle>
                  <CardDescription>Ingredientes oficiais disponíveis para consulta.</CardDescription>
                </div>
                <form className="grid w-full gap-3 md:grid-cols-[1fr_240px_auto] lg:max-w-3xl" action="/ingredientes">
                  <div>
                    <Label htmlFor="busca" className="sr-only">Buscar ingrediente</Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                      <Input
                        id="busca"
                        name="busca"
                        defaultValue={search ?? ""}
                        placeholder="Buscar por nome"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="categoria" className="sr-only">Categoria</Label>
                    <div className="relative">
                      <Filter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                      <Select
                        id="categoria"
                        name="categoria"
                        defaultValue={safeCategory ?? ""}
                        className="pl-9"
                      >
                        <option value="">Todas as categorias</option>
                        {ingredientCategories.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full md:w-auto">Filtrar</Button>
                </form>
              </CardHeader>

              <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                <span>{ingredients.length} ingrediente{ingredients.length === 1 ? "" : "s"} encontrado{ingredients.length === 1 ? "" : "s"}</span>
                {search ? <Badge variant="secondary">Busca: {search}</Badge> : null}
                {safeCategory ? <Badge variant="secondary">Categoria: {safeCategory}</Badge> : null}
              </div>

              {ingredients.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {ingredients.map((ingredient) => (
                    <Link
                      key={ingredient.id}
                      href={buildIngredientHref(ingredient.id, search, safeCategory)}
                      className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-4 transition hover:border-[#b9e8ef] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tiffany)]"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[#e8f7fa] text-[var(--brand-petrol)] ring-1 ring-[rgba(245,158,11,0.2)]">
                          <Leaf className="size-5" />
                        </div>
                        <Badge variant="secondary" className="max-w-[70%] truncate">{ingredient.category}</Badge>
                      </div>
                      <h2 className="text-base font-semibold text-[var(--foreground)]">{ingredient.name}</h2>
                      <dl className="mt-4 space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-[var(--muted)]">Referência</dt>
                          <dd className="font-semibold text-[var(--brand-petrol)]">
                            por {referenceLabel(ingredient.baseQuantity, ingredient.baseUnit)}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-[var(--muted)]">Fonte</dt>
                          <dd className="truncate text-right font-medium text-[var(--foreground)]">
                            {sourceLabel(ingredient.dataOrigin)}
                          </dd>
                        </div>
                      </dl>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Nenhum ingrediente encontrado."
                  description="Tente ajustar a busca ou selecionar outra categoria da Base Rotula."
                  action={
                    <Link href="/ingredientes" className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--brand-petrol)] hover:bg-[var(--surface-muted)]">
                      Limpar filtros
                    </Link>
                  }
                />
              )}
            </Card>
          </div>
        </div>
      </div>

      {selectedIngredient ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#071722]/55 px-4 py-6 backdrop-blur-sm sm:py-10">
          <div className="mx-auto max-w-2xl rounded-[var(--radius-lg)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Badge variant="secondary">{selectedIngredient.category}</Badge>
                <h2 className="mt-3 text-xl font-semibold text-[var(--foreground)]">
                  {selectedIngredient.name}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Referência: {referenceLabel(selectedIngredient.baseQuantity, selectedIngredient.baseUnit)}
                </p>
              </div>
              <Link
                href={buildCloseHref(search, safeCategory)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-white text-[var(--brand-petrol)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tiffany)]"
                aria-label="Fechar detalhes"
              >
                <X className="size-4" />
              </Link>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {nutrientLabels.map(([label, key, unit]) => (
                <div key={key} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-[var(--muted)]">{label}</p>
                  <p className={cn("mt-1 text-sm font-semibold", selectedIngredient[key] === null ? "text-[var(--muted)]" : "text-[var(--foreground)]")}>
                    {formatDecimal(selectedIngredient[key], unit)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Rastreabilidade</h3>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
                  <dt className="text-[var(--muted)]">Fonte</dt>
                  <dd className="font-medium text-[var(--foreground)]">{selectedIngredient.dataOrigin}</dd>
                </div>
                <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
                  <dt className="text-[var(--muted)]">Código da fonte</dt>
                  <dd className="font-medium text-[var(--foreground)]">{selectedIngredient.sourceCode ?? "Não informado"}</dd>
                </div>
                <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
                  <dt className="text-[var(--muted)]">Versão</dt>
                  <dd className="font-medium text-[var(--foreground)]">{selectedIngredient.sourceVersion ?? "Não informado"}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}



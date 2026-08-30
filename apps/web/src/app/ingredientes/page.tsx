import Link from "next/link";
import { Edit3, Filter, Leaf, Plus, Search, Trash2, X } from "lucide-react";
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
  Select,
  Toast
} from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { ingredientCategories } from "@/lib/ingredients/categories";
import {
  findBaseRotulaIngredient,
  findCustomIngredient,
  listBaseRotulaIngredients,
  listCustomIngredients
} from "@/lib/ingredients/repository";
import { cn } from "@/lib/utils";
import { CustomIngredientForm, type CustomIngredientFormInitial } from "./_components/custom-ingredient-form";
import { DeleteCustomIngredientForm } from "./_components/delete-custom-ingredient-form";

type IngredientSearchParams = {
  aba?: string | string[];
  busca?: string | string[];
  categoria?: string | string[];
  ingrediente?: string | string[];
  modal?: string | string[];
  status?: string | string[];
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

type IngredientCardItem = Awaited<ReturnType<typeof listBaseRotulaIngredients>>[number];

const statusMessages: Record<string, string> = {
  created: "Ingrediente cadastrado com sucesso.",
  updated: "Ingrediente atualizado com sucesso.",
  deleted: "Ingrediente excluído com sucesso.",
  invalid: "Revise os dados do ingrediente e tente novamente.",
  denied: "Não foi possível realizar essa ação para este ingrediente.",
  "in-use": "Este ingrediente está sendo usado em uma receita e não pode ser excluído."
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanParam(value: string | string[] | undefined) {
  const parsed = firstParam(value)?.trim();
  return parsed ? parsed : undefined;
}

function activeTabParam(value?: string) {
  return value === "meus" ? "meus" : "base";
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

function decimalValue(value: unknown) {
  if (value === null || value === undefined) return null;
  return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 4, useGrouping: false });
}

function referenceLabel(baseQuantity: unknown, baseUnit: string) {
  const unit = baseUnit === "MILLILITER" ? "ml" : "g";
  return `${formatDecimal(baseQuantity)} ${unit}`;
}

function sourceLabel(dataOrigin: string) {
  return dataOrigin.replace(/^FABRICANTE - /, "");
}

function boolLabel(value: boolean | null) {
  if (value === true) return "Sim";
  if (value === false) return "Não";
  return "Não informado";
}

function boolInitial(value: boolean | null | undefined) {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "unknown";
}

function buildIngredientsHref({
  tab,
  search,
  category,
  modal,
  ingredientId,
  status
}: {
  tab?: "base" | "meus";
  search?: string;
  category?: string;
  modal?: string;
  ingredientId?: string;
  status?: string;
}) {
  const params = new URLSearchParams();

  if (tab === "meus") params.set("aba", "meus");
  if (search) params.set("busca", search);
  if (category) params.set("categoria", category);
  if (modal) params.set("modal", modal);
  if (ingredientId) params.set("ingrediente", ingredientId);
  if (status) params.set("status", status);

  const query = params.toString();
  return query ? `/ingredientes?${query}` : "/ingredientes";
}

function formInitial(ingredient: IngredientCardItem): CustomIngredientFormInitial {
  const nutrients = nutrientLabels.reduce<Record<string, string | null>>((acc, [, key]) => {
    acc[key] = decimalValue(ingredient[key]);
    return acc;
  }, {});

  return {
    id: ingredient.id,
    name: ingredient.name,
    category: ingredient.category,
    baseUnit: ingredient.baseUnit,
    nutrients,
    containsGluten: boolInitial(ingredient.containsGluten),
    containsLactose: boolInitial(ingredient.containsLactose),
    allergens: ingredient.allergens.join(", ")
  };
}

function IngredientCard({
  ingredient,
  tab,
  search,
  category
}: {
  ingredient: IngredientCardItem;
  tab: "base" | "meus";
  search?: string;
  category?: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-4 transition hover:border-[#b9e8ef] hover:bg-[var(--surface-muted)]">
      <Link
        href={buildIngredientsHref({ tab, search, category, modal: "detalhes", ingredientId: ingredient.id })}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tiffany)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[#e8f7fa] text-[var(--brand-petrol)] ring-1 ring-[rgba(245,158,11,0.2)]">
            <Leaf className="size-5" />
          </div>
          <Badge variant={tab === "meus" ? "cyan" : "secondary"} className="max-w-[70%] truncate">
            {tab === "meus" ? "Meu ingrediente" : ingredient.category}
          </Badge>
        </div>
        <h2 className="text-base font-semibold text-[var(--foreground)]">{ingredient.name}</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--muted)]">Categoria</dt>
            <dd className="truncate text-right font-medium text-[var(--foreground)]">{ingredient.category}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--muted)]">Referência</dt>
            <dd className="font-semibold text-[var(--brand-petrol)]">por {referenceLabel(ingredient.baseQuantity, ingredient.baseUnit)}</dd>
          </div>
          {tab === "base" ? (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--muted)]">Fonte</dt>
              <dd className="truncate text-right font-medium text-[var(--foreground)]">{sourceLabel(ingredient.dataOrigin)}</dd>
            </div>
          ) : null}
        </dl>
      </Link>

      {tab === "meus" ? (
        <div className="mt-4 grid gap-2 border-t border-[var(--border)] pt-4 sm:grid-cols-3">
          <Link href={buildIngredientsHref({ tab, search, category, modal: "detalhes", ingredientId: ingredient.id })} className="inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--brand-petrol)] hover:bg-[var(--surface-muted)]">
            Ver detalhes
          </Link>
          <Link href={buildIngredientsHref({ tab, search, category, modal: "editar", ingredientId: ingredient.id })} className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--brand-petrol)] hover:bg-[var(--surface-muted)]">
            <Edit3 className="size-4" />
            Editar
          </Link>
          <Link href={buildIngredientsHref({ tab, search, category, modal: "excluir", ingredientId: ingredient.id })} className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[#f0c4c0] bg-[var(--error-bg)] px-3 text-sm font-semibold text-[var(--error)] hover:bg-[#fde5e2]">
            <Trash2 className="size-4" />
            Excluir
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function IngredientDetail({ ingredient }: { ingredient: IngredientCardItem }) {
  return (
    <>
      <div className="mb-5">
        <Badge variant={ingredient.source === "CUSTOM" ? "cyan" : "secondary"}>{ingredient.category}</Badge>
        <h2 className="mt-3 text-xl font-semibold text-[var(--foreground)]">{ingredient.name}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Referência: {referenceLabel(ingredient.baseQuantity, ingredient.baseUnit)}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {nutrientLabels.map(([label, key, unit]) => (
          <div key={key} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
            <p className="text-xs font-semibold uppercase text-[var(--muted)]">{label}</p>
            <p className={cn("mt-1 text-sm font-semibold", ingredient[key] === null ? "text-[var(--muted)]" : "text-[var(--foreground)]")}>{formatDecimal(ingredient[key], unit)}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-4">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Informações da embalagem</h3>
        <dl className="mt-3 space-y-3 text-sm">
          <div className="grid gap-1 sm:grid-cols-[150px_1fr]"><dt className="text-[var(--muted)]">Contém glúten</dt><dd className="font-medium text-[var(--foreground)]">{boolLabel(ingredient.containsGluten)}</dd></div>
          <div className="grid gap-1 sm:grid-cols-[150px_1fr]"><dt className="text-[var(--muted)]">Contém lactose</dt><dd className="font-medium text-[var(--foreground)]">{boolLabel(ingredient.containsLactose)}</dd></div>
          <div className="grid gap-1 sm:grid-cols-[150px_1fr]"><dt className="text-[var(--muted)]">Alergênicos</dt><dd className="font-medium text-[var(--foreground)]">{ingredient.allergens.length > 0 ? ingredient.allergens.join(", ") : "Não informado"}</dd></div>
        </dl>
      </div>

      <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-4">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Rastreabilidade</h3>
        <dl className="mt-3 space-y-3 text-sm">
          <div className="grid gap-1 sm:grid-cols-[140px_1fr]"><dt className="text-[var(--muted)]">Origem</dt><dd className="font-medium text-[var(--foreground)]">{ingredient.dataOrigin}</dd></div>
          <div className="grid gap-1 sm:grid-cols-[140px_1fr]"><dt className="text-[var(--muted)]">Código da fonte</dt><dd className="font-medium text-[var(--foreground)]">{ingredient.sourceCode ?? "Não informado"}</dd></div>
          <div className="grid gap-1 sm:grid-cols-[140px_1fr]"><dt className="text-[var(--muted)]">Versão</dt><dd className="font-medium text-[var(--foreground)]">{ingredient.sourceVersion ?? "Não informado"}</dd></div>
        </dl>
      </div>
    </>
  );
}

export default async function IngredientsPage({ searchParams }: IngredientsPageProps) {
  const user = await requireUser();

  const params = await searchParams;
  const tab = activeTabParam(cleanParam(params?.aba));
  const search = cleanParam(params?.busca);
  const category = cleanParam(params?.categoria);
  const modal = cleanParam(params?.modal);
  const selectedIngredientId = cleanParam(params?.ingrediente);
  const status = cleanParam(params?.status);
  const safeCategory = ingredientCategories.includes(category as (typeof ingredientCategories)[number]) ? category : undefined;

  const [baseIngredients, customIngredients, selectedBaseIngredient, selectedCustomIngredient] = await Promise.all([
    listBaseRotulaIngredients({ search: tab === "base" ? search : undefined, category: tab === "base" ? safeCategory : undefined }),
    listCustomIngredients(user.id, { search: tab === "meus" ? search : undefined, category: tab === "meus" ? safeCategory : undefined }),
    tab === "base" && selectedIngredientId ? findBaseRotulaIngredient(selectedIngredientId) : Promise.resolve(null),
    tab === "meus" && selectedIngredientId ? findCustomIngredient(user.id, selectedIngredientId) : Promise.resolve(null)
  ]);
  const activeIngredients = tab === "base" ? baseIngredients : customIngredients;
  const selectedIngredient = tab === "base" ? selectedBaseIngredient : selectedCustomIngredient;
  const closeHref = buildIngredientsHref({ tab, search, category: safeCategory });

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar activeItem="Ingredientes" />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl px-5 py-6 lg:px-8 lg:py-8">
            <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <Badge variant="secondary" className="gap-1.5"><span className="size-1.5 rounded-full bg-[var(--accent-orange)]" />Ingredientes</Badge>
              <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">Ingredientes</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">Encontre ingredientes da Base Rotula ou cadastre os seus próprios ingredientes.</p>
                </div>
                {tab === "meus" ? (
                  <Link href={buildIngredientsHref({ tab: "meus", search, category: safeCategory, modal: "novo" })} className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--brand-tiffany)] bg-[var(--brand-tiffany)] px-4 text-sm font-semibold text-[var(--brand-navy)] hover:bg-[#1294a5]">
                    <Plus className="size-4" />
                    Cadastrar ingrediente
                  </Link>
                ) : null}
              </div>
            </section>

            {status ? (
              <Toast className={cn("mb-5", ["invalid", "denied"].includes(status) && "border-[#f0c4c0]")}>{statusMessages[status] ?? statusMessages.invalid}</Toast>
            ) : null}

            <div className="mb-5 flex gap-2 overflow-x-auto" aria-label="Tipos de ingrediente">
              <Link href={buildIngredientsHref({ tab: "base" })} className={cn("inline-flex h-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border px-4 text-sm font-semibold", tab === "base" ? "border-[#b9e8ef] bg-[#e8f7fa] text-[var(--brand-petrol)]" : "border-[var(--border)] bg-white text-[var(--muted)] hover:bg-[var(--surface-muted)]")}>Base Rotula</Link>
              <Link href={buildIngredientsHref({ tab: "meus" })} className={cn("inline-flex h-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border px-4 text-sm font-semibold", tab === "meus" ? "border-[#b9e8ef] bg-[#e8f7fa] text-[var(--brand-petrol)]" : "border-[var(--border)] bg-white text-[var(--muted)] hover:bg-[var(--surface-muted)]")}>Meus ingredientes</Link>
            </div>

            <Card className="shadow-none">
              <CardHeader className="flex-col gap-3 lg:flex-row lg:items-end">
                <div>
                  <CardTitle>{tab === "base" ? "Base Rotula" : "Meus ingredientes"}</CardTitle>
                  <CardDescription>{tab === "base" ? "Ingredientes oficiais disponíveis para consulta." : "Cadastre ingredientes que você usa e não encontrou na Base Rotula."}</CardDescription>
                </div>
                <form className="grid w-full gap-3 md:grid-cols-[1fr_240px_auto] lg:max-w-3xl" action="/ingredientes">
                  {tab === "meus" ? <input type="hidden" name="aba" value="meus" /> : null}
                  <div>
                    <Label htmlFor="busca" className="sr-only">Buscar ingrediente</Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                      <Input id="busca" name="busca" defaultValue={search ?? ""} placeholder="Buscar por nome" className="pl-9" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="categoria" className="sr-only">Categoria</Label>
                    <div className="relative">
                      <Filter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                      <Select id="categoria" name="categoria" defaultValue={safeCategory ?? ""} className="pl-9">
                        <option value="">Todas as categorias</option>
                        {ingredientCategories.map((item) => <option key={item} value={item}>{item}</option>)}
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full md:w-auto">Filtrar</Button>
                </form>
              </CardHeader>

              <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                <span>{activeIngredients.length} ingrediente{activeIngredients.length === 1 ? "" : "s"} encontrado{activeIngredients.length === 1 ? "" : "s"}</span>
                {search ? <Badge variant="secondary">Busca: {search}</Badge> : null}
                {safeCategory ? <Badge variant="secondary">Categoria: {safeCategory}</Badge> : null}
              </div>

              {activeIngredients.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {activeIngredients.map((ingredient) => <IngredientCard key={ingredient.id} ingredient={ingredient} tab={tab} search={search} category={safeCategory} />)}
                </div>
              ) : (
                <EmptyState
                  title={tab === "meus" ? "Você ainda não cadastrou nenhum ingrediente." : "Nenhum ingrediente encontrado."}
                  description={tab === "meus" ? "Cadastre ingredientes próprios copiando os valores da embalagem." : "Tente ajustar a busca ou selecionar outra categoria da Base Rotula."}
                  action={tab === "meus" ? (
                    <Link href={buildIngredientsHref({ tab: "meus", modal: "novo" })} className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--brand-tiffany)] bg-[var(--brand-tiffany)] px-4 text-sm font-semibold text-[var(--brand-navy)] hover:bg-[#1294a5]"><Plus className="size-4" />Cadastrar meu primeiro ingrediente</Link>
                  ) : (
                    <Link href="/ingredientes" className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--brand-petrol)] hover:bg-[var(--surface-muted)]">Limpar filtros</Link>
                  )}
                />
              )}
            </Card>
          </div>
        </div>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#071722]/55 px-4 py-6 backdrop-blur-sm sm:py-10">
          <div className="mx-auto max-w-3xl rounded-[var(--radius-lg)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--foreground)]">
                  {modal === "novo" ? "Cadastrar ingrediente" : modal === "editar" ? "Editar ingrediente" : modal === "excluir" ? "Excluir ingrediente?" : "Detalhes do ingrediente"}
                </h2>
                {modal === "novo" ? <p className="mt-1 text-sm text-[var(--muted)]">Copie os valores da embalagem. Campos vazios serão salvos como Não informado.</p> : null}
              </div>
              <Link href={closeHref} className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-white text-[var(--brand-petrol)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tiffany)]" aria-label="Fechar modal"><X className="size-4" /></Link>
            </div>

            {modal === "novo" && tab === "meus" ? <CustomIngredientForm mode="create" /> : null}
            {modal === "editar" && tab === "meus" && selectedCustomIngredient ? <CustomIngredientForm mode="edit" initial={formInitial(selectedCustomIngredient)} /> : null}
            {modal === "excluir" && tab === "meus" && selectedCustomIngredient ? (
              <div className="space-y-5">
                <p className="text-sm leading-6 text-[var(--muted)]">Essa ação não poderá ser desfeita.</p>
                <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                  <p className="font-semibold text-[var(--foreground)]">{selectedCustomIngredient.name}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{selectedCustomIngredient.category}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Link href={closeHref} className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--brand-petrol)] hover:bg-[var(--surface-muted)]">Cancelar</Link>
                  <DeleteCustomIngredientForm ingredientId={selectedCustomIngredient.id} />
                </div>
              </div>
            ) : null}
            {modal === "detalhes" && selectedIngredient ? <IngredientDetail ingredient={selectedIngredient} /> : null}
            {((modal === "editar" || modal === "excluir" || modal === "detalhes") && !selectedIngredient) || (modal !== "novo" && modal !== "editar" && modal !== "excluir" && modal !== "detalhes") ? (
              <EmptyState title="Ingrediente não encontrado." description="O ingrediente solicitado não está disponível para esta conta." />
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}



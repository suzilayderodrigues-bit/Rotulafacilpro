import Link from "next/link";
import { AlertCircle, Edit3, FlaskConical, Lock, Package, Scale, TableProperties } from "lucide-react";
import { Badge, Card, CardDescription, CardHeader, CardTitle, EmptyState } from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { NutritionFactsTable } from "@/components/nutrition/nutrition-facts-table";
import { FrontOfPackNutritionPreview } from "@/components/nutrition/front-of-pack-nutrition-preview";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/session";
import { findBarcodeByRecipe } from "@/lib/barcodes/repository";
import { renderBarcodeSvg } from "@/lib/barcodes/render";
import {
  calculateRecipeNutrition,
  NutritionCalculationError,
  type NutritionCalculationResult,
  type NutritionNutrientField
} from "@/lib/nutrition";
import { updateRecipePackagingAction } from "@/lib/recipes/actions";
import { formatServingsPerPackageLabel } from "@/lib/recipes/domain";
import { deriveRecipeMainPanelAreaCm2 } from "@/lib/recipes/main-panel";
import {
  buildNutritionTableViewModel,
  calculateNutritionPerServing,
  composeFrontOfPackDecision,
  evaluateFrontOfPack,
  evaluateFrontOfPackApplicability,
  formatNutritionForDeclaration,
  getServingSuggestion,
  type FinalFrontOfPackDecision,
  type NutritionTableViewModel,
  type RegulatoryNutritionResult
} from "@/lib/regulatory";
import { PackagingForm } from "./packaging-form";
import { findRecipeForNutrition } from "@/lib/recipes/repository";

type RecipeSummaryPageProps = {
  params: Promise<{ recipeId: string }>;
  searchParams?: Promise<{ status?: string }>;
};

type NutrientPresentation = {
  field: NutritionNutrientField;
  label: string;
  unit: "kcal" | "g" | "mg";
};

const nutrientPresentation: NutrientPresentation[] = [
  { field: "caloriesKcal", label: "Valor energético", unit: "kcal" },
  { field: "carbohydratesG", label: "Carboidratos", unit: "g" },
  { field: "proteinsG", label: "Proteínas", unit: "g" },
  { field: "totalFatG", label: "Gorduras totais", unit: "g" },
  { field: "saturatedFatG", label: "Gorduras saturadas", unit: "g" },
  { field: "transFatG", label: "Gorduras trans", unit: "g" },
  { field: "fiberG", label: "Fibras alimentares", unit: "g" },
  { field: "sodiumMg", label: "Sódio", unit: "mg" },
  { field: "sugarsG", label: "Açúcares totais", unit: "g" },
  { field: "addedSugarsG", label: "Açúcares adicionados", unit: "g" },
  { field: "calciumMg", label: "Cálcio", unit: "mg" },
  { field: "ironMg", label: "Ferro", unit: "mg" }
];

function physicalStateLabel(value: string) {
  return value === "LIQUID" ? "Líquido" : "Sólido ou semissólido";
}

function unitLabel(value: string) {
  return value === "MILLILITER" ? "ml" : "g";
}

function unitName(value: string) {
  return value === "MILLILITER" ? "ml" : "g";
}

function basisLabel(value: NutritionCalculationResult["basis"]) {
  return value === "100ml" ? "Por 100 ml" : "Por 100 g";
}

function formatDecimal(value: unknown) {
  if (value === null || value === undefined) return "Não informado";
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "Não informado";

  return numberValue.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function formatInputDecimal(value: unknown) {
  if (value === null || value === undefined) return "";
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "";

  return String(numberValue).replace(".", ",");
}

function formatNutrientValue(value: number, unit: NutrientPresentation["unit"]) {
  const formatted = value.toLocaleString("pt-BR", {
    maximumFractionDigits: unit === "kcal" ? 0 : 2,
    minimumFractionDigits: 0
  });

  return formatted + " " + unit;
}

function nutrientCell(value: number | null, unit: NutrientPresentation["unit"], isComplete: boolean) {
  if (!isComplete || value === null) return "Não disponível";

  return formatNutrientValue(value, unit);
}

function dailyValueCell(value: number | null, hasEstablishedDailyValue: boolean, isComplete: boolean) {
  if (!hasEstablishedDailyValue) return "Não estabelecido";
  if (!isComplete || value === null) return "Não disponível";

  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%";
}

function disclosureLabel(value: string | null) {
  if (value === "CONTAINS") return "Contém";
  if (value === "DOES_NOT_CONTAIN") return "Não contém";
  if (value === "NEEDS_REVIEW") return "Preciso revisar";
  return "Não revisado";
}

function crossContaminationLabel(value: string | null) {
  if (value === "YES") return "Sim";
  if (value === "NO") return "Não";
  if (value === "UNKNOWN") return "Não sei";
  return "Não revisado";
}

function packagingStatusMessage(status?: string) {
  if (status === "embalagem-salva") return "Dados de porção e embalagem salvos.";
  if (status?.startsWith("embalagem-")) return "Confira os dados de porção e embalagem antes de salvar.";
  return null;
}

function servingsPerPackageLabel(recipe: {
  servingsPerPackage: unknown;
  isIndividualPackage: boolean;
}) {
  const servingsPerPackage = Number(recipe.servingsPerPackage);

  if (!Number.isFinite(servingsPerPackage) || servingsPerPackage <= 0) {
    return "Não informado";
  }

  const label = formatServingsPerPackageLabel({
    value: servingsPerPackage,
    isIndividualPackage: recipe.isIndividualPackage
  });

  return label ?? "Embalagem individual";
}

function NutritionUnavailable({ message }: { message: string }) {
  return (
    <Card className="mt-5 shadow-none">
      <CardHeader className="flex-col">
        <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[#fff8f0] text-[var(--accent-orange)]">
          <AlertCircle className="size-5" />
        </div>
        <div>
          <CardTitle>Prévia nutricional da receita</CardTitle>
          <CardDescription>{message}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

function NutritionPreview({
  result,
  regulatoryResult
}: {
  result: NutritionCalculationResult;
  regulatoryResult: RegulatoryNutritionResult;
}) {
  const hasIncompleteValues = nutrientPresentation.some((item) => !result.nutrients[item.field].isComplete);
  const showPerUnit = result.unitWeight !== null;
  const showPerServing = regulatoryResult.servingSize !== null;
  const showDailyValue = showPerServing && nutrientPresentation.some((item) => regulatoryResult.nutrients[item.field].hasEstablishedDailyValue);

  return (
    <Card className="mt-5 shadow-none">
      <CardHeader className="flex-col">
        <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[#e8f7fa] text-[var(--brand-petrol)]">
          <FlaskConical className="size-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Prévia nutricional da receita</CardTitle>
            <Badge variant="secondary">Prévia técnica</Badge>
          </div>
          <CardDescription>Valores calculados a partir dos ingredientes e do rendimento informado.</CardDescription>
        </div>
      </CardHeader>

      <div className="rounded-[var(--radius-md)] border border-[#f4d5b6] bg-[#fff8f0] px-4 py-3 text-sm leading-6 text-[#8a4b15]">
        Ainda não é a tabela nutricional final.
        {hasIncompleteValues ? " Alguns valores ainda não estão disponíveis na base nutricional." : ""}
      </div>

      <div className="mt-4 hidden overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--surface-muted)] text-xs font-semibold uppercase tracking-normal text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Nutriente</th>
              <th className="px-4 py-3">Total da receita</th>
              <th className="px-4 py-3">{basisLabel(result.basis)}</th>
              {showPerServing ? <th className="px-4 py-3">Por porção</th> : null}
              {showDailyValue ? <th className="px-4 py-3">%VD*</th> : null}
              {showPerUnit ? <th className="px-4 py-3">Por unidade</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] bg-white">
            {nutrientPresentation.map((item) => {
              const nutrient = result.nutrients[item.field];
              const regulatoryNutrient = regulatoryResult.nutrients[item.field];

              return (
                <tr key={item.field}>
                  <td className="px-4 py-3 font-medium text-[var(--foreground)]">{item.label}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{nutrientCell(nutrient.recipeTotal, item.unit, nutrient.isComplete)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{nutrientCell(nutrient.per100, item.unit, nutrient.isComplete)}</td>
                  {showPerServing ? <td className="px-4 py-3 text-[var(--muted)]">{nutrientCell(regulatoryNutrient.perServing, item.unit, regulatoryNutrient.isComplete)}</td> : null}
                  {showDailyValue ? <td className="px-4 py-3 text-[var(--muted)]">{dailyValueCell(regulatoryNutrient.dailyValuePercent, regulatoryNutrient.hasEstablishedDailyValue, regulatoryNutrient.isComplete)}</td> : null}
                  {showPerUnit ? <td className="px-4 py-3 text-[var(--muted)]">{nutrientCell(nutrient.perUnit, item.unit, nutrient.isComplete)}</td> : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-3 md:hidden">
        {nutrientPresentation.map((item) => {
          const nutrient = result.nutrients[item.field];
          const regulatoryNutrient = regulatoryResult.nutrients[item.field];

          return (
            <div key={item.field} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{item.label}</h3>
                {!nutrient.isComplete ? <Badge variant="secondary">Base incompleta</Badge> : null}
              </div>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">Total</dt>
                  <dd className="text-right text-[var(--foreground)]">{nutrientCell(nutrient.recipeTotal, item.unit, nutrient.isComplete)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">{basisLabel(result.basis)}</dt>
                  <dd className="text-right text-[var(--foreground)]">{nutrientCell(nutrient.per100, item.unit, nutrient.isComplete)}</dd>
                </div>
                {showPerServing ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--muted)]">Por porção</dt>
                    <dd className="text-right text-[var(--foreground)]">{nutrientCell(regulatoryNutrient.perServing, item.unit, regulatoryNutrient.isComplete)}</dd>
                  </div>
                ) : null}
                {showDailyValue ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--muted)]">%VD*</dt>
                    <dd className="text-right text-[var(--foreground)]">{dailyValueCell(regulatoryNutrient.dailyValuePercent, regulatoryNutrient.hasEstablishedDailyValue, regulatoryNutrient.isComplete)}</dd>
                  </div>
                ) : null}
                {showPerUnit ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--muted)]">Por unidade</dt>
                    <dd className="text-right text-[var(--foreground)]">{nutrientCell(nutrient.perUnit, item.unit, nutrient.isComplete)}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default async function RecipeSummaryPage({ params, searchParams }: RecipeSummaryPageProps) {
  const user = await requireUser();
  const { recipeId } = await params;
  const query = searchParams ? await searchParams : {};
  const recipe = await findRecipeForNutrition(user.id, recipeId);

  if (!recipe) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Topbar />
        <div className="flex flex-col lg:flex-row">
          <Sidebar activeItem="Receitas" />
          <div className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-5xl px-5 py-6 lg:px-8 lg:py-8">
              <EmptyState
                title="Receita não encontrada"
                description="A receita solicitada não está disponível para esta conta."
                action={
                  <Link href="/receitas" className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--brand-petrol)] transition hover:bg-[var(--surface-muted)]">
                    Voltar para receitas
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </main>
    );
  }

  const barcode = await findBarcodeByRecipe(user.id, recipe.id);
  const barcodeDisplay = barcode ? renderBarcodeSvg({ value: barcode.value, type: barcode.type, format: barcode.format }) : null;

  const unit = unitLabel(recipe.finalYieldUnit);
  const packagingUnit = recipe.physicalState === "LIQUID" ? "MILLILITER" : "GRAM";
  const packagingUnitLabel = unitName(packagingUnit);
  const packagingMessage = packagingStatusMessage(query.status);
  const servingSuggestion = getServingSuggestion(recipe.foodCategory, recipe.physicalState);
  let nutritionResult: NutritionCalculationResult | null = null;
  let regulatoryNutritionResult: RegulatoryNutritionResult | null = null;
  let nutritionTableModel: NutritionTableViewModel | null = null;
  let frontOfPackDecision: FinalFrontOfPackDecision | null = null;
  const nutritionMessage = "A prévia será exibida quando a receita tiver ingredientes e rendimento final válido.";

  try {
    nutritionResult = calculateRecipeNutrition(recipe);
    frontOfPackDecision = composeFrontOfPackDecision(
      evaluateFrontOfPackApplicability({
        foodCategory: recipe.foodCategory,
        regulatoryCategory: recipe.regulatoryCategory,
        packagingCondition: recipe.packagingCondition,
        mainPanelAreaCm2: deriveRecipeMainPanelAreaCm2(recipe)
      }),
      evaluateFrontOfPack(nutritionResult)
    );
    regulatoryNutritionResult = calculateNutritionPerServing(nutritionResult, recipe.servingSize, packagingUnit);
    nutritionTableModel = buildNutritionTableViewModel(
      formatNutritionForDeclaration(regulatoryNutritionResult),
      {
        householdMeasure: recipe.householdMeasure,
        servingsPerPackage: recipe.servingsPerPackage,
        isIndividualPackage: recipe.isIndividualPackage
      }
    );
  } catch (error) {
    if (!(error instanceof NutritionCalculationError)) {
      throw error;
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar activeItem="Receitas" />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-5 py-6 lg:px-8 lg:py-8">
            <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <Badge variant="secondary" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-[var(--accent-orange)]" />
                Receita
              </Badge>
              <h1 className="mt-4 text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">{recipe.name}</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)] sm:text-base">
                Resumo com os dados reais já cadastrados para esta receita.
              </p>
            </section>

            <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
              <Card className="shadow-none">
                <CardHeader className="flex-col">
                  <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[#e8f7fa] text-[var(--brand-petrol)]">
                    <Edit3 className="size-5" />
                  </div>
                  <div>
                    <CardTitle>Dados do produto</CardTitle>
                    <CardDescription>Informações básicas da receita.</CardDescription>
                  </div>
                </CardHeader>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                    <dt className="font-semibold text-[var(--muted)]">Categoria</dt>
                    <dd className="mt-1 text-[var(--foreground)]">{recipe.foodCategory || "Não informada"}</dd>
                  </div>
                  <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                    <dt className="font-semibold text-[var(--muted)]">Tipo</dt>
                    <dd className="mt-1 text-[var(--foreground)]">{physicalStateLabel(recipe.physicalState)}</dd>
                  </div>
                  <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                    <dt className="font-semibold text-[var(--muted)]">Ingredientes</dt>
                    <dd className="mt-1 text-[var(--foreground)]">{recipe.ingredients.length}</dd>
                  </div>
                  <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                    <dt className="font-semibold text-[var(--muted)]">Revisão</dt>
                    <dd className="mt-1 text-[var(--foreground)]">{recipe.informationReviewedAt ? "Informações revisadas" : "Não revisada"}</dd>
                  </div>
                </dl>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="flex-col">
                  <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[#e8f7fa] text-[var(--brand-petrol)]">
                    <Scale className="size-5" />
                  </div>
                  <div>
                    <CardTitle>Rendimento</CardTitle>
                    <CardDescription>Valores salvos na etapa anterior.</CardDescription>
                  </div>
                </CardHeader>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                    <dt className="font-semibold text-[var(--muted)]">Rendimento final</dt>
                    <dd className="text-right text-[var(--foreground)]">{formatDecimal(recipe.finalYieldAmount)} {recipe.finalYieldAmount ? unit : ""}</dd>
                  </div>
                  <div className="flex justify-between gap-4 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                    <dt className="font-semibold text-[var(--muted)]">Unidades</dt>
                    <dd className="text-right text-[var(--foreground)]">{recipe.unitsProduced ?? "Não informado"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                    <dt className="font-semibold text-[var(--muted)]">Por unidade</dt>
                    <dd className="text-right text-[var(--foreground)]">{formatDecimal(recipe.unitWeight)} {recipe.unitWeight ? unit : ""}</dd>
                  </div>
                </dl>
              </Card>
            </div>

            <Card className="mt-5 min-w-0 shadow-none">
              <CardHeader className="flex-col">
                <CardTitle>Código de barras</CardTitle>
                <CardDescription>Identificação associada a este produto.</CardDescription>
              </CardHeader>
              {barcode ? (
                <div className="min-w-0 space-y-3">
                  <p className="text-sm">{barcode.type === "INTERNAL" ? "Código interno" : "Código oficial"}</p>
                  <p className="break-all font-mono text-sm">{barcode.value}</p>
                  {barcodeDisplay?.status === "READY" ? <img className="max-h-28 w-full object-contain" src={`data:image/svg+xml,${encodeURIComponent(barcodeDisplay.svg)}`} alt={`Código de barras ${barcode.value}`} /> : <p className="text-sm text-[var(--muted)]">Visualização temporariamente indisponível.</p>}
                  <Link href="/codigo-de-barras" className="inline-flex rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--brand-petrol)]">Abrir Código de Barras</Link>
                </div>
              ) : (
                <Link href={`/codigo-de-barras?recipeId=${encodeURIComponent(recipe.id)}`} className="inline-flex rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--brand-petrol)]">Adicionar código de barras</Link>
              )}
            </Card>

            {nutritionResult && regulatoryNutritionResult ? (
              <NutritionPreview result={nutritionResult} regulatoryResult={regulatoryNutritionResult} />
            ) : (
              <NutritionUnavailable message={nutritionMessage} />
            )}

            <Card id="tabela-nutricional" className="mt-5 scroll-mt-5 shadow-none">
              <CardHeader className="flex-col">
                <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[#e8f7fa] text-[var(--brand-petrol)]">
                  <TableProperties className="size-5" />
                </div>
                <div>
                  <CardTitle>Tabela nutricional</CardTitle>
                  <CardDescription>Modelo vertical preparado com os valores regulatoriamente declarados.</CardDescription>
                </div>
              </CardHeader>
              {nutritionTableModel ? (
                <NutritionFactsTable model={nutritionTableModel} />
              ) : (
                <div className="rounded-[var(--radius-md)] border border-[#f4d5b6] bg-[#fff8f0] px-4 py-3 text-sm leading-6 text-[#8a4b15]">
                  A tabela será exibida quando a receita tiver ingredientes e rendimento final válido.
                </div>
              )}
            </Card>

            <Card className="mt-5 shadow-none">
              <CardHeader className="flex-col">
                <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-black text-white">
                  <AlertCircle className="size-5" />
                </div>
                <div>
                  <CardTitle>Rotulagem nutricional frontal</CardTitle>
                  <CardDescription>Avaliação técnica dos limites por 100 g ou 100 ml.</CardDescription>
                </div>
              </CardHeader>
              {frontOfPackDecision ? (
                <FrontOfPackNutritionPreview decision={frontOfPackDecision} />
              ) : (
                <div className="rounded-[var(--radius-md)] border border-[#f4d5b6] bg-[#fff8f0] px-4 py-3 text-sm leading-6 text-[#8a4b15]">
                  A avaliação será exibida quando a receita tiver ingredientes e rendimento final válido.
                </div>
              )}
            </Card>

            <Card className="mt-5 shadow-none">
              <CardHeader className="flex-col">
                <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[#e8f7fa] text-[var(--brand-petrol)]">
                  <Package className="size-5" />
                </div>
                <div>
                  <CardTitle>Porção e embalagem</CardTitle>
                  <CardDescription>Esses dados serão usados para preparar a tabela nutricional.</CardDescription>
                </div>
              </CardHeader>
              {packagingMessage ? (
                <p className="mb-4 rounded-[var(--radius-md)] border border-[#f4d5b6] bg-[#fff8f0] px-4 py-3 text-sm text-[#8a4b15]">{packagingMessage}</p>
              ) : null}
              <PackagingForm
                action={updateRecipePackagingAction}
                recipeId={recipe.id}
                unit={packagingUnit}
                unitLabel={packagingUnitLabel}
                defaultNetQuantity={formatInputDecimal(recipe.netQuantity)}
                defaultServingSize={formatInputDecimal(recipe.servingSize)}
                defaultHouseholdMeasure={recipe.householdMeasure ?? String()}
                suggestion={servingSuggestion}
              />
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                  <dt className="font-semibold text-[var(--muted)]">Quantidade líquida</dt>
                  <dd className="mt-1 text-[var(--foreground)]">{formatDecimal(recipe.netQuantity)} {recipe.netQuantity ? packagingUnitLabel : ""}</dd>
                </div>
                <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                  <dt className="font-semibold text-[var(--muted)]">Porção</dt>
                  <dd className="mt-1 text-[var(--foreground)]">{formatDecimal(recipe.servingSize)} {recipe.servingSize ? packagingUnitLabel : ""}</dd>
                </div>
                <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                  <dt className="font-semibold text-[var(--muted)]">Medida caseira</dt>
                  <dd className="mt-1 text-[var(--foreground)]">{recipe.householdMeasure || "Não informada"}</dd>
                </div>
                <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                  <dt className="font-semibold text-[var(--muted)]">Porções por embalagem</dt>
                  <dd className="mt-1 text-[var(--foreground)]">{servingsPerPackageLabel(recipe)}</dd>
                </div>
              </dl>
            </Card>

            <Card className="mt-5 shadow-none">
              <CardHeader className="flex-col">
                <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[#fff8f0] text-[var(--accent-orange)]">
                  <Lock className="size-5" />
                </div>
                <div>
                  <CardTitle>Informações revisadas</CardTitle>
                  <CardDescription>Declarações salvas pela usuária na Etapa 4.</CardDescription>
                </div>
              </CardHeader>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                  <dt className="font-semibold text-[var(--muted)]">Alergênicos</dt>
                  <dd className="mt-1 text-[var(--foreground)]">{recipe.confirmedAllergens.length ? recipe.confirmedAllergens.join(", ") : "Nenhum confirmado"}</dd>
                </div>
                <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                  <dt className="font-semibold text-[var(--muted)]">Glúten</dt>
                  <dd className="mt-1 text-[var(--foreground)]">{disclosureLabel(recipe.glutenStatus)}</dd>
                </div>
                <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                  <dt className="font-semibold text-[var(--muted)]">Lactose</dt>
                  <dd className="mt-1 text-[var(--foreground)]">{disclosureLabel(recipe.lactoseStatus)}</dd>
                </div>
                <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                  <dt className="font-semibold text-[var(--muted)]">Contaminação cruzada</dt>
                  <dd className="mt-1 text-[var(--foreground)]">{crossContaminationLabel(recipe.crossContaminationRisk)}</dd>
                </div>
              </dl>
              {recipe.crossContaminationAllergens.length ? (
                <p className="mt-4 rounded-[var(--radius-md)] border border-[#f4d5b6] bg-[#fff8f0] px-4 py-3 text-sm text-[#8a4b15]">
                  Alergênicos envolvidos em contaminação cruzada: {recipe.crossContaminationAllergens.join(", ")}
                </p>
              ) : null}
            </Card>

            <Card className="mt-5 shadow-none">
              <CardHeader className="flex-col">
                <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[#e8f7fa] text-[var(--brand-petrol)]">
                  <FlaskConical className="size-5" />
                </div>
                <div>
                  <CardTitle>Próxima etapa</CardTitle>
                  <CardDescription>Disponível na próxima etapa.</CardDescription>
                </div>
              </CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={"/receitas/" + recipe.id + "/ingredientes"} className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--brand-petrol)] transition hover:bg-[var(--surface-muted)]">
                  Editar ingredientes
                </Link>
                <Link href={"/receitas/" + recipe.id + "/rendimento"} className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--brand-petrol)] transition hover:bg-[var(--surface-muted)]">
                  Editar rendimento
                </Link>
                <Link href="#tabela-nutricional" className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--brand-tiffany)] bg-[var(--brand-tiffany)] px-4 text-sm font-semibold text-[var(--brand-navy)]">Ver tabela nutricional</Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

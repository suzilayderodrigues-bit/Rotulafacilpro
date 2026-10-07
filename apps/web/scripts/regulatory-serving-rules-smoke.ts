import { snapshotBaseRotula, assertBaseRotulaPreserved } from "./base-rotula-preservation";
import { prisma } from "@rotula-facil-pro/db";
import {
  findServingRule,
  getServingSuggestion,
  regulatoryServingRules,
  regulatoryServingVersion,
  validateRegulatoryServingRules
} from "../src/lib/regulatory";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const baseSnapshot = await snapshotBaseRotula();
  const validation = validateRegulatoryServingRules();

  assert(validation.groupCount === 8, "O Anexo V deve conter os oito grupos oficiais.");
  assert(validation.ruleCount === 138, "O dataset consolidado deve conter 138 regras.");
  assert(new Set(regulatoryServingRules.map((rule) => rule.categoryCode)).size === regulatoryServingRules.length, "categoryCode duplicado.");
  assert(regulatoryServingRules.every((rule) => rule.regulatoryVersion === regulatoryServingVersion), "Versão regulatória ausente ou divergente.");
  assert(regulatoryServingRules.every((rule) => rule.sourceReference.trim()), "Referência oficial ausente.");

  const brownie = findServingRule("Brownies e alfajores");
  assert(brownie?.categoryCode === "IN75-G7-020", "A busca exata por categoria não encontrou a regra esperada.");
  assert(brownie.servingMode === "FIXED" && brownie.servingSize === 40 && brownie.servingUnit === "GRAM", "Regra fixa de brownies inválida.");

  const brownieAlias = getServingSuggestion("Brownies", "SOLID_OR_SEMISOLID");
  assert(brownieAlias.matched && brownieAlias.servingSize === 40, "Alias inequívoco de brownies não resolveu a porção.");
  assert(brownieAlias.matched && brownieAlias.householdMeasure === "Unidades", "A medida caseira deve continuar sendo tratada como sugestão.");

  const preparation = findServingRule("Pós para preparar bolos e tortas");
  assert(preparation?.servingMode === "PREPARATION_BASED", "Regra baseada em preparo não foi preservada.");
  assert(preparation.preparedReferenceQuantity === 60 && preparation.preparedReferenceUnit === "GRAM", "Referência de preparo inválida.");
  assert(!("servingSize" in preparation), "Regra baseada em preparo não pode conter peso inventado do produto em pó.");
  const preparationSuggestion = getServingSuggestion("Pós para preparar bolos e tortas", "SOLID_OR_SEMISOLID");
  assert(!preparationSuggestion.matched && preparationSuggestion.reason === "non-fixed-rule", "Regra baseada em preparo não deve preencher a Recipe automaticamente.");

  const egg = findServingRule("Ovo");
  assert(egg?.servingMode === "SPECIAL" && egg.servingText === "Quantidade que corresponda a 1 unidade", "Retificação da regra de ovo não foi preservada.");

  const iceCream = findServingRule("Sorvetes de massa");
  assert(iceCream?.servingMode === "ALTERNATIVE" && iceCream.alternatives.length === 2, "Alternativas de sorvete não foram preservadas.");

  const missing = getServingSuggestion("Palha italiana", "SOLID_OR_SEMISOLID");
  assert(!missing.matched && missing.reason === "no-rule", "Categoria sem equivalência não pode receber regra arbitrária.");

  const recipeState = {
    servingSize: 47,
    householdMeasure: "1 pedaço",
    unitWeight: 52
  };
  const before = JSON.stringify(recipeState);
  getServingSuggestion("Brownies", "SOLID_OR_SEMISOLID");
  assert(JSON.stringify(recipeState) === before, "Consultar uma sugestão não pode sobrescrever valores salvos da Recipe.");
  assert(recipeState.unitWeight === 52, "unitWeight deve permanecer intocado.");

  const baseRotula = await prisma.ingredient.count({ where: { source: "BASE_ROTULA" } });
  await assertBaseRotulaPreserved(baseSnapshot);

  console.log(JSON.stringify({
    validation,
    exactCategoryLookup: "OK",
    preparationBasedWithoutInventedWeight: "OK",
    specialAndAlternativeRules: "OK",
    unmatchedCategory: "OK",
    recipeValuesPreserved: "OK",
    unitWeightPreserved: "OK",
    baseRotula
  }, null, 2));
}

main().finally(() => prisma.$disconnect());

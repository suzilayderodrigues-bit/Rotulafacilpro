import type { IngredientBaseUnit } from "@rotula-facil-pro/db";
import {
  regulatoryServingVersion,
  type AlternativeRegulatoryServingRule,
  type FixedRegulatoryServingRule,
  type PreparationBasedRegulatoryServingRule,
  type RegulatoryPreparedReferenceUnit,
  type RegulatoryServingRule,
  type SpecialRegulatoryServingRule
} from "./serving-rules-types";

const consolidatedSource = "IN nº 75/2020, Anexo V, texto consolidado no AnvisaLegis (RET. DOU 13/10/2022)";

type RegulatoryGroup = {
  code: string;
  name: string;
};

const groups = {
  I: { code: "G1", name: "Produtos de panificação, cereais, leguminosas, raízes, tubérculos e seus derivados" },
  II: { code: "G2", name: "Verduras, hortaliças e conservas vegetais" },
  III: { code: "G3", name: "Frutas, sucos, néctares e refrescos de frutas" },
  IV: { code: "G4", name: "Leites e derivados" },
  V: { code: "G5", name: "Carnes e ovos" },
  VI: { code: "G6", name: "Óleos, gorduras e sementes oleaginosas" },
  VII: { code: "G7", name: "Açúcares e produtos com energia proveniente de carboidratos e gorduras" },
  VIII: { code: "G8", name: "Molhos, temperos prontos, caldos, sopas, pratos semiprontos ou prontos para consumo e bebidas alcoólicas" }
} satisfies Record<string, RegulatoryGroup>;

function categoryCode(group: RegulatoryGroup, index: number) {
  return `IN75-${group.code}-${String(index).padStart(3, "0")}`;
}

function common(group: RegulatoryGroup, index: number, categoryName: string, householdMeasureSuggestion: string, aliases: string[], notes?: string) {
  return {
    regulatoryVersion: regulatoryServingVersion,
    groupCode: group.code,
    groupName: group.name,
    categoryCode: categoryCode(group, index),
    categoryName,
    aliases,
    householdMeasureSuggestion,
    sourceReference: `${consolidatedSource}, Grupo ${group.code.slice(1)}`,
    ...(notes ? { notes } : {})
  };
}

function fixed(
  group: RegulatoryGroup,
  index: number,
  categoryName: string,
  servingSize: number,
  servingUnit: IngredientBaseUnit,
  householdMeasureSuggestion: string,
  aliases: string[] = [],
  notes?: string
): FixedRegulatoryServingRule {
  return {
    ...common(group, index, categoryName, householdMeasureSuggestion, aliases, notes),
    servingMode: "FIXED",
    physicalState: servingUnit === "MILLILITER" ? "LIQUID" : "SOLID_OR_SEMISOLID",
    servingSize,
    servingUnit
  };
}

function preparation(
  group: RegulatoryGroup,
  index: number,
  categoryName: string,
  servingText: string,
  preparedReferenceQuantity: number,
  preparedReferenceUnit: RegulatoryPreparedReferenceUnit,
  householdMeasureSuggestion: string,
  aliases: string[] = [],
  notes?: string
): PreparationBasedRegulatoryServingRule {
  return {
    ...common(group, index, categoryName, householdMeasureSuggestion, aliases, notes),
    servingMode: "PREPARATION_BASED",
    servingText,
    preparedReferenceQuantity,
    preparedReferenceUnit
  };
}

function alternative(
  group: RegulatoryGroup,
  index: number,
  categoryName: string,
  servingText: string,
  alternatives: AlternativeRegulatoryServingRule["alternatives"],
  householdMeasureSuggestion: string,
  aliases: string[] = [],
  notes?: string
): AlternativeRegulatoryServingRule {
  return {
    ...common(group, index, categoryName, householdMeasureSuggestion, aliases, notes),
    servingMode: "ALTERNATIVE",
    servingText,
    alternatives
  };
}

function special(
  group: RegulatoryGroup,
  index: number,
  categoryName: string,
  servingText: string,
  householdMeasureSuggestion: string,
  aliases: string[] = [],
  notes?: string
): SpecialRegulatoryServingRule {
  return {
    ...common(group, index, categoryName, householdMeasureSuggestion, aliases, notes),
    servingMode: "SPECIAL",
    servingText
  };
}

export const regulatoryServingRules = [
  fixed(groups.I, 1, "Amidos e féculas", 20, "GRAM", "Colheres de sopa"),
  fixed(groups.I, 2, "Arroz cru", 50, "GRAM", "Xícaras"),
  fixed(groups.I, 3, "Aveia em flocos sem outros ingredientes", 30, "GRAM", "Colheres de sopa"),
  fixed(groups.I, 4, "Barra de cereais com até 10% de gordura", 30, "GRAM", "Unidades"),
  fixed(groups.I, 5, "Batata, mandioca e outros tubérculos, cozidos em água embalada à vácuo", 150, "GRAM", "Unidades ou xícara"),
  fixed(groups.I, 6, "Batata e mandioca pré-frita congelada", 85, "GRAM", "Unidades ou xícaras"),
  fixed(groups.I, 7, "Produtos à base de tubérculos e cereais pré-fritos ou congelados", 85, "GRAM", "Unidades"),
  fixed(groups.I, 8, "Biscoito salgados, integrais e grissines", 30, "GRAM", "Unidades", ["Biscoito salgado", "Biscoitos salgados"]),
  fixed(groups.I, 9, "Bolos, todos os tipos sem recheio", 60, "GRAM", "Fatia ou fração", ["Bolo sem recheio", "Bolos sem recheio"]),
  fixed(groups.I, 10, "Canjica (grão cru)", 50, "GRAM", "Xícaras"),
  fixed(groups.I, 11, "Cereal matinal pesando até 45 g por xícara", 30, "GRAM", "Xícaras"),
  fixed(groups.I, 12, "Cereal matinal pesando mais do que 45 g por xícara", 40, "GRAM", "Xícaras"),
  fixed(groups.I, 13, "Cereais integrais crus", 45, "GRAM", "Xícaras"),
  fixed(groups.I, 14, "Farinhas de cereais e tubérculos, todos os tipos", 50, "GRAM", "Xícaras"),
  fixed(groups.I, 15, "Farelo de cereais e germe de trigo", 10, "GRAM", "Colheres de sopa"),
  fixed(groups.I, 16, "Farinha láctea", 30, "GRAM", "Colheres de sopa"),
  fixed(groups.I, 17, "Farofa pronta", 35, "GRAM", "Colheres de sopa"),
  fixed(groups.I, 18, "Massa alimentícia seca", 80, "GRAM", "Pratos ou xícaras"),
  fixed(groups.I, 19, "Massa desidratada com recheio", 70, "GRAM", "Pratos ou xícaras"),
  fixed(groups.I, 20, "Massas frescas com e sem recheios", 100, "GRAM", "Pratos ou xícaras"),
  fixed(groups.I, 21, "Pães embalados fatiados ou não, com ou sem recheio", 50, "GRAM", "Unidades ou fatias"),
  fixed(groups.I, 22, "Pães embalados de consumo individual, chipa paraguaia", 50, "GRAM", "Unidades"),
  fixed(groups.I, 23, "Pão doce sem frutas", 40, "GRAM", "Unidades"),
  fixed(groups.I, 24, "Pão croissant, outros produtos de panificação, salgados ou doces sem recheio", 40, "GRAM", "Unidades"),
  fixed(groups.I, 25, "Pão de batata, pão de queijo e outros resfriados e congelados com recheio e massas para pães", 40, "GRAM", "Unidades ou fatias"),
  fixed(groups.I, 26, "Pão de batata, pão de queijo e outros resfriados e congelados sem recheio, chipa paraguaia", 50, "GRAM", "Unidades ou fatias"),
  fixed(groups.I, 27, "Pipoca", 25, "GRAM", "Xícaras"),
  fixed(groups.I, 28, "Torradas", 30, "GRAM", "Unidades"),
  fixed(groups.I, 29, "Tofu", 40, "GRAM", "Fatias"),
  fixed(groups.I, 30, "Trigo para quibe e proteína texturizada de soja", 50, "GRAM", "Xícaras"),
  fixed(groups.I, 31, "Leguminosas secas, todas", 60, "GRAM", "Xícaras"),
  preparation(groups.I, 32, "Pós para preparar flans e sobremesas", "Quantidade suficiente para preparar 120 g", 120, "GRAM", "Colheres de sopa"),
  fixed(groups.I, 33, "Sagu", 30, "GRAM", "Colheres de sopa"),
  fixed(groups.I, 34, "Massas para pasteis e panquecas", 30, "GRAM", "Unidades"),
  fixed(groups.I, 35, "Massa para tortas salgadas", 30, "GRAM", "Frações"),
  fixed(groups.I, 36, "Massa para pizza", 40, "GRAM", "Fatias"),
  fixed(groups.I, 37, "Farinha de rosca", 30, "GRAM", "Colheres de sopa"),
  fixed(groups.I, 38, "Preparações à base de soja tipo: milanesa, almondegas e hambúrguer", 80, "GRAM", "Unidades"),
  preparation(groups.I, 39, "Mistura para sopa paraguaia y chipaguazú", "Quantidade suficiente para preparar 150 g", 150, "GRAM", "Fatias"),
  preparation(groups.I, 40, "Pré-mistura para preparar bori-bori", "Quantidade suficiente para preparar 80 g", 80, "GRAM", "Colheres de sopa"),
  preparation(groups.I, 41, "Pré-mistura para preparar chipa paraguaia e mbeyu e outros pães", "Quantidade suficiente para preparar 50 g", 50, "GRAM", "Colheres de sopa"),
  preparation(groups.I, 42, "Preparado desidratados para purês de tubérculos", "Quantidade suficiente para 150 g", 150, "GRAM", "Colheres de sopa ou xícaras"),
  preparation(groups.I, 43, "Pós para preparar bolos e tortas", "Quantidade suficiente para preparar 60 g", 60, "GRAM", "Colheres de sopa"),

  fixed(groups.II, 1, "Concentrado de vegetais triplo (extrato)", 30, "GRAM", "Colheres de sopa"),
  fixed(groups.II, 2, "Concentrado de vegetais", 15, "GRAM", "Colheres de sopa"),
  fixed(groups.II, 3, "Purê ou polpa de vegetais, incluindo tomate", 60, "GRAM", "Colheres de sopa"),
  fixed(groups.II, 4, "Molho de tomate ou à base de tomate e outros vegetais", 60, "GRAM", "Colheres de sopa", ["Molho de tomate"]),
  fixed(groups.II, 5, "Picles e alcaparras", 15, "GRAM", "Colheres de sopa"),
  fixed(groups.II, 6, "Sucos de vegetais, frutas e sojas", 200, "MILLILITER", "Copos"),
  fixed(groups.II, 7, "Vegetais desidratados em conserva (tomate seco)", 40, "GRAM", "Colheres de sopa"),
  fixed(groups.II, 8, "Vegetais desidratados para sopa", 40, "GRAM", "Colheres de sopa"),
  preparation(groups.II, 9, "Vegetais desidratados para purê", "Quantidade suficiente para preparar 150 g", 150, "GRAM", "Colheres de sopa"),
  fixed(groups.II, 10, "Vegetais em conserva (alcachofra, aspargo, cogumelos, pimentão, pepino e palmito) em salmoura, vinagre e azeite", 50, "GRAM", "Unidades ou xícaras"),
  fixed(groups.II, 11, "Jardineira e outras conservas de vegetais e legumes (cenouras, ervilhas, milho, tomate pelado e outros)", 130, "GRAM", "Xícaras"),
  fixed(groups.II, 12, "Vegetais empanados", 80, "GRAM", "Unidades"),

  preparation(groups.III, 1, "Polpa de frutas para refresco, sucos concentrados de frutas e desidratados", "Quantidade suficiente para preparar 200 ml", 200, "MILLILITER", "Colheres de sopa"),
  fixed(groups.III, 2, "Polpa de frutas para sobremesas", 50, "GRAM", "Colheres de sopa"),
  fixed(groups.III, 3, "Suco, néctar e bebidas de frutas", 200, "MILLILITER", "Copos"),
  fixed(groups.III, 4, "Frutas desidratadas (peras, pêssegos, abacaxi, ameixas, partes comestíveis)", 50, "GRAM", "Unidades ou colheres de sopa"),
  fixed(groups.III, 5, "Uva passa", 30, "GRAM", "Colheres de sopa"),
  fixed(groups.III, 6, "Fruta em conserva, incluindo salada de frutas", 140, "GRAM", "Unidades ou colheres de sopa"),

  fixed(groups.IV, 1, "Bebida láctea", 200, "MILLILITER", "Copos"),
  fixed(groups.IV, 2, "Leites fermentados, iogurte, todos os tipos", 200, "GRAM", "Copos"),
  fixed(groups.IV, 3, "Leite fluido, todos os tipos", 200, "MILLILITER", "Copos", ["Leite fluido"]),
  preparation(groups.IV, 4, "Leite evaporado", "Quantidade suficiente para preparar 200 ml", 200, "MILLILITER", "Colheres de sopa"),
  fixed(groups.IV, 5, "Queijo ralado", 10, "GRAM", "Colheres de sopa"),
  fixed(groups.IV, 6, "Queijo cottage, ricota desnatado, queijo minas, requeijão desnatado e petit-suisse", 50, "GRAM", "Colheres de sopa"),
  fixed(groups.IV, 7, "Outros queijos (ricota, semiduros, branco, requeijão, queijo cremoso, fundidos e em pasta)", 30, "GRAM", "Colheres de sopa ou fatias"),
  preparation(groups.IV, 8, "Leite em pó", "Quantidade suficiente para preparar 200 ml", 200, "MILLILITER", "Colheres de sopa"),
  fixed(groups.IV, 9, "Sobremesas lácteas", 120, "GRAM", "Unidades ou xícaras"),
  preparation(groups.IV, 10, "Pós para preparar sobremesas lácteas", "Quantidade suficiente para preparar 120 g", 120, "GRAM", "Colheres de sopa"),
  preparation(groups.IV, 11, "Pós para preparar sorvetes", "Quantidade suficiente para preparar 50 g", 50, "GRAM", "Colheres de sopa"),

  fixed(groups.V, 1, "Almôndegas à base de carnes", 80, "GRAM", "Unidades"),
  fixed(groups.V, 2, "Anchovas em conserva", 15, "GRAM", "Colheres de sopa"),
  fixed(groups.V, 3, "Apresuntado e corned beef", 30, "GRAM", "Fatias"),
  fixed(groups.V, 4, "Atum, sardinha, pescado, mariscos, outros peixes em conserva com ou sem molhos", 60, "GRAM", "Unidades ou colheres de sopa"),
  fixed(groups.V, 5, "Caviar", 10, "GRAM", "Colheres de chá"),
  fixed(groups.V, 6, "Charque", 30, "GRAM", "Frações ou pratos"),
  fixed(groups.V, 7, "Hambúrguer à base de carnes", 80, "GRAM", "Unidades"),
  fixed(groups.V, 8, "Linguiça, salsicha, todos os tipos", 50, "GRAM", "Unidades ou frações"),
  fixed(groups.V, 9, "Kani-kama", 20, "GRAM", "Unidades ou colheres de sopa"),
  fixed(groups.V, 10, "Preparações de carnes temperados, defumadas, cozidas ou não", 100, "GRAM", "Unidades"),
  fixed(groups.V, 11, "Preparações de carnes com farinhas ou empanadas", 130, "GRAM", "Unidades"),
  fixed(groups.V, 12, "Embutidos, fiambre e presunto", 40, "GRAM", "Unidades ou fatias"),
  fixed(groups.V, 13, "Peito de peru, blanquet", 60, "GRAM", "Unidades ou fatias"),
  fixed(groups.V, 14, "Patês (presunto, fígado e bacon etc)", 10, "GRAM", "Colheres de chá"),
  special(groups.V, 15, "Ovo", "Quantidade que corresponda a 1 unidade", "Unidades", ["Ovos"], "Linha corrigida pela retificação do Anexo V publicada no DOU de 13/10/2022; não há massa arbitrada."),

  fixed(groups.VI, 1, "Óleos vegetais, todos os tipos", 13, "MILLILITER", "Colheres de sopa"),
  fixed(groups.VI, 2, "Azeitona", 20, "GRAM", "Unidades"),
  fixed(groups.VI, 3, "Bacon em pedaços - defumado ou fresco", 10, "GRAM", "Fatias"),
  fixed(groups.VI, 4, "Banha e gorduras animais", 10, "GRAM", "Colheres de sopa"),
  fixed(groups.VI, 5, "Gordura vegetal", 10, "GRAM", "Colheres de sopa"),
  fixed(groups.VI, 6, "Maionese e molhos à base de maionese", 12, "GRAM", "Colheres de sopa"),
  fixed(groups.VI, 7, "Manteiga, margarina e similares", 10, "GRAM", "Colheres de sopa"),
  fixed(groups.VI, 8, "Molhos para saladas à base de óleo (todos os tipos)", 13, "MILLILITER", "Colheres de sopa"),
  fixed(groups.VI, 9, "Chantilly", 20, "GRAM", "Colheres de sopa"),
  fixed(groups.VI, 10, "Creme de leite", 15, "GRAM", "Colheres de sopa"),
  fixed(groups.VI, 11, "Leite de coco", 15, "GRAM", "Colheres de sopa"),
  fixed(groups.VI, 12, "Coco ralado", 12, "GRAM", "Colheres de chá"),
  fixed(groups.VI, 13, "Sementes oleaginosas (misturados, cortados, picados, inteiros)", 15, "GRAM", "Colheres de sopa", ["Castanhas e sementes", "Sementes oleaginosas"]),

  fixed(groups.VII, 1, "Açúcar, todos os tipos", 5, "GRAM", "Colheres de chá"),
  fixed(groups.VII, 2, "Achocolatado em pó, pós com base de cacau, chocolate em pó e cacau em pó", 20, "GRAM", "Colheres de sopa"),
  fixed(groups.VII, 3, "Doces em corte (goiaba, marmelo, figo, batata etc)", 40, "GRAM", "Fatias"),
  fixed(groups.VII, 4, "Doces em pasta (abóbora, goiaba, leite, banana, mocotó)", 20, "GRAM", "Colheres de sopa"),
  fixed(groups.VII, 5, "Geleias diversas", 20, "GRAM", "Colheres de sopa", ["Geleia", "Geleias"]),
  fixed(groups.VII, 6, "Glicose de milho, mel, melado, cobertura de frutas, leite condensado e outros xaropes (cassis, groselha, framboesa, amora, guaraná etc)", 20, "GRAM", "Colheres de sopa"),
  preparation(groups.VII, 7, "Pó para gelatina", "Quantidade suficiente para preparar 120 g", 120, "GRAM", "Colheres de sopa"),
  fixed(groups.VII, 8, "Sobremesa de gelatina pronta", 120, "GRAM", "Unidades"),
  fixed(groups.VII, 9, "Frutas inteiras em conserva para adornos (cereja maraschino, framboesa)", 20, "GRAM", "Unidades"),
  fixed(groups.VII, 10, "Balas, pirulitos e pastilhas", 20, "GRAM", "Unidades"),
  fixed(groups.VII, 11, "Goma de mascar", 3, "GRAM", "Unidades"),
  fixed(groups.VII, 12, "Chocolates, bombons e similares", 25, "GRAM", "Unidades ou frações", ["Chocolate", "Chocolates", "Bombons"]),
  fixed(groups.VII, 13, "Confeitos de chocolate e drageados em geral", 25, "GRAM", "Unidades ou colheres de sopa"),
  alternative(groups.VII, 14, "Sorvetes de massa", "60 g ou 130 ml", [{ servingSize: 60, servingUnit: "GRAM" }, { servingSize: 130, servingUnit: "MILLILITER" }], "Bolas ou unidades", [], "A escolha entre massa e volume depende da apresentação do produto; nenhuma alternativa é aplicada automaticamente."),
  alternative(groups.VII, 15, "Sorvetes individuais", "60 g ou 130 ml", [{ servingSize: 60, servingUnit: "GRAM" }, { servingSize: 130, servingUnit: "MILLILITER" }], "Unidades", [], "A escolha entre massa e volume depende da apresentação do produto; nenhuma alternativa é aplicada automaticamente."),
  fixed(groups.VII, 16, "Barra de cereais com mais de 10% de gorduras, torrones, pé de moleque e paçoca", 20, "GRAM", "Unidades ou frações"),
  fixed(groups.VII, 17, "Bebidas não alcoólicas, carbonadas ou não (chás, bebidas à base de soja e refrigerantes)", 200, "MILLILITER", "Xícaras ou copos", ["Bebidas não alcoólicas"]),
  preparation(groups.VII, 18, "Pós para preparo de refresco", "Quantidade suficiente para preparar 200 ml", 200, "MILLILITER", "Colheres de sopa"),
  fixed(groups.VII, 19, "Biscoito doce, com ou sem recheio", 30, "GRAM", "Unidades", ["Biscoito doce", "Biscoitos doces"]),
  fixed(groups.VII, 20, "Brownies e alfajores", 40, "GRAM", "Unidades", ["Brownie", "Brownies", "Alfajor", "Alfajores"]),
  fixed(groups.VII, 21, "Frutas cristalizadas", 30, "GRAM", "Unidades ou colheres de sopa"),
  fixed(groups.VII, 22, "Panetone", 80, "GRAM", "Unidades ou fatias"),
  fixed(groups.VII, 23, "Bolo com frutas", 60, "GRAM", "Unidades ou fatias", ["Bolos com frutas"]),
  fixed(groups.VII, 24, "Bolos e similares com recheio ou cobertura", 60, "GRAM", "Unidades ou fatias", ["Bolo com recheio ou cobertura", "Bolos com recheio ou cobertura"]),
  fixed(groups.VII, 25, "Pão croissant, produtos de panificação, salgados ou doces com recheio ou cobertura", 40, "GRAM", "Unidades"),
  fixed(groups.VII, 26, "Snacks à base de cereais e farinhas para petisco", 25, "GRAM", "Xícaras"),
  fixed(groups.VII, 27, "Mistura para preparo de docinho, cobertura para bolos, tortas e sorvetes etc", 20, "GRAM", "Colheres de sopa"),

  preparation(groups.VIII, 1, "Caldo (carne, galinha, legumes etc) e pós para sopa incluindo (bori-bori, pirá caldo, shoyo)", "Quantidade suficiente para 250 ml", 250, "MILLILITER", "Unidades, colheres de sopa ou frações"),
  fixed(groups.VIII, 2, "Catchup e mostarda", 12, "GRAM", "Colheres de sopa"),
  special(groups.VIII, 3, "Molhos à base de soja ou vinagre", "Quantidade que corresponda a 1 colher de sopa", "Colheres de sopa", [], "Linha corrigida pela retificação do Anexo V publicada no DOU de 13/10/2022; não há massa ou volume arbitrado."),
  special(groups.VIII, 4, "Molhos à base de produtos lácteos ou caldos", "Quantidade que corresponda a 2 colheres de sopa", "Colheres de sopa", [], "Linha corrigida pela retificação do Anexo V publicada no DOU de 13/10/2022; não há massa ou volume arbitrado."),
  preparation(groups.VIII, 5, "Pós para preparar molhos", "Quantidade suficiente para preparar 2 colheres de sopa", 2, "TABLESPOON", "Colheres de sopa"),
  fixed(groups.VIII, 6, "Misso", 20, "GRAM", "Colheres de sopa"),
  preparation(groups.VIII, 7, "Missoshiro", "Quantidade suficiente para 200 ml", 200, "MILLILITER", "Colheres de sopa"),
  fixed(groups.VIII, 8, "Extrato de soja", 30, "GRAM", "Colheres de sopa"),
  fixed(groups.VIII, 9, "Pratos preparados prontos e semipronto não incluídos em outros itens da tabela", 100, "GRAM", "Unidades ou frações"),
  fixed(groups.VIII, 10, "Tempero completos", 5, "GRAM", "Colheres de chá"),
  special(groups.VIII, 11, "Bebidas alcoólicas", "Quantidade equivalente a 10 g de etanol", "Unidades ou copos", [], "A referência é a quantidade de etanol, não a massa ou o volume arbitrário da bebida.")
] satisfies RegulatoryServingRule[];

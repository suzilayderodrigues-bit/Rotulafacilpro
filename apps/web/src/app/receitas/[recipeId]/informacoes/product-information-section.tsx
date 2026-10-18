import { conditionalAnnexXviCategories } from "@/lib/regulatory";
import { buildProductInformationModel, type ProductInformationRecipe } from "@/lib/recipes/product-information";
import { RegulatoryCategoryFields } from "./regulatory-category-fields";
import { RegulatoryPackagingFields } from "./regulatory-packaging-fields";
import { ProductInformationFields } from "./product-information-fields";

export function ProductInformationSection({ recipe, format, template }: { recipe: ProductInformationRecipe; format?: string; template?: string }) {
  const needsClassification = !recipe.regulatoryCategory || !recipe.packagingCondition ||
    (recipe.packagingCondition === "PACKAGED_IN_ABSENCE_OF_CONSUMER" && (!recipe.mainPanelWidthCm || !recipe.mainPanelHeightCm)) ||
    (conditionalAnnexXviCategories.includes(recipe.regulatoryCategory) && [recipe.addedSugarsAddition, recipe.saturatedFatAddition, recipe.sodiumAddition].some(value => !value || value === "UNKNOWN"));
  return <ProductInformationFields model={buildProductInformationModel(recipe)} format={format} template={template}>
    <details id="enquadramento" open={needsClassification} className="rounded border bg-white p-3">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">Produto e embalagem · {needsClassification ? "complete para avaliar a lupa" : "informações salvas, revisar"}</summary>
      <RegulatoryCategoryFields defaultCategory={recipe.regulatoryCategory}
        defaultAddedSugarsAddition={recipe.addedSugarsAddition} defaultSaturatedFatAddition={recipe.saturatedFatAddition} defaultSodiumAddition={recipe.sodiumAddition} />
      <RegulatoryPackagingFields defaultCondition={recipe.packagingCondition} defaultWidthCm={recipe.mainPanelWidthCm?.toString() ?? ""} defaultHeightCm={recipe.mainPanelHeightCm?.toString() ?? ""} />
    </details>
  </ProductInformationFields>;
}

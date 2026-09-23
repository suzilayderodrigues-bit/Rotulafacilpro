export function calculateMainPanelAreaCm2(widthCm: number, heightCm: number) {
  if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0) {
    return null;
  }

  return widthCm * heightCm;
}

export function deriveRecipeMainPanelAreaCm2(recipe: {
  mainPanelWidthCm: unknown;
  mainPanelHeightCm: unknown;
}) {
  if (recipe.mainPanelWidthCm === null || recipe.mainPanelWidthCm === undefined) return null;
  if (recipe.mainPanelHeightCm === null || recipe.mainPanelHeightCm === undefined) return null;

  return calculateMainPanelAreaCm2(Number(recipe.mainPanelWidthCm), Number(recipe.mainPanelHeightCm));
}

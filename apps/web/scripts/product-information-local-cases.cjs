/* eslint-disable @typescript-eslint/no-require-imports -- Isolated real-module checks, all storage is in-memory. */
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

module.exports = async function testProductInformation({ load, harness, elements, field, action, recipes, ingredients, items, repo, actions, compositor, hydrate, ingredient, mocks }) {
  const { buildProductInformationModel, prepareProductInformationInput } = load('apps/web/src/lib/recipes/product-information.ts');
  const { ProductInformationFields } = load('apps/web/src/app/receitas/[recipeId]/informacoes/product-information-fields.tsx');
  const { ProductInformationSection } = load('apps/web/src/app/receitas/[recipeId]/informacoes/product-information-section.tsx');
  const oldPdf = load('apps/web/src/lib/final-label/pdf.ts');
  const tablePdf = load('apps/web/src/lib/nutrition-table/export.ts');
  const before = { recipes: recipes.length, ingredients: ingredients.length, items: items.length };
  const source = { ...ingredient, id: 'product-source', name: 'Ingrediente conferido', allergenStatus: 'KNOWN', allergens: ['Leite', 'TRIGO'], containsGluten: true, containsLactose: true };
  const information = { regulatoryCategory: 'OUTSIDE_ANNEX_XVI', packagingCondition: 'PACKAGED_IN_ABSENCE_OF_CONSUMER',
    mainPanelWidthCm: '5', mainPanelHeightCm: '17', glutenStatus: 'CONTAINS', lactoseStatus: 'CONTAINS', crossContaminationRisk: 'NO', reviewed: 'on' };
  const yieldData = { yieldMode: 'BULK', finalYieldAmount: '200' };
  const packageData = { netQuantity: '200', netQuantityUnit: 'GRAM', servingSize: '50', servingUnit: 'GRAM', householdMeasure: '1/4 embalagem' };
  const expectBlocked = recipe => {
    const preview = compositor.composeFinalLabelPreview(recipe, null);
    assert.equal(oldPdf.assessFinalLabelPdf(preview, 'CINTA').allowed, false);
    assert.equal(tablePdf.assessNutritionTablePdf(preview).allowed, false);
  };
  try {
    ingredients.push(source);
    const recipe = await repo.createRecipe('owner', { name: 'Produto em conferência', physicalState: 'SOLID_OR_SEMISOLID', finalYieldUnit: 'GRAM' });
    items.push({ id: 'product-item', recipeId: recipe.id, ingredientId: source.id, amount: 200, unit: 'GRAM' });
    const current = () => hydrate(recipe);
    let model = buildProductInformationModel(current());
    assert.equal(JSON.stringify(model.knownAllergens), JSON.stringify(['LEITE', 'TRIGO']));
    assert.equal(model.gluten.value, 'CONTAINS'); assert.equal(model.lactose.value, 'CONTAINS');
    assert.equal(model.reviewed, false);
    const initial = harness(ProductInformationFields, { model });
    let tree = initial.render();
    assert(!elements(tree).some(e => e.props.name === 'confirmedAllergens' && e.props.type === 'checkbox'), 'No per-allergen confirmations');
    assert.equal(field(tree, 'glutenStatus').props.type, 'hidden');
    assert.equal(field(tree, 'lactoseStatus').props.type, 'hidden');
    assert.equal(field(tree, 'reviewed').props.checked, false);
    assert(elements(tree).some(e => e.props.children === 'Informações e alergênicos'));
    const section = ProductInformationSection({ recipe: current() });
    assert(elements(section).some(e => e.props.id === 'enquadramento'), 'Lupa classification is retained');

    const unsaved = JSON.stringify(recipe);
    await assert.rejects(repo.updateRecipeProductSetup('owner', recipe.id, yieldData, packageData, { ...information, reviewed: '' }), error => error.code === 'missing-review-confirmation');
    assert.equal(JSON.stringify(recipe), unsaved, 'No partial yield/packaging save when review fails');
    await assert.rejects(repo.updateRecipeProductSetup('owner', recipe.id, yieldData, packageData, { ...information, glutenStatus: 'DOES_NOT_CONTAIN' }), error => error.code === 'invalid-information');
    await assert.rejects(repo.updateRecipeProductSetup('owner', recipe.id, yieldData, packageData, { ...information, lactoseStatus: 'DOES_NOT_CONTAIN' }), error => error.code === 'invalid-information');
    assert.equal(JSON.stringify(recipe), unsaved);
    await assert.rejects(repo.updateRecipeProductSetup('other', recipe.id, yieldData, packageData, information), error => error.code === 'recipe-not-found');

    const destination = await action(actions.updateRecipeProductSetupAction, { recipeId: recipe.id, productInformation: 'on', ...yieldData, ...packageData, ...information });
    assert.equal(destination, '/rotulo-final?recipeId=' + recipe.id);
    assert.equal(JSON.stringify(recipe.confirmedAllergens), JSON.stringify(['LEITE', 'TRIGO']), 'Source allergen list is resolved server-side');
    assert.equal(recipe.finalYieldAmount, 200); assert.equal(recipe.servingSize, 50);
    assert.equal(recipe.householdMeasure, '1/4 embalagem', 'Unit is not substituted for serving');
    let preview = compositor.composeFinalLabelPreview(current(), null);
    assert.equal(preview.status, 'READY');
    assert.equal(tablePdf.assessNutritionTablePdf(preview).allowed, true);
    assert.equal(oldPdf.assessFinalLabelPdf(preview, 'CINTA').allowed, true);
    model = buildProductInformationModel(current());
    assert(model.reviewed); assert(model.gluten.verified); assert(model.lactose.verified);
    const saved = harness(ProductInformationFields, { model });
    tree = saved.render();
    assert.equal(field(tree, 'reviewed').props.type, 'hidden', 'No repeated confirmation for verified data');
    assert(!elements(tree).some(e => ['glutenStatus', 'lactoseStatus'].includes(e.props.name) && e.props.type === 'radio'));
    const editGluten = elements(tree).find(e => e.type === 'button' && JSON.stringify(e.props.children).includes('glúten'));
    editGluten.props.onClick(); tree = saved.render();
    assert.equal(field(tree, 'reviewed').props.type, 'checkbox');
    assert.equal(field(tree, 'reviewed').props.checked, false);
    assert(elements(tree).some(e => e.props.name === 'glutenStatus' && e.props.value === 'DOES_NOT_CONTAIN' && e.props.disabled));
    field(tree, 'reviewed').props.onChange({ target: { checked: true } }); tree = saved.render();
    assert.equal(field(tree, 'reviewed').props.checked, true);
    tree.props.onChangeCapture({ target: { name: 'mainPanelWidthCm' } }); tree = saved.render();
    assert.equal(field(tree, 'reviewed').props.checked, false, 'Editing classification requires a fresh review');

    // Existing confirmations and extra declarations survive reopening and saving.
    const prepared = prepareProductInformationInput(current(), { ...information, confirmedAllergens: [], additionalAllergens: 'AMENDOIM' });
    await repo.updateRecipeInformation('owner', recipe.id, prepared);
    model = buildProductInformationModel(current());
    assert(model.additionalAllergens.includes('AMENDOIM'));
    const extras = harness(ProductInformationFields, { model }); tree = extras.render();
    assert.equal(field(tree, 'additionalAllergens').props.value, 'AMENDOIM');
    elements(tree).find(e => e.type === 'button' && e.props.children === 'Revisar ou acrescentar alergênicos').props.onClick(); tree = extras.render();
    assert.equal(field(tree, 'additionalAllergens').props.defaultValue, 'AMENDOIM');
    assert.equal(field(tree, 'reviewed').props.checked, false);

    const unknownRecipe = { ...current(), ingredients: [{ ...current().ingredients[0], ingredient: { ...source, allergenStatus: 'UNKNOWN', allergens: [], containsGluten: null, containsLactose: null } }] };
    model = buildProductInformationModel(unknownRecipe);
    assert.equal(model.unknownIngredients.length, 1); assert.equal(model.allSourcesDeclareNone, false);
    expectBlocked(unknownRecipe);
    const freshUnknown = { ...unknownRecipe, informationReviewedAt: null, glutenStatus: null, lactoseStatus: null, crossContaminationRisk: null };
    model = buildProductInformationModel(freshUnknown);
    assert.equal(model.gluten.value, 'NEEDS_REVIEW'); assert.equal(model.lactose.value, 'NEEDS_REVIEW');
    const unknownUi = harness(ProductInformationFields, { model }); tree = unknownUi.render();
    assert(!elements(tree).some(e => ['glutenStatus', 'lactoseStatus'].includes(e.props.name) && e.props.value === 'DOES_NOT_CONTAIN' && e.props.defaultChecked));
    assert(JSON.stringify(tree).includes('Conferir ingrediente'));
    const declaredNone = { ...freshUnknown, ingredients: [{ ...freshUnknown.ingredients[0], ingredient: { ...source, allergenStatus: 'NONE', allergens: [], containsGluten: false, containsLactose: false } }] };
    model = buildProductInformationModel(declaredNone);
    assert(model.allSourcesDeclareNone); assert.equal(model.unknownIngredients.length, 0);
    assert.equal(model.gluten.value, 'NEEDS_REVIEW', 'Source absence does not preconfirm final product absence');
    assert.equal(model.lactose.value, 'NEEDS_REVIEW');
    const conflicting = { ...current(), glutenStatus: 'DOES_NOT_CONTAIN', lactoseStatus: 'DOES_NOT_CONTAIN' };
    model = buildProductInformationModel(conflicting);
    assert.equal(model.gluten.verified, false); assert.equal(model.lactose.verified, false); assert.equal(model.reviewed, false);
    const pendingModel = buildProductInformationModel({ ...current(), glutenStatus: 'NEEDS_REVIEW', lactoseStatus: 'NEEDS_REVIEW' });
    assert.equal(pendingModel.gluten.value, 'NEEDS_REVIEW', 'An explicit pending review is never auto-cleared');
    assert.equal(pendingModel.lactose.value, 'NEEDS_REVIEW');

    for (const overrides of [
      { glutenStatus: 'NEEDS_REVIEW' }, { lactoseStatus: 'NEEDS_REVIEW' },
      { crossContaminationRisk: 'UNKNOWN' }, { crossContaminationRisk: null },
      { crossContaminationRisk: 'YES', crossContaminationAllergens: [] }, { informationReviewedAt: null }
    ]) expectBlocked({ ...current(), ...overrides });
    await repo.updateRecipeInformation('owner', recipe.id, { ...information, crossContaminationRisk: 'YES', crossContaminationAllergens: 'CASTANHAS' });
    preview = compositor.composeFinalLabelPreview(current(), null);
    assert.equal(preview.crossContaminationAllergens[0], 'CASTANHAS');
    assert.equal(tablePdf.assessNutritionTablePdf(preview).allowed, true);
    const unchanged = JSON.stringify(recipe);
    const failure = await action(actions.updateRecipeProductSetupAction, { recipeId: recipe.id, productInformation: 'on', ...yieldData, ...packageData, ...information, reviewed: '', finalYieldAmount: 300 });
    assert(failure.includes('/rendimento?status=revisao'));
    assert.equal(JSON.stringify(recipe), unchanged);
    const productPage = await load('apps/web/src/app/receitas/[recipeId]/rendimento/page.tsx').default({ params: Promise.resolve({ recipeId: recipe.id }) });
    assert(elements(productPage).some(e => e.type === ProductInformationSection));
    const originalHooks = Object.fromEntries(['useState', 'useRef', 'useEffect'].map(name => [name, mocks.react[name]]));
    try {
      for (const name of Object.keys(originalHooks)) mocks.react[name] = React[name];
      const html = renderToStaticMarkup(productPage);
      assert.equal((html.match(/<form\b/g) ?? []).length, 2, 'Product setup and code creation use separate forms');
      assert(html.indexOf('id="codigo-interno"') > html.indexOf('</form>'), 'Barcode area is outside the product form');
      assert.equal((html.match(/name="reviewed"/g) ?? []).length, 1, 'One consolidated review field');
      assert(html.includes('Informações e alergênicos'));
      assert(html.includes('Contato'));
      assert(!html.includes('name="confirmedAllergens" type="checkbox"'));
      if (process.env.PRODUCT_INFORMATION_PREVIEW) require('node:fs').writeFileSync(process.env.PRODUCT_INFORMATION_PREVIEW, html);
    } finally {
      Object.assign(mocks.react, originalHooks);
    }
  } finally {
    recipes.splice(before.recipes); ingredients.splice(before.ingredients); items.splice(before.items);
  }
  console.log('PRODUCT INFORMATION LOCAL OK: source KNOWN/NONE/UNKNOWN, consolidated confirmation, saved declarations without repeated questions, editable data/review reset, gluten/lactose contradictions, process risk and both PDF guards, ownership and atomic combined save; no DB connection.');
};

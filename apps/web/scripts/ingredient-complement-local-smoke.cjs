/* eslint-disable @typescript-eslint/no-require-imports -- Isolated real-module test: all database and auth calls are mocked. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../..');
const appRequire = createRequire(path.join(root, 'apps/web/package.json'));
const ts = appRequire('typescript');
const React = appRequire('react');
const { renderToStaticMarkup } = appRequire('react-dom/server');
const cache = new Map();
let owner = 'A', fault = null, creates = 0, mutations = 0;
let state;
class Redirect extends Error { constructor(url) { super('redirect'); this.url = url; } }
const hydrate = recipe => recipe ? { ...recipe, ingredients: state.items.filter(item => item.recipeId === recipe.id).map(item => ({ ...item, ingredient: state.ingredients.find(ingredient => ingredient.id === item.ingredientId) })) } : null;
const findItem = where => state.items.find(item => item.id === where.id && item.recipeId === where.recipeId && state.recipes.some(recipe => recipe.id === item.recipeId && recipe.userId === where.recipe.userId));
const tx = {
  recipeIngredient: {
    findFirst: async ({ where }) => { const item = findItem(where); return item ? { ...item, ingredient: state.ingredients.find(ingredient => ingredient.id === item.ingredientId) } : null; },
    updateMany: async ({ where, data }) => {
      mutations++;
      if (fault === 'replace-error') throw Error('Simulated replacement failure');
      const item = findItem(where);
      if (fault === 'cas' || !item || item.ingredientId !== where.ingredientId) return { count: 0 };
      Object.assign(item, data); return { count: 1 };
    }
  },
  ingredient: { create: async ({ data }) => {
    creates++;
    if (fault === 'create') throw Error('Simulated create failure');
    const row = { id: `private-${creates}`, ...data }; state.ingredients.push(row); return row;
  } },
  recipe: { updateMany: async ({ where, data }) => {
    if (fault === 'review') throw Error('Simulated review failure');
    const row = state.recipes.find(recipe => recipe.id === where.id && recipe.userId === where.userId);
    if (!row) return { count: 0 };
    Object.assign(row, data); return { count: 1 };
  } }
};
let queue = Promise.resolve();
const prisma = {
  recipe: { findFirst: async ({ where }) => hydrate(state.recipes.find(recipe => recipe.id === where.id && recipe.userId === where.userId)) },
  $transaction: (callback, options) => {
    assert.equal(JSON.stringify(options), JSON.stringify({ isolationLevel: 'Serializable', maxWait: 10000, timeout: 15000 }));
    const operation = queue.then(async () => {
      const before = JSON.stringify(state);
      try { return await callback(tx); } catch (error) { state = JSON.parse(before); throw error; }
    });
    queue = operation.catch(() => {}); return operation;
  }
};
const mocks = {
  '@rotula-facil-pro/db': { prisma },
  '@/lib/auth/session': { requireUser: async () => ({ id: owner }) },
  '@/lib/barcodes/repository': { findBarcodeByRecipe: async () => null },
  '@/lib/barcodes/render': { renderBarcodeSvg: () => ({ status: 'UNAVAILABLE' }) },
  'next/navigation': { redirect: url => { throw new Redirect(url); } },
  'next/link': ({ children, ...props }) => React.createElement('a', props, children),
  react: { ...React, useState: initial => [initial, () => {}], useActionState: action => [{ error: null }, action, false] },
  'react-dom': { useFormStatus: () => ({ pending: false }) }
};
function load(file) {
  const absolute = path.resolve(root, file);
  if (cache.has(absolute)) return cache.get(absolute);
  const exports = {}; cache.set(absolute, exports);
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const resolve = base => [base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(fs.existsSync);
  vm.runInNewContext(code, { exports, FormData, URLSearchParams, Date, Buffer, console, require: id => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('@rotula-facil-pro/db')) {
      if (id === '@rotula-facil-pro/db/allergens') return load('packages/db/src/allergens.ts');
      throw Error('Real DB access forbidden');
    }
    const local = id.startsWith('@/') ? resolve(path.join(root, 'apps/web/src', id.slice(2))) : id.startsWith('.') ? resolve(path.resolve(path.dirname(absolute), id)) : null;
    return local ? load(path.relative(root, local)) : appRequire(id);
  } }, { filename: absolute });
  return exports;
}
const nutrients = load('apps/web/src/lib/ingredients/nutrition.ts').ingredientNutrientFields;
const source = { id: 'shared', name: 'Ingrediente', normalizedName: 'ingrediente', source: 'BASE_ROTULA', userId: null,
  category: 'Teste', dataOrigin: 'TACO', dataOriginUrl: null, sourceCode: 'T1', sourceVersion: 'v1', sourceDescription: 'Original', notes: 'Preservar',
  baseQuantity: '100.00', baseUnit: 'GRAM', allergens: [], allergenStatus: 'UNKNOWN', containsGluten: null, containsLactose: false,
  ...Object.fromEntries(nutrients.map(field => [field, '0.00'])), caloriesKcal: '200.00', sugarsG: null, addedSugarsG: null };
const recipe = { id: 'rA', userId: 'A', name: 'Receita', physicalState: 'SOLID_OR_SEMISOLID', finalYieldAmount: 100, finalYieldUnit: 'GRAM', unitWeight: 50,
  netQuantity: 50, netQuantityUnit: 'GRAM', servingSize: 50, servingsPerPackage: 1, householdMeasure: '1 unidade', isIndividualPackage: true,
  confirmedAllergens: [], glutenStatus: 'DOES_NOT_CONTAIN', lactoseStatus: 'DOES_NOT_CONTAIN', crossContaminationRisk: 'NO', crossContaminationAllergens: [],
  informationReviewedAt: '2026-10-01', regulatoryCategory: 'OUTSIDE_ANNEX_XVI', packagingCondition: 'PACKAGED_IN_ABSENCE_OF_CONSUMER', mainPanelWidthCm: 5, mainPanelHeightCm: 17 };
function reset() {
  state = JSON.parse(JSON.stringify({ ingredients: [source, { ...source, id: 'custom', source: 'CUSTOM', userId: 'A' }, { ...source, id: 'foreign', source: 'CUSTOM', userId: 'B' }],
    recipes: [recipe, { ...recipe, id: 'rA2' }, { ...recipe, id: 'rB', userId: 'B' }],
    items: [{ id: 'iA', recipeId: 'rA', ingredientId: 'shared', amount: '25.00', unit: 'GRAM' }, { id: 'iA2', recipeId: 'rA2', ingredientId: 'shared', amount: '40.00', unit: 'GRAM' }, { id: 'iB', recipeId: 'rB', ingredientId: 'shared', amount: '30.00', unit: 'GRAM' }] }));
  owner = 'A'; fault = null; creates = 0; mutations = 0;
}
function form(values = {}) {
  const result = new FormData();
  for (const [key, value] of Object.entries({ sourceKind: 'LABEL', sourceReference: 'Fabricante, produto, rótulo 2026', sameProduct: 'on', sugarsG: '12,30', ...values })) result.set(key, value);
  return result;
}
const domain = load('apps/web/src/lib/ingredients/complement.ts');
const repository = load('apps/web/src/lib/ingredients/complement-repository.ts');
const save = (input = form(), expected = 'shared') => repository.completeRecipeIngredient('A', 'rA', 'iA', expected, input);
async function main() {
  reset();
  assert.throws(() => domain.buildIngredientComplement(source, form({ sourceReference: '' })), error => error.code === 'source');
  assert.throws(() => domain.buildIngredientComplement(source, form({ sameProduct: '' })), error => error.code === 'source');
  for (const value of ['-1', 'NaN', 'Infinity', '<0.5', '1e2']) assert.throws(() => domain.buildIngredientComplement(source, form({ sugarsG: value })), error => error.code === 'number');
  for (const value of ['0.001', '100000000']) assert.throws(() => domain.buildIngredientComplement(source, form({ sugarsG: value })), error => error.code === 'precision');
  assert.throws(() => domain.buildIngredientComplement(source, form({ sugarsG: '' })), error => error.code === 'unchanged');
  assert.throws(() => domain.buildIngredientComplement(source, form({ allergenStatus: 'NONE' })), error => error.code === 'declaration');
  for (const values of [{ allergenStatus: 'KNOWN', allergens: '' }, { allergenStatus: 'UNKNOWN', allergens: 'LEITE' }, { allergenStatus: 'NONE', allergens: 'LEITE' }]) {
    assert.throws(() => domain.buildIngredientComplement(source, form({ ...values, declarationConfirmed: 'on' })), error => error.code === 'declaration');
  }
  assert.equal(domain.buildIngredientComplement(source, form({ allergenStatus: 'NONE', declarationConfirmed: 'on' })).data.allergenStatus, 'NONE');
  const known = domain.buildIngredientComplement({ ...source, allergenStatus: 'KNOWN', allergens: ['LEITE'], containsGluten: false }, form({ allergenStatus: 'NONE', containsGluten: 'yes', containsLactose: 'yes' })).data;
  assert.equal(JSON.stringify(known.allergens), JSON.stringify(['LEITE'])); assert.equal(known.allergenStatus, 'KNOWN');
  assert.equal(known.containsGluten, false); assert.equal(known.containsLactose, false);

  const beforeIngredients = JSON.stringify(state.ingredients), beforeOther = JSON.stringify([state.recipes[1], state.recipes[2], state.items[1], state.items[2]]);
  const calculate = load('apps/web/src/lib/nutrition/calculator.ts').calculateRecipeNutrition;
  const rawBefore = calculate(hydrate(state.recipes[0]));
  const copyId = await save(form({ caloriesKcal: '999', totalFatG: '999', containsLactose: 'yes' }));
  const copy = state.ingredients.find(value => value.id === copyId);
  assert.equal(copy.source, 'CUSTOM'); assert.equal(copy.userId, 'A');
  assert.equal(copy.sugarsG, '12.3'); assert.equal(copy.addedSugarsG, null);
  assert.equal(copy.caloriesKcal, '200.00'); assert.equal(copy.totalFatG, '0.00');
  assert.equal(copy.allergenStatus, 'UNKNOWN'); assert.equal(copy.containsGluten, null); assert.equal(copy.containsLactose, false);
  assert.equal(copy.notes, source.notes); assert(copy.sourceDescription.includes('Original') && copy.sourceDescription.includes('Fabricante'));
  assert.equal(JSON.stringify(state.ingredients.filter(value => value.id !== copyId)), beforeIngredients);
  assert.equal(JSON.stringify([state.recipes[1], state.recipes[2], state.items[1], state.items[2]]), beforeOther);
  assert.equal(state.items[0].id, 'iA'); assert.equal(state.items[0].amount, '25.00'); assert.equal(state.items[0].unit, 'GRAM');
  assert.equal(state.recipes[0].informationReviewedAt, recipe.informationReviewedAt, 'Nutrition-only changes preserve review');
  const rawAfter = calculate(hydrate(state.recipes[0]));
  for (const field of nutrients.filter(field => field !== 'sugarsG')) assert.equal(JSON.stringify(rawAfter.nutrients[field]), JSON.stringify(rawBefore.nutrients[field]));
  assert.equal(rawAfter.nutrients.sugarsG.recipeTotal, 3.075); assert.equal(rawAfter.nutrients.sugarsG.per100, 3.075); assert.equal(rawAfter.nutrients.sugarsG.perUnit, 1.5375);
  assert.equal(rawAfter.nutrients.addedSugarsG.isComplete, false);
  const compositor = load('apps/web/src/lib/final-label/preview.ts');
  const preview = compositor.composeFinalLabelPreview(hydrate(state.recipes[0]), null);
  assert.equal(preview.allergenStatus, 'UNKNOWN');
  const pdf = load('apps/web/src/lib/final-label/pdf.ts');
  assert.equal(pdf.assessFinalLabelPdf(preview, 'POUCH').allowed, false);
  assert(preview.ingredientCompletions.find(item => item.itemId === 'iA').missing.includes('Açúcares adicionados (g)'));
  const afterSave = JSON.stringify(state);
  await assert.rejects(save(), error => error.code === 'stale'); assert.equal(JSON.stringify(state), afterSave);

  reset(); state.items[0].ingredientId = 'custom'; state.items[1].ingredientId = 'custom';
  const privateBefore = JSON.stringify(state.ingredients[1]);
  const newPrivate = await save(form(), 'custom');
  assert.equal(state.items[1].ingredientId, 'custom'); assert.equal(JSON.stringify(state.ingredients[1]), privateBefore);
  assert.notEqual(newPrivate, 'custom');

  reset();
  await assert.rejects(repository.completeRecipeIngredient('B', 'rA', 'iA', 'shared', form()), error => error.code === 'denied');
  await assert.rejects(repository.completeRecipeIngredient('A', 'rB', 'iB', 'shared', form()), error => error.code === 'denied');
  await assert.rejects(repository.completeRecipeIngredient('A', 'rA2', 'iA', 'shared', form()), error => error.code === 'denied');
  state.items[0].ingredientId = 'foreign';
  await assert.rejects(save(form(), 'foreign'), error => error.code === 'denied');
  assert.equal(creates, 0); assert.equal(mutations, 0);

  for (const failure of ['create', 'replace-error', 'cas', 'review']) {
    reset(); const snapshot = JSON.stringify(state); fault = failure;
    await assert.rejects(save(form({ containsGluten: 'yes' })));
    assert.equal(JSON.stringify(state), snapshot, `Full rollback: ${failure}`);
  }
  reset();
  const concurrent = await Promise.allSettled([save(), save()]);
  assert.equal(concurrent.filter(value => value.status === 'fulfilled').length, 1);
  assert.equal(concurrent.filter(value => value.status === 'rejected').length, 1);
  assert.equal(state.ingredients.length, 4); assert.equal(creates, 1);

  reset();
  const actions = load('apps/web/src/lib/ingredients/complement-actions.ts');
  const submit = form({ recipeId: 'rA', itemId: 'iA', ingredientId: 'shared', format: 'POUCH', template: 'CLEAN', containsGluten: 'yes', allergenStatus: 'KNOWN', allergens: 'LEITE, TRIGO', declarationConfirmed: 'on' });
  const otherRecipeSnapshot = JSON.stringify(state.recipes[1]);
  await assert.rejects(actions.completeRecipeIngredientAction({ error: null }, submit), error => error instanceof Redirect && error.url === '/rotulo-final?recipeId=rA&format=POUCH&template=CLEAN');
  assert.equal(state.recipes[0].informationReviewedAt, null); assert.equal(JSON.stringify(state.recipes[1]), otherRecipeSnapshot);
  assert.equal(JSON.stringify(state.ingredients.at(-1).allergens), JSON.stringify(['LEITE', 'TRIGO']));
  const updatedPreview = compositor.composeFinalLabelPreview(hydrate(state.recipes[0]), null);
  assert(updatedPreview.issues.some(issue => issue.code === 'MISSING_REQUIRED_DECLARATION'));
  assert.equal(pdf.assessFinalLabelPdf(updatedPreview, 'POUCH').allowed, false);
  const stale = await actions.completeRecipeIngredientAction({ error: null }, submit);
  assert(stale.error.includes('já complementado')); assert.equal(state.ingredients.length, 4);
  reset(); owner = 'B';
  assert((await actions.completeRecipeIngredientAction({ error: null }, submit)).error.includes('conta'));
  assert.equal(creates, 0);

  reset();
  const Page = load('apps/web/src/app/receitas/[recipeId]/ingredientes/[itemId]/completar/page.tsx').default;
  const page = await Page({ params: Promise.resolve({ recipeId: 'rA', itemId: 'iA' }), searchParams: Promise.resolve({ format: 'POUCH', template: 'CLEAN' }) });
  const html = renderToStaticMarkup(page);
  assert(html.includes('name="sugarsG"') && html.includes('name="addedSugarsG"'));
  assert(!html.includes('name="caloriesKcal"') && !html.includes('name="totalFatG"') && !html.includes('name="containsLactose"'));
  assert(html.includes('200.00') && html.includes('0.00'));
  assert(html.includes('value="POUCH"') && html.includes('value="CLEAN"') && html.includes('Não tenho essa informação'));
  assert(html.includes('name="sourceReference"') && html.includes('name="sameProduct"'));
  owner = 'B';
  const deniedHtml = renderToStaticMarkup(await Page({ params: Promise.resolve({ recipeId: 'rA', itemId: 'iA' }) }));
  assert(!deniedHtml.includes('name="sugarsG"') && deniedHtml.includes('Ingrediente não encontrado'));
  assert.equal(creates, 0, 'Viewing forms never creates ingredients');
  console.log('COMPLEMENT LOCAL OK: partial fields, source, precision, null/zero and known declarations, private BASE/CUSTOM copies, selected recipe only, ownership, CAS/repeat/concurrent mock, full rollback, real nutrition regression, UNKNOWN/PDF guards, review invalidation, same model/format return, rendered form. No database connection.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

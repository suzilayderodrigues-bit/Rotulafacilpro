/* eslint-disable @typescript-eslint/no-require-imports -- Isolated real-module harness; DB and auth are mocked. */
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
let hooks;
let userId = 'owner';
let failCreation = false;
let used = 0;
const recipes = [], items = [], barcodes = [];
const mocks = {}, modules = new Map();
let fetchCalls = 0;
class Redirect extends Error { constructor(url) { super('redirect'); this.url = url; } }
class EntitlementError extends Error { constructor(code) { super(code); this.code = code; } }
function load(file) {
  const absolute = path.resolve(root, file);
  if (modules.has(absolute)) return modules.get(absolute);
  const exports = {};
  modules.set(absolute, exports);
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true
  }}).outputText;
  function resolveFile(base) { return [base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(fs.existsSync); }
  vm.runInNewContext(code, { exports, Date, Math, Number, String, Set, Map, Buffer, URL, URLSearchParams, FormData, Request, Response, AbortController, console, setTimeout, clearTimeout,
    fetch: async (url, { signal }) => {
      fetchCalls++;
      assert(!signal.aborted);
      const route = load('apps/web/src/app/receitas/[recipeId]/ingredientes/busca/route.ts');
      return route.GET(new Request(`https://example.invalid${url}`), { params: Promise.resolve({ recipeId: recipes[0].id }) });
    },
    require: id => {
      if (id in mocks) return mocks[id];
      if (id === '@rotula-facil-pro/db') throw Error('Real DB imports are forbidden');
      if (id === '@rotula-facil-pro/db/allergens') return load('packages/db/src/allergens.ts');
      const local = id.startsWith('@/') ? resolveFile(path.join(root, 'apps/web/src', id.slice(2))) : id.startsWith('.') ? resolveFile(path.resolve(path.dirname(absolute), id)) : null;
      return local ? load(path.relative(root, local)) : appRequire(id);
    }
  }, { filename: absolute });
  return exports;
}
function matches(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'AND') return value.every(part => matches(row, part));
    if (key === 'OR') return value.some(part => matches(row, part));
    if (value && typeof value === 'object' && 'startsWith' in value) return row[key].toLowerCase().startsWith(value.startsWith.toLowerCase());
    return row[key] === value;
  });
}
const nutritionFields = load('apps/web/src/lib/nutrition/calculator.ts').nutritionNutrientFields;
const ingredient = { id: 'base', name: 'Maçã', normalizedName: 'maca', category: 'Frutas', source: 'BASE_ROTULA', userId: null,
  baseQuantity: 100, baseUnit: 'GRAM', allergens: [], allergenStatus: 'UNKNOWN', containsGluten: null, containsLactose: null,
  ...Object.fromEntries(nutritionFields.map(key => [key, 0])), caloriesKcal: 200, carbohydratesG: 30, proteinsG: 4 };
const ingredients = [ingredient, { ...ingredient, id: 'own', name: 'Manteiga', normalizedName: 'manteiga', source: 'CUSTOM', userId: 'owner' },
  { ...ingredient, id: 'foreign', name: 'Massa secreta', normalizedName: 'massa secreta', source: 'CUSTOM', userId: 'other' },
  { ...ingredient, id: 'middle', name: 'Doce de maçã', normalizedName: 'doce de maca' },
  ...Array.from({ length: 45 }, (_, index) => ({ ...ingredient, id: `bulk-${index}`, name: `Mel ${String(index).padStart(2, '0')}`, normalizedName: `mel ${String(index).padStart(2, '0')}` }))];
const originalIngredients = JSON.stringify(ingredients);
function hydrate(row) {
  return row ? { ...row, _count: { ingredients: items.filter(item => item.recipeId === row.id).length },
    ingredients: items.filter(item => item.recipeId === row.id).map(item => ({ ...item, ingredient: ingredients.find(i => i.id === item.ingredientId) })) } : null;
}
const prisma = {
  ingredient: { findFirst: async ({ where }) => ingredients.find(row => matches(row, where)) ?? null,
    findMany: async ({ where, skip = 0, take = ingredients.length, select }) => ingredients.filter(row => matches(row, where)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id)).slice(skip, skip + take).map(row => select ? Object.fromEntries(Object.keys(select).map(key => [key, row[key]])) : row) },
  recipe: {
    create: async ({ data }) => { const row = { id: `recipe-${recipes.length}`, netQuantity: null, netQuantityUnit: null, servingSize: null, householdMeasure: null,
      isIndividualPackage: false, servingsPerPackage: null, confirmedAllergens: [], crossContaminationAllergens: [], glutenStatus: null, lactoseStatus: null, crossContaminationRisk: null,
      mainPanelWidthCm: null, mainPanelHeightCm: null, packagingCondition: null, informationReviewedAt: null, ...data }; recipes.push(row); return row; },
    findFirst: async ({ where }) => hydrate(recipes.find(row => matches(row, where))),
    update: async ({ where, data }) => { const row = recipes.find(row => matches(row, where)); assert(row); Object.assign(row, data); return hydrate(row); }
  },
  recipeIngredient: {
    findUnique: async ({ where }) => items.find(row => matches(row, where.recipeId_ingredientId)) ?? null,
    create: async ({ data }) => { const row = { id: `item-${items.length}`, ...data }; items.push(row); return row; }
  },
  barcode: { findFirst: async ({ where }) => barcodes.find(row => matches(row, where)) ?? null }
};
mocks['@rotula-facil-pro/db'] = { prisma };
mocks['@/lib/auth/session'] = { requireUser: async () => ({ id: userId }), getCurrentUser: async () => ({ id: userId }) };
mocks['next/navigation'] = { redirect: url => { throw new Redirect(url); }, useRouter: () => ({ replace() {} }) };
mocks['next/link'] = { default: ({ children, ...props }) => React.createElement('a', props, children) };
mocks['./commercial'] = { BarcodeEntitlementError: EntitlementError, createBarcodeWithEntitlement: async (owner, draft, recipeId) => {
  if (failCreation) throw new EntitlementError('MONTHLY_LIMIT_REACHED');
  assert(recipes.some(row => row.id === recipeId && row.userId === owner));
  used++; const row = { id: `barcode-${barcodes.length}`, ...draft, userId: owner, recipeId }; barcodes.push(row); return row;
} };
mocks.react = { ...React, useState: value => hooks.state(value), useRef: value => hooks.ref(value), useEffect: (callback, deps) => hooks.effect(callback, deps) };
mocks['react-dom'] = { useFormStatus: () => ({ pending: false }) };
function harness(component, props) {
  const slots = [], effects = []; let cursor = 0;
  const api = {
    state(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    ref(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
    effect(callback, deps) { const index = cursor++; const previous = slots[index]; if (!previous || deps.some((value, i) => value !== previous.deps[i])) { previous?.cleanup?.(); slots[index] = { deps }; effects.push(() => { slots[index].cleanup = callback(); }); } },
    render() { cursor = 0; hooks = api; const tree = component(props); hooks = null; return tree; },
    flush() { while (effects.length) effects.shift()(); },
    cleanup() { slots.forEach(slot => slot?.cleanup?.()); }
  }; return api;
}
function elements(tree) {
  if (Array.isArray(tree)) return tree.flatMap(elements);
  if (!tree || typeof tree !== 'object' || !tree.props) return [];
  return [tree, ...elements(tree.props.children)];
}
function field(tree, name) { return elements(tree).find(element => element.props.name === name || element.props.id === name); }
async function action(fn, data) {
  try { await fn(new FormDataFromEntries(data)); assert.fail('Expected redirect'); } catch (error) { if (!(error instanceof Redirect)) throw error; return error.url; }
}
function FormDataFromEntries(data) { const form = new FormData(); for (const [key, value] of Object.entries(data)) form.set(key, String(value)); return form; }
async function main() {
  const repo = load('apps/web/src/lib/recipes/repository.ts');
  const actions = load('apps/web/src/lib/recipes/actions.ts');
  const ingredientRepo = load('apps/web/src/lib/ingredients/repository.ts');
  const domain = load('apps/web/src/lib/recipes/domain.ts');
  assert.equal((await ingredientRepo.searchAccessibleIngredients('owner', '', 0)).items.length, 20);
  const m = await ingredientRepo.searchAccessibleIngredients('owner', 'M', 0);
  assert(m.items.every(row => row.name.startsWith('M')));
  const ma = await ingredientRepo.searchAccessibleIngredients('owner', 'MA', 0);
  assert.deepEqual(ma.items.map(row => row.id).sort(), ['base', 'own']);
  assert.equal((await ingredientRepo.searchAccessibleIngredients('owner', 'maca', 0)).items[0].id, 'base');
  assert(!(await ingredientRepo.searchAccessibleIngredients('owner', '', 0)).items.some(row => row.id === 'foreign'));
  const first = await ingredientRepo.listIngredientPage('owner', 'base', '', undefined, 0);
  const next = await ingredientRepo.listIngredientPage('owner', 'base', '', undefined, 1);
  assert.equal(first.items.length, 30); assert(first.hasMore); assert(next.items.length > 0);
  assert(!next.items.some(row => first.items.some(previous => previous.id === row.id)));
  const createdUrl = await action(actions.createRecipeProductAction, { name: 'Produto pronto', physicalState: 'SOLID_OR_SEMISOLID', foodCategory: 'Teste' });
  const recipe = recipes[0]; assert(createdUrl.includes(recipe.id));
  await action(actions.addRecipeIngredientAction, { recipeId: recipe.id, ingredientId: ingredient.id, amount: 200, unit: 'GRAM' });
  await action(actions.updateRecipeYieldAction, { recipeId: recipe.id, yieldMode: 'UNITS', unitsProduced: 10, unitWeight: 15, finalYieldAmount: 999 });
  assert.equal(recipe.finalYieldAmount, 150); assert.equal(recipe.unitsProduced, 10); assert.equal(recipe.unitWeight, 15);
  assert.equal(recipes.length, 1);
  const raw = load('apps/web/src/lib/nutrition/calculator.ts').calculateRecipeNutrition(hydrate(recipe));
  assert.equal(raw.nutrients.caloriesKcal.recipeTotal, 400);
  assert(Math.abs(raw.nutrients.caloriesKcal.per100 - 400 / 150 * 100) < 1e-8);
  const compositor = load('apps/web/src/lib/final-label/preview.ts');
  const partial = await compositor.buildFinalLabelPreview(recipe.id, 'owner');
  assert.equal(partial.name, recipe.name); assert.equal(partial.ingredients[0], 'Maçã'); assert.equal(partial.status, 'INCOMPLETE');
  assert.equal(partial.nutritionTable.configurationRequired, true);
  assert.equal(await compositor.buildFinalLabelPreview(recipe.id, 'other'), null);
  await repo.updateRecipePackaging('owner', recipe.id, { netQuantity: 15, netQuantityUnit: 'GRAM', servingSize: 15, servingUnit: 'GRAM', householdMeasure: '1 unidade' });
  await action(actions.updateRecipeInformationAction, { recipeId: recipe.id, regulatoryCategory: 'OUTSIDE_ANNEX_XVI', packagingCondition: 'PACKAGED_IN_ABSENCE_OF_CONSUMER', mainPanelWidthCm: 5, mainPanelHeightCm: 17, reviewed: 'on', glutenStatus: 'DOES_NOT_CONTAIN', lactoseStatus: 'DOES_NOT_CONTAIN', crossContaminationRisk: 'NO' });
  const barcodeActions = load('apps/web/src/lib/barcodes/actions.ts');
  failCreation = true;
  const failedUrl = new URL(await action(barcodeActions.createInternalBarcodeAction, { recipeId: recipe.id }), 'https://example.invalid');
  assert.equal(failedUrl.searchParams.get('status'), 'limite-mensal'); assert.equal(failedUrl.searchParams.get('recipeId'), recipe.id); assert.equal(used, 0);
  failCreation = false;
  assert((await action(barcodeActions.createInternalBarcodeAction, { recipeId: recipe.id })).includes('interno-criado'));
  assert.equal(barcodes[0].recipeId, recipe.id); assert.equal(barcodes[0].type, 'INTERNAL'); assert.equal(barcodes[0].format, 'INTERNAL');
  const preview = await compositor.buildFinalLabelPreview(recipe.id, 'owner');
  assert.equal(preview.allergenStatus, 'UNKNOWN'); assert.equal(preview.status, 'REQUIRES_REVIEW'); assert.equal(preview.barcode.display.status, 'READY');
  const pdf = load('apps/web/src/lib/final-label/pdf.ts');
  assert.equal(pdf.assessFinalLabelPdf(preview, 'CINTA').allowed, false);
  assert.equal((await pdf.renderFinalLabelPdf(preview, 'CINTA', 'ESSENCIAL')).status, 'BLOCKED');
  assert.equal(pdf.assessFinalLabelPdf(partial, 'CINTA').allowed, false);
  const ready = compositor.composeFinalLabelPreview({ ...hydrate(recipe), ingredients: [{ ...hydrate(recipe).ingredients[0], ingredient: { ...ingredient, allergenStatus: 'NONE' } }] }, barcodes[0]);
  assert.equal(ready.status, 'READY');
  const renderedPdf = await pdf.renderFinalLabelPdf(ready, 'CINTA', 'ESSENCIAL');
  assert.equal(renderedPdf.status, 'READY');
  assert.equal(renderedPdf.buffer.subarray(0, 5).toString(), '%PDF-');
  const barcodeDomain = load('apps/web/src/lib/barcodes/domain.ts');
  const barcodeRender = load('apps/web/src/lib/barcodes/render.ts');
  for (const length of [8, 12, 13, 14]) {
    const body = '0' + '1'.repeat(length - 2);
    const value = body + barcodeDomain.calculateGtinCheckDigit(body);
    const draft = barcodeDomain.validateOfficialGtin(value);
    const graphic = barcodeRender.renderBarcodeSvg(draft);
    assert.equal(graphic.status, 'READY'); assert.equal(draft.value, value); assert.equal(draft.type, 'OFFICIAL_GTIN');
  }
  assert.equal(used, 1); assert.equal(barcodes.length, 1); assert.equal(JSON.stringify(ingredients), originalIngredients);
  const unknownNutrient = compositor.composeFinalLabelPreview({ ...hydrate(recipe), ingredients: [{ ...hydrate(recipe).ingredients[0], ingredient: { ...ingredient, sodiumMg: null } }] }, barcodes[0]);
  assert.equal(unknownNutrient.nutritionTable.rows.find(row => row.nutrient === 'sodiumMg').per100Value, null);
  const frame = load('apps/web/src/app/rotulo-final/visual-preview.tsx').VisualLabelFrame;
  const partialHtml = renderToStaticMarkup(React.createElement(frame, { preview: partial, format: 'CINTA', template: 'ESSENCIAL' }));
  assert(partialHtml.includes('Maçã') && partialHtml.includes('Valores disponíveis') && partialHtml.includes('Pendências obrigatórias'));
  const html = renderToStaticMarkup(React.createElement(frame, { preview, format: 'CINTA', template: 'CLEAN' }));
  assert(html.includes('INFORMAÇÃO NUTRICIONAL') && html.includes('Código interno') && html.includes('revisão obrigatória'));
  assert(!html.includes('overflow-hidden'));
  const bulk = domain.validateRecipeYieldInput({ yieldMode: 'BULK', finalYieldAmount: '1200,50', unitsProduced: 10, unitWeight: 15 });
  assert.equal(bulk.finalYieldAmount, 1200.5); assert.equal(bulk.unitsProduced, null); assert.equal(bulk.unitWeight, null);
  assert.throws(() => domain.validateRecipeYieldInput({ yieldMode: 'UNITS', unitsProduced: '1.5', unitWeight: 15 }));
  assert.throws(() => domain.validateRecipeYieldInput({ yieldMode: 'UNITS', unitsProduced: 10, unitWeight: '' }));
  assert.throws(() => domain.validateRecipeYieldInput({ yieldMode: 'BULK', finalYieldAmount: '' }));
  await assert.rejects(repo.updateRecipeYield('other', recipe.id, { yieldMode: 'BULK', finalYieldAmount: 500 }), error => error.code === 'recipe-not-found');
  const liquid = await repo.createRecipe('owner', { name: 'Bebida', physicalState: 'LIQUID', finalYieldUnit: 'MILLILITER' });
  items.push({ id: 'liquid-item', recipeId: liquid.id, ingredientId: ingredient.id, amount: 200, unit: 'GRAM' });
  await repo.updateRecipeYield('owner', liquid.id, { yieldMode: 'BULK', finalYieldAmount: 300 });
  assert.equal(recipes[1].finalYieldUnit, 'MILLILITER'); assert.equal(recipes[1].unitsProduced, null);
  const yieldForm = harness(load('apps/web/src/app/receitas/[recipeId]/rendimento/yield-form.tsx').YieldForm, { recipeId: recipe.id, unitLabel: 'g', finalYieldLabel: 'Peso final', unitWeightLabel: 'Peso de cada unidade', defaultFinalYieldAmount: '150', defaultUnitsProduced: '10', defaultUnitWeight: '15' });
  let tree = yieldForm.render(); assert(!field(tree, 'finalYieldAmount'));
  field(tree, 'unitWeight').props.onChange({ target: { value: '20' } }); tree = yieldForm.render();
  assert(JSON.stringify(tree).includes('200 g')); field(tree, 'yieldMode').props.onChange({ target: { value: 'BULK' } }); tree = yieldForm.render();
  assert(!field(tree, 'unitsProduced') && field(tree, 'finalYieldAmount'));
  const barcodeForm = harness(load('apps/web/src/app/codigo-de-barras/create-barcode-form.tsx').CreateBarcodeForm, { internal: true, recipes: [{ id: recipe.id, name: recipe.name }], initialRecipeId: undefined });
  tree = barcodeForm.render(); field(tree, 'recipeId').props.onChange({ target: { value: recipe.id } }); tree = barcodeForm.render();
  assert.equal(field(tree, 'recipeId').props.value, recipe.id); assert.equal(tree.props.action, barcodeActions.createInternalBarcodeAction);
  const selector = harness(load('apps/web/src/app/receitas/[recipeId]/ingredientes/ingredient-selector.tsx').IngredientSelector, { recipeId: recipe.id, addedIds: [], initialPage: m });
  tree = selector.render(); elements(tree).find(element => element.props.children === '+ Adicionar ingrediente').props.onClick({ currentTarget: { focus() {} } }); tree = selector.render();
  assert(JSON.stringify(tree).includes('Maçã'), 'List must be present on opening, before any fetch');
  selector.flush(); tree = selector.render(); assert.equal(fetchCalls, 0, 'Opening uses the prefetched first page immediately');
  field(tree, 'ingredient-search').props.onChange({ target: { value: 'MA' } }); tree = selector.render(); selector.flush();
  await new Promise(resolve => setTimeout(resolve, 300)); tree = selector.render();
  assert.equal(fetchCalls, 1); assert(JSON.stringify(tree).includes('Manteiga')); assert(!JSON.stringify(tree).includes('Mel 00'));
  field(tree, 'ingredient-search').props.onChange({ target: { value: '' } }); tree = selector.render(); selector.flush(); tree = selector.render();
  assert(JSON.stringify(tree).includes('Mel 00'), 'Clearing search restores unfiltered alphabetical list');
  elements(tree).find(element => element.props.onClick && JSON.stringify(element.props.children).includes('Maçã')).props.onClick(); tree = selector.render();
  assert.equal(field(tree, 'ingredientId').props.value, 'base'); assert(field(tree, 'amount').props.required);
  selector.cleanup();
  const barcodeSnapshot = JSON.stringify(barcodes);
  await compositor.buildFinalLabelPreview(recipe.id, 'owner');
  assert.equal(JSON.stringify(barcodes), barcodeSnapshot); assert.equal(used, 1);
  console.log('LOCAL OK: prefix M/MA/accent/clear; bounded alphabetical pages and ownership; create/add/yield/information/packaging/barcode/preview; units and bulk/liquid; controlled selection and failure redirect; UNKNOWN and null/PDF guards; progressive rendered content; no DB connection.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

/* eslint-disable @typescript-eslint/no-require-imports -- Local rendering test, no DB connection. */
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
const exportsObject = {};
const source = fs.readFileSync(path.join(root, 'apps/web/src/components/layout/recipe-steps.tsx'), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
  exports: exportsObject,
  encodeURIComponent,
  require: id => id === 'next/link' ? { __esModule: true, default: ({ children, prefetch, ...props }) => { assert.equal(prefetch, false); return React.createElement('a', props, children); } } : appRequire(id)
});
for (const current of [1, 2, 3]) {
  const html = renderToStaticMarkup(React.createElement(exportsObject.RecipeSteps, { current, recipeId: 'same-recipe', detail: 'Detalhe' }));
  for (const label of ['Minha receita', 'Meu produto', 'Meu rótulo']) assert(html.includes(label));
  assert.equal((html.match(/aria-current="step"/g) || []).length, 1);
  assert(html.includes('sm:grid-cols-3'));
  assert(html.includes('/receitas/same-recipe/ingredientes'));
  assert(html.includes('/receitas/same-recipe/rendimento'));
  assert(html.includes('/rotulo-final?recipeId=same-recipe'));
  assert(!html.includes('/receitas/nova'), 'Returning must not create another recipe');
}
const initial = renderToStaticMarkup(React.createElement(exportsObject.RecipeSteps, { current: 1, detail: 'Nome' }));
assert(!initial.includes('href='), 'No navigable recipe stages before the recipe exists');
const escaped = renderToStaticMarkup(React.createElement(exportsObject.RecipeSteps, { current: 2, recipeId: 'a/b?c', detail: 'Produto' }));
assert(escaped.includes('a%2Fb%3Fc'));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
for (const [file, stage] of [
  ['receitas/nova/page.tsx', 1],
  ['receitas/[recipeId]/ingredientes/page.tsx', 1], ['receitas/[recipeId]/rendimento/page.tsx', 2],
  ['receitas/[recipeId]/informacoes/page.tsx', 3], ['receitas/[recipeId]/page.tsx', 2], ['rotulo-final/page.tsx', 3]
]) {
  const page = read('apps/web/src/app/' + file);
  assert(page.includes(`RecipeSteps current={${stage}}`), file);
  assert(!page.includes('function Stepper()'), file);
  assert(page.includes('requireUser()'), 'Existing authenticated page retained');
}
const information = read('apps/web/src/app/receitas/[recipeId]/informacoes/page.tsx');
assert(read('apps/web/src/app/receitas/[recipeId]/editar/page.tsx').includes('return RecipeIngredientsStepPage({ params,'), 'Old edit route reuses the authenticated composition page');
for (const field of ['RegulatoryCategoryFields', 'RegulatoryPackagingFields', 'confirmedAllergens', 'glutenStatus', 'lactoseStatus', 'crossContaminationRisk', 'reviewed']) assert(information.includes(field));
const actions = read('apps/web/src/lib/recipes/actions.ts');
assert(actions.includes('redirect("/receitas/" + recipeId + "/informacoes")'));
assert(actions.includes('redirect("/receitas/" + recipeId)'));
console.log('OK: three stages, same recipe, mobile structure, authenticated routes and existing regulatory review preserved; no DB access.');

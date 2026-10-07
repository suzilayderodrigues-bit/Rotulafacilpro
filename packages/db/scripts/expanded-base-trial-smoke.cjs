/* eslint-disable @typescript-eslint/no-require-imports -- Isolated real-module harness: never imports a DB connection. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../..');
const ts = createRequire(path.join(root, 'packages/db/package.json'))('typescript');
function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  vm.runInNewContext(code, { exports, URL, Buffer, require: id => {
    if (id.startsWith('node:')) return require(id);
    if (!(id in mocks)) throw new Error(`Unexpected import: ${id}`);
    return mocks[id];
  } });
  return exports;
}
const allergy = load('packages/db/src/allergens.ts');
const core = load('packages/db/src/imports/expanded-base.ts', { '../allergens': allergy });
const historical = load('packages/db/src/imports/base-rotula-ingredients.ts');
const policy = load('packages/db/src/imports/expanded-base-trial.ts', {
  './base-rotula-ingredients': historical, '../allergens': allergy, './expanded-base': core
});
const adapter = load('packages/db/src/imports/expanded-base-trial-prisma.ts', {
  '../allergens': allergy, './expanded-base-trial': policy
});
const workbook = path.join(root, policy.trialPolicy.filename);
const bytes = fs.readFileSync(workbook);
const workbookHashBefore = policy.hash(bytes);
policy.verifyWorkbookBytes(path.basename(workbook), bytes);
assert.throws(() => policy.verifyWorkbookBytes('base-rotula-v1.xlsx', bytes));
assert.throws(() => policy.verifyWorkbookBytes(path.basename(workbook), Buffer.alloc(bytes.length)));
assert.throws(() => policy.verifyWorkbookBytes(path.basename(workbook), bytes.subarray(1)));
for (const invalid of [undefined, '', 'bad', 'postgresql://user:secret@production.neon.tech/neondb',
  `postgresql://user:secret@${policy.trialPolicy.hostname}:1111/neondb`,
  `postgresql://user:secret@${policy.trialPolicy.hostname}/neondb?host=production.neon.tech`,
  `postgresql://user:secret@${policy.trialPolicy.hostname}/neondb?options=endpoint%3Dother`,
  `postgresql://user:secret@${policy.trialPolicy.hostname}/neondb?sslmode=disable`]) {
  assert.throws(() => policy.validateTrialConnection(invalid));
}
assert(policy.validateTrialConnection(`postgresql://user:secret@${policy.trialPolicy.hostname}/neondb?sslmode=require`));
const extraction = JSON.parse(execFileSync(
  path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'),
  ['-B', path.join(root, 'packages/db/src/imports/read-expanded-base-trial.py'), workbook],
  { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, env: { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH, TEMP: process.env.TEMP, TMP: process.env.TMP } }
));
const clone = value => JSON.parse(JSON.stringify(value));
const baseline = {
  ingredients: historical.baseRotulaIngredientImportRows.map((input, i) => ({
    ...core.validateExpandedRow(input), id: `HIST-${String(i).padStart(2, '0')}`, source: 'BASE_ROTULA', userId: null,
    allergens: input.allergens ?? [], allergenStatus: null, sourceDescription: null,
    createdAt: '2026-08-28T00:00:00Z', updatedAt: '2026-08-28T00:00:00Z'
  })).concat([{ id: 'CUSTOM-1', source: 'CUSTOM', userId: 'USER-1', notes: 'preserve exactly', sodiumMg: null }]),
  users: [{ id: 'USER-1', name: 'synthetic', passwordHash: 'synthetic-not-real' }],
  recipes: [{ id: 'RECIPE-1', userId: 'USER-1', name: 'preserve exactly' }],
  barcodes: [{ id: 'BARCODE-1', userId: 'USER-1', recipeId: 'RECIPE-1', value: 'synthetic' }]
};
// All snapshots, including the synthetic baseline, follow the real adapter's ORDER BY id.
baseline.ingredients.sort((a, b) => a.id.localeCompare(b.id));
const plan = policy.prepareTrial(extraction, baseline);
assert.equal(plan.expected.length, 527);
assert(plan.expected.every(row => row.dataOrigin === 'TACO' && row.allergenStatus === 'UNKNOWN' && row.containsGluten === null && row.containsLactose === null));
assert.equal(plan.expected.reduce((sum, row) => sum + core.expandedNutrients.filter(key => row[key] === null).length, 0), 2614);
assert.equal(plan.expected.reduce((sum, row) => sum + core.expandedNutrients.filter(key => row[key] === '0.00').length, 0), 174);
function firstCandidate(data) { return data.rows.find(row => row.values.DataOrigin === 'TACO' && row.values.SourceCode === plan.inputs[0].sourceCode).values; }
for (const mutation of [
  data => { data.sha256 = 'bad'; }, data => { data.rows.pop(); },
  data => { firstCandidate(data).DataOrigin = 'IBGE/POF'; },
  data => { firstCandidate(data)['Status fonte'] = 'PENDENTE'; },
  data => { firstCandidate(data)['Status fonte'] = 'REVISÃO NECESSÁRIA'; },
  data => { firstCandidate(data).SourceCode = null; },
  data => { firstCandidate(data).Allergens = 'invented'; }
]) {
  const changed = clone(extraction); mutation(changed);
  assert.throws(() => policy.prepareTrial(changed, baseline));
}
const unexpectedHistory = clone(baseline);
unexpectedHistory.ingredients.find(row => row.source === 'BASE_ROTULA').sourceCode = 'NOT-HISTORICAL';
assert.throws(() => policy.prepareTrial(extraction, unexpectedHistory));

function fakeDatabase(fault = {}) {
  let state = clone(baseline), attempts = 0, transactionCount = 0;
  return {
    get state() { return state; }, get attempts() { return attempts; }, get transactionCount() { return transactionCount; },
    async $transaction(action, options) {
      assert.equal(options.isolationLevel, 'Serializable');
      transactionCount++;
      const draft = clone(state);
      let locked = false, finds = 0, snapshots = 0;
      const tx = {
        async $executeRawUnsafe(sql) { assert.match(sql, /^LOCK TABLE/); locked = true; return 0; },
        async $queryRawUnsafe(sql, origin, code) {
          if (sql.includes('FROM _prisma_migrations')) return policy.trialPolicy.migrations.map(name => ({ migration_name: name, checksum: fault.checksum ? 'bad' : policy.hash(fs.readFileSync(path.join(root, 'packages/db/prisma/migrations', name, 'migration.sql'))), finished_at: fault.migration ? null : 'done', rolled_back_at: null }));
          if (sql.includes('information_schema.columns')) return [{ column_name: 'sourceDescription', udt_name: 'text', is_nullable: 'YES' }, { column_name: 'allergenStatus', udt_name: 'IngredientAllergenStatus', is_nullable: 'YES' }];
          if (sql.includes('FROM pg_type')) return ['UNKNOWN', 'KNOWN', 'NONE'].map(enumlabel => ({ enumlabel }));
          if (sql.includes('FROM pg_constraint')) return [{ convalidated: !fault.constraint, definition: 'UNKNOWN KNOWN NONE cardinality' }];
          if (sql.includes('FROM pg_index')) return [{ valid: !fault.index, unique: true, definition: 'UNIQUE INDEX ("dataOrigin", "sourceCode") WHERE BASE_ROTULA' }];
          if (sql.includes('WHERE source')) {
            finds++;
            if (fault.secondRun && finds === 1055) draft.ingredients.find(row => row.id.startsWith('NEW-')).notes = 'changed during second run';
            return draft.ingredients.filter(row => row.source === 'BASE_ROTULA' && row.dataOrigin === origin && row.sourceCode === code).map(record => ({ record: clone(record) }));
          }
          if (sql.includes('FROM ingredients')) {
            snapshots++;
            if (fault.secondSnapshot && snapshots === 3) draft.users[0].name = 'changed after second run';
            return [...draft.ingredients].sort((a, b) => a.id.localeCompare(b.id)).map(record => ({ record: clone(record) }));
          }
          for (const table of ['users', 'recipes', 'barcodes']) if (sql.includes(`FROM ${table}`)) return draft[table].map(record => ({ record: clone(record) }));
          throw new Error('Unexpected SQL');
        },
        ingredient: { async create({ data }) {
          assert(locked, 'INSERT before transaction lock');
          attempts++;
          if (fault.failAt === attempts) throw new Error('simulated INSERT failure');
          const row = { ...clone(data), id: `NEW-${String(attempts).padStart(4, '0')}`, createdAt: '2026-10-04T00:00:00Z', updatedAt: '2026-10-04T00:00:00Z' };
          if (fault.nullToZero && attempts === 1) row.addedSugarsG = '0.00';
          if (fault.zeroToNull) { const key = core.expandedNutrients.find(key => row[key] === '0.00'); if (key) row[key] = null; }
          if (fault.none && attempts === 1) row.allergenStatus = 'NONE';
          if (fault.otherSource && attempts === 1) row.dataOrigin = 'IBGE/POF';
          if (fault.protected && attempts === 1) {
            if (fault.protected === 'historical') draft.ingredients.find(item => item.source === 'BASE_ROTULA').notes = 'changed';
            else if (fault.protected === 'custom') draft.ingredients.find(item => item.source === 'CUSTOM').notes = 'changed';
            else draft[fault.protected][0].name = 'changed';
          }
          draft.ingredients.push(row);
          return row;
        } }
      };
      const result = await action(tx);
      state = draft; // Commit only on success; exceptions discard the entire draft.
      return result;
    }
  };
}

async function main() {
  const noWrites = { snapshot: async () => baseline, store: { find: async () => [], insert: async () => { throw new Error('dry-run INSERT'); }, isIdentityConflict: () => false } };
  assert.equal((await policy.dryRunTrial(noWrites, plan)).length, 527);
  await assert.rejects(() => policy.dryRunTrial({ ...noWrites, store: { ...noWrites.store, find: async () => [plan.expected[0]] } }, plan));
  const successful = fakeDatabase();
  const result = await adapter.inTrialTransaction(successful, session => policy.executeAtomicTrial(session, plan), root);
  assert.equal(result.inserted, 527); assert.equal(result.secondInserted, 0); assert.equal(result.baseRotula, 542);
  assert.equal(successful.attempts, 527); assert.equal(successful.transactionCount, 1);
  assert.equal(successful.state.ingredients.length, baseline.ingredients.length + 527);
  for (const fault of [
    { failAt: 200 }, { nullToZero: true }, { zeroToNull: true }, { none: true }, { otherSource: true },
    { protected: 'historical' }, { protected: 'custom' }, { protected: 'users' }, { protected: 'recipes' }, { protected: 'barcodes' },
    { secondRun: true }, { secondSnapshot: true }, { migration: true }, { checksum: true }, { constraint: true }, { index: true }
  ]) {
    const failed = fakeDatabase(fault);
    await assert.rejects(() => adapter.inTrialTransaction(failed, session => policy.executeAtomicTrial(session, plan), root));
    assert.equal(policy.snapshotHash(failed.state), policy.snapshotHash(baseline), 'Failed trial left partial imports');
  }
  const entry = fs.readFileSync(path.join(root, 'packages/db/src/imports/trial-expanded-base.ts'), 'utf8');
  assert(!/from ["']\.\.\/index["']|loadEnvFile|from ["']dotenv/.test(entry));
  assert(entry.includes('process.env.DATABASE_URL')); assert(entry.includes('--confirm-test-branch'));
  assert.equal(policy.hash(fs.readFileSync(workbook)), workbookHashBefore);
  console.log('LOCAL OK: actual pinned XLSX; 527 identities; 2614 nulls / 174 zeros; UNKNOWN; dry-run; one transaction; preservation; idempotency; 16 injected failures rolled back. No DB connection.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS harness isolates real server modules. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the real session/actions/GET code with isolated cookie and DB adapters.
const root = path.resolve(__dirname, '..');
const cookies = new Map();
const sessions = new Map();
const user = { id: 'test-user', name: 'Test', email: 'test@example.invalid' };
let cookieOptions;
const cookieStore = {
  get: (name) => cookies.has(name) ? { value: cookies.get(name) } : undefined,
  set: (name, value, options) => { cookies.set(name, value); cookieOptions = options; },
  delete: (name) => cookies.delete(name)
};
const prisma = { session: {
  create: async ({ data }) => sessions.set(data.tokenHash, { ...data, user }),
  findUnique: async ({ where }) => sessions.get(where.tokenHash) ?? null,
  deleteMany: async ({ where }) => sessions.delete(where.tokenHash)
} };
const redirect = (url) => { throw Object.assign(new Error('redirect'), { url }); };
function load(relative, mocks) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports, require: (id) => {
      if (!(id in mocks)) throw new Error(`Unexpected import: ${id}`);
      return mocks[id];
    }, process: { env: { NODE_ENV: 'production' } }, Date, URL
  });
  return exports;
}
async function main() {
  const session = load('src/lib/auth/session.ts', {
    'next/headers': { cookies: async () => cookieStore },
    'next/navigation': { redirect }, '@rotula-facil-pro/db': { prisma },
    './token': { createRawToken: () => 'temporary-token', hashToken: (token) => `hash:${token}` }
  });
  const actions = load('src/lib/auth/actions.ts', {
    'next/navigation': { redirect }, './repository': { prismaAuthRepository: {} },
    './session': session, './service': { loginAccount: async () => ({ ok: true, user }) }
  });
  const route = load('src/app/sair/route.ts', {
    'next/server': { NextResponse: { redirect: (url) => ({ location: url.pathname }) } }
  });
  await assert.rejects(actions.loginAction(new FormData()), (error) => error.url === '/dashboard');
  assert.equal(sessions.size, 1);
  assert.equal(cookieOptions.httpOnly, true);
  assert.equal(cookieOptions.secure, true);
  assert.equal(cookieOptions.sameSite, 'lax');
  assert.equal(cookieOptions.path, '/');
  assert(cookieOptions.expires > new Date());
  for (const page of ['dashboard', 'ingredientes']) {
    const source = fs.readFileSync(path.join(root, `src/app/${page}/page.tsx`), 'utf8');
    assert(source.includes('await requireUser()'));
    assert.equal((await session.requireUser()).id, user.id);
  }
  for (let i = 0; i < 3; i++) {
    assert.equal((await route.GET(new Request('https://example.invalid/sair'))).location, '/dashboard');
    assert.equal(sessions.size, 1);
    assert.equal((await session.requireUser()).id, user.id);
  }
  await assert.rejects(actions.logoutAction(), (error) => error.url === '/login?status=logged-out');
  assert.equal(sessions.size, 0);
  assert.equal(cookies.size, 0);
  await assert.rejects(session.requireUser(), (error) => error.url === '/login?error=auth-required');
  console.log('logout-session-regression: OK (login, guards, GET/prefetch, logout, denied after logout)');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

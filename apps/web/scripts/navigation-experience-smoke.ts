import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

async function main() {
  const appRoot = path.resolve(process.cwd(), "src/app");
  const sourceRoot = path.resolve(process.cwd(), "src");
  const sidebar = await readFile(path.join(sourceRoot, "components/layout/sidebar.tsx"), "utf8");
  const topbar = await readFile(path.join(sourceRoot, "components/layout/topbar.tsx"), "utf8");
  const dashboard = await readFile(path.join(appRoot, "dashboard/page.tsx"), "utf8");
  const home = await readFile(path.join(appRoot, "page.tsx"), "utf8");
  const authActions = await readFile(path.join(sourceRoot, "lib/auth/actions.ts"), "utf8");

  const routes = ["/dashboard", "/ingredientes", "/receitas", "/codigo-de-barras", "/rotulo-final", "/etiquetas"];
  for (const route of routes) {
    await access(path.join(appRoot, route.slice(1), "page.tsx"));
    assert(sidebar.includes(`href: "${route}"`), `Rota ausente da navegação: ${route}`);
  }

  for (const deadRoute of ["/produtos", "/produtos/novo", "/producoes", "/minha-conta"]) {
    assert(!sidebar.includes(deadRoute), `Link morto na sidebar: ${deadRoute}`);
    assert(!dashboard.includes(deadRoute), `Link morto no Dashboard: ${deadRoute}`);
  }

  assert(sidebar.includes("aria-expanded={mobileOpen}"));
  assert(sidebar.includes("setMobileOpen(true)"));
  assert((sidebar.match(/setMobileOpen\(false\)/g)?.length ?? 0) >= 3);
  assert(sidebar.includes("onNavigate={() => setMobileOpen(false)}"));
  assert(sidebar.includes("w-[min(20rem,88vw)]"));
  assert(!topbar.includes('aria-label="Buscar"'));
  assert(!topbar.includes('aria-label="Notificações"'));
  assert(!topbar.includes('aria-label="Perfil"'));
  assert(topbar.includes('href="/sair"'));
  assert(authActions.match(/redirect\("\/dashboard"\)/g)?.length === 2);
  assert(home.includes('redirect(user ? "/dashboard" : "/login")'));

  console.log("Navegação desktop/mobile, rotas reais, topo e destinos de autenticação: OK.");
}

void main();

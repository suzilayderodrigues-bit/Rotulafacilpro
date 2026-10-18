import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Database,
  FileText,
  Plus,
  Tags,
  UserCircle
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { logoutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import { requireUser } from "@/lib/auth/session";

const buttonLinkClasses = cn(
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border px-4 text-sm font-semibold transition-colors",
  "border-[var(--brand-tiffany)] bg-[var(--brand-tiffany)] text-[var(--brand-navy)] hover:bg-[#1294a5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-cyan)] focus-visible:ring-offset-2"
);

const shortcuts = [
  {
    title: "Criar nova receita",
    description: "Comece o cadastro de um produto pela receita.",
    href: "/receitas/nova",
    icon: Plus
  },
  {
    title: "Ingredientes",
    description: "Consulte a base e gerencie seus ingredientes.",
    href: "/ingredientes",
    icon: Database
  },
  {
    title: "Minha tabela",
    description: "Confira a tabela nutricional e a avaliação da lupa.",
    href: "/rotulo-final",
    icon: Tags
  }
];

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar activeItem="Dashboard" />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl px-5 py-6 lg:px-8 lg:py-8">
            <section className="mb-6 flex flex-col gap-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <Badge variant="secondary" className="gap-1.5"><span className="size-1.5 rounded-full bg-[var(--accent-orange)]" />Dashboard</Badge>
                <h1 className="mt-4 text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">
                  Olá, {user.name} 👋
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                  Continue suas receitas, rótulos e etiquetas em um só lugar.
                </p>
              </div>
              <Link href="/receitas/nova" className={cn(buttonLinkClasses, "w-full sm:w-auto")}>
                <Plus className="size-4" />
                Criar nova receita
              </Link>
            </section>

            <section className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[1.6fr_0.8fr]">
              <div className="min-w-0 space-y-6">
                <Card className="shadow-none">
                  <CardHeader>
                    <div>
                      <CardTitle>Atalhos</CardTitle>
                      <CardDescription>Acesse os módulos principais do seu trabalho.</CardDescription>
                    </div>
                  </CardHeader>
                  <div className="grid gap-3 md:grid-cols-3">
                    {shortcuts.map((shortcut) => {
                      const Icon = shortcut.icon;

                      return (
                        <Link
                          key={shortcut.title}
                          href={shortcut.href}
                          className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-4 transition hover:border-[#b9e8ef] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tiffany)]"
                        >
                          <div className="mb-4 flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[#e8f7fa] text-[var(--brand-petrol)] ring-1 ring-[rgba(245,158,11,0.25)]">
                            <Icon className="size-5" />
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                                {shortcut.title}
                              </h3>
                              <p className="mt-2 text-sm leading-5 text-[var(--muted)]">
                                {shortcut.description}
                              </p>
                            </div>
                            <ArrowRight className="mt-0.5 size-4 shrink-0 text-[var(--accent-orange)] transition group-hover:translate-x-0.5" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </Card>

                <Card className="shadow-none">
                  <CardHeader>
                    <div>
                      <CardTitle>Fluxo principal</CardTitle>
                      <CardDescription>Cadastre ingredientes, monte a receita e confira a tabela nutricional.</CardDescription>
                    </div>
                  </CardHeader>
                  <Link href="/receitas" className={cn(buttonLinkClasses, "w-full sm:w-auto")}>
                    Ver minhas receitas
                    <ArrowRight className="size-4" />
                  </Link>
                </Card>
              </div>

              <aside className="min-w-0 space-y-6">
                <Card className="shadow-none">
                  <CardHeader>
                    <div>
                      <CardTitle>Etiquetas</CardTitle>
                      <CardDescription>Prepare etiquetas de produção para suas receitas.</CardDescription>
                    </div>
                  </CardHeader>
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-white text-[var(--accent-orange)]">
                        <ClipboardList className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">Lote e validade</p>
                        <p className="text-sm text-[var(--muted)]">PDF pronto para impressão</p>
                      </div>
                    </div>
                    <Link href="/etiquetas" className={cn(buttonLinkClasses, "mt-4 w-full")}>
                      Criar etiquetas
                    </Link>
                  </div>
                </Card>

                <Card className="shadow-none">
                  <CardHeader>
                    <div>
                      <CardTitle>Minha Conta</CardTitle>
                      <CardDescription>Validação da sessão ativa.</CardDescription>
                    </div>
                  </CardHeader>
                  <dl className="space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <UserCircle className="mt-0.5 size-5 text-[var(--brand-petrol)]" />
                      <div className="min-w-0">
                        <dt className="font-semibold text-[var(--muted)]">Nome</dt>
                        <dd className="mt-1 truncate font-semibold text-[var(--foreground)]">
                          {user.name}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 size-5 text-[var(--brand-petrol)]" />
                      <div className="min-w-0">
                        <dt className="font-semibold text-[var(--muted)]">E-mail</dt>
                        <dd className="mt-1 truncate font-semibold text-[var(--foreground)]">
                          {user.email}
                        </dd>
                      </div>
                    </div>
                  </dl>
                  <form action={logoutAction} className="mt-5">
                    <Button type="submit" variant="outline" className="w-full">
                      Sair
                    </Button>
                  </form>
                </Card>
              </aside>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}







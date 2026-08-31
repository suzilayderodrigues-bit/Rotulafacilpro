import Link from "next/link";
import { BookOpen, ClipboardList, Database, Home, Menu, Package, Tags, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Produtos", href: "/produtos", icon: Package },
  { label: "Ingredientes", href: "/ingredientes", icon: Database },
  { label: "Receitas", href: "/receitas", icon: BookOpen },
  { label: "Produções", href: "/producoes", icon: ClipboardList },
  { label: "Etiquetas", href: "/etiquetas", icon: Tags },
  { label: "Minha Conta", href: "/minha-conta", icon: UserCircle }
];

type SidebarProps = {
  activeItem?: string;
};

export function Sidebar({ activeItem = "Dashboard" }: SidebarProps) {
  return (
    <>
      <div className="border-b border-[var(--border)] bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--brand-petrol)]"
        >
          <Menu className="size-4" />
          Menu
        </button>
      </div>
      <aside className="group hidden min-h-[calc(100vh-3.5rem)] w-16 shrink-0 border-r border-[var(--border)] bg-white transition-all duration-200 hover:w-56 lg:block">
        <nav className="flex flex-col gap-1 p-2" aria-label="Navegação principal">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.label === activeItem;

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 overflow-hidden rounded-[var(--radius-md)] border border-transparent px-3 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--border)] hover:bg-white hover:text-[var(--brand-petrol)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tiffany)]",
                  isActive &&
                    "border-[#b9e8ef] bg-[#e8f7fa] text-[var(--brand-petrol)] hover:border-[#b9e8ef] hover:bg-[#e8f7fa]"
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span className="whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

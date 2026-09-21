"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Barcode, BookOpen, Database, Home, Menu, Tags, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const navigationItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Ingredientes", href: "/ingredientes", icon: Database },
  { label: "Receitas", href: "/receitas", icon: BookOpen },
  { label: "Rótulo Final", href: "/rotulo-final", icon: Tags },
  { label: "Código de Barras", href: "/codigo-de-barras", icon: Barcode },
  { label: "Etiquetas", href: "/etiquetas", icon: Tags }
] as const;

type SidebarProps = {
  activeItem?: string;
};

function NavigationLinks({ activeItem, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  return navigationItems.map((item) => {
    const Icon = item.icon;
    const isActive = item.label === activeItem;

    return (
      <Link
        key={item.label}
        href={item.href}
        onClick={onNavigate}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex h-11 items-center gap-3 overflow-hidden rounded-[var(--radius-md)] border border-transparent px-3 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--border)] hover:bg-white hover:text-[var(--brand-petrol)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tiffany)]",
          isActive &&
            "border-[#b9e8ef] bg-[#e8f7fa] text-[var(--brand-petrol)] hover:border-[#b9e8ef] hover:bg-[#e8f7fa]"
        )}
      >
        <Icon className="size-5 shrink-0" />
        <span className="whitespace-nowrap">{item.label}</span>
      </Link>
    );
  });
}

export function Sidebar({ activeItem = "Dashboard" }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  return (
    <>
      <div className="border-b border-[var(--border)] bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--brand-petrol)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tiffany)]"
        >
          <Menu className="size-4" />
          Menu
        </button>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-[rgba(11,28,42,0.55)]" onClick={() => setMobileOpen(false)} />
          <aside id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Menu principal" className="relative flex h-full w-[min(20rem,88vw)] flex-col overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="font-semibold text-[var(--brand-petrol)]">Navegação</p>
              <button type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} className="flex size-10 items-center justify-center rounded-[var(--radius-md)] text-[var(--brand-petrol)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tiffany)]">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1" aria-label="Navegação principal">
              <NavigationLinks activeItem={activeItem} onNavigate={() => setMobileOpen(false)} />
            </nav>
          </aside>
        </div>
      ) : null}

      <aside className="group hidden min-h-[calc(100vh-3.5rem)] w-16 shrink-0 border-r border-[var(--border)] bg-white transition-all duration-200 hover:w-56 lg:block">
        <nav className="flex flex-col gap-1 p-2" aria-label="Navegação principal">
          <div className="[&_span]:opacity-0 [&_span]:transition-opacity group-hover:[&_span]:opacity-100">
            <NavigationLinks activeItem={activeItem} />
          </div>
        </nav>
      </aside>
    </>
  );
}

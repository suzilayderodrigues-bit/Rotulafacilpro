import type { HTMLAttributes, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dropdown({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="group relative inline-flex">
      <button className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--brand-petrol)] transition hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tiffany)]">
        {label}
        <ChevronDown className="size-4" />
      </button>
      <div className="invisible absolute right-0 top-11 z-10 min-w-44 rounded-[var(--radius-md)] border border-[var(--border)] bg-white p-2 opacity-0 shadow-[var(--shadow-soft)] transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        {children}
      </div>
    </div>
  );
}

export function DropdownItem({ className, ...props }: HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "block w-full rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tiffany)]",
        className
      )}
      type="button"
      {...props}
    />
  );
}

export function Breadcrumb({ items }: { items: string[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
      {items.map((item, index) => (
        <span key={item} className="inline-flex items-center gap-2">
          <span className={index === items.length - 1 ? "font-semibold text-[var(--foreground)]" : ""}>
            {item}
          </span>
          {index < items.length - 1 ? <span className="text-[var(--border-strong)]">/</span> : null}
        </span>
      ))}
    </nav>
  );
}

export function Tabs({ tabs, active }: { tabs: string[]; active: string }) {
  return (
    <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--border)] bg-white p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={cn(
            "h-9 rounded-[var(--radius-sm)] px-3 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tiffany)]",
            tab === active && "bg-[#e8f7fa] text-[var(--brand-petrol)]"
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

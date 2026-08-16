import type { HTMLAttributes, ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Modal({
  className,
  title,
  children
}: HTMLAttributes<HTMLDivElement> & { title: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[#071722]/55 p-4">
      <div className={cn("mx-auto max-w-sm rounded-[var(--radius-lg)] bg-white p-5 shadow-[var(--shadow-soft)]", className)}>
        <div className="mb-3 flex items-start justify-between gap-4">
          <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
          <Button variant="ghost" className="h-8 px-2" aria-label="Fechar modal">
            <X className="size-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-md)] border border-[#b9e8ef] bg-white px-4 py-3 text-sm shadow-[var(--shadow-soft)]",
        className
      )}
      {...props}
    >
      <span className="mt-1 size-2 rounded-full bg-[var(--brand-tiffany)]" />
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-white px-6 py-8 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-[var(--radius-lg)] bg-[#e8f7fa] text-[var(--brand-petrol)]">
        <span className="size-3 rounded-full bg-[var(--brand-tiffany)]" />
      </div>
      <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-[var(--radius-md)] bg-[#e4eef1]", className)}
      {...props}
    />
  );
}

export function LoadingState({ label = "Carregando" }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--muted)]">
      <Loader2 className="size-4 animate-spin text-[var(--brand-tiffany)]" />
      {label}
    </div>
  );
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-52 -translate-x-1/2 rounded-[var(--radius-sm)] bg-[var(--brand-navy)] px-2 py-1 text-xs text-white opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-within:opacity-100">
        {label}
      </span>
    </span>
  );
}

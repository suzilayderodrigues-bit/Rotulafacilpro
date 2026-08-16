import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex items-start justify-between gap-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold tracking-normal text-[var(--foreground)]", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm text-[var(--muted)]", className)} {...props} />;
}

export type StatCardProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: string;
  helper?: string;
};

export function StatCard({ className, label, value, helper, ...props }: StatCardProps) {
  return (
    <Card className={cn("p-4 shadow-none", className)} {...props}>
      <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-normal text-[var(--foreground)]">{value}</p>
      {helper ? <p className="mt-2 text-xs text-[var(--brand-petrol)]">{helper}</p> : null}
    </Card>
  );
}

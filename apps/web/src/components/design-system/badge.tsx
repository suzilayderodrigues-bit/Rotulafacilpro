import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "success" | "error" | "cyan";

const variants: Record<BadgeVariant, string> = {
  default: "bg-[#e8f7fa] text-[var(--brand-petrol)] border-[#b9e8ef]",
  secondary: "bg-[var(--surface-muted)] text-[var(--muted)] border-[var(--border)]",
  success: "bg-[var(--success-bg)] text-[var(--success)] border-[#bfead4]",
  error: "bg-[var(--error-bg)] text-[var(--error)] border-[#f0c4c0]",
  cyan: "bg-[#e7ffff] text-[var(--brand-petrol)] border-[var(--brand-cyan)]"
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

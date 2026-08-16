import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--brand-tiffany)] text-[var(--brand-navy)] border-[var(--brand-tiffany)] hover:bg-[#1294a5] active:bg-[#0f8493] focus-visible:ring-[var(--brand-cyan)]",
  secondary:
    "bg-[var(--brand-petrol)] text-white border-[var(--brand-petrol)] hover:bg-[#0e5360] active:bg-[#0b4651] focus-visible:ring-[var(--brand-tiffany)]",
  outline:
    "bg-white text-[var(--brand-petrol)] border-[var(--border-strong)] hover:bg-[var(--surface-muted)] active:bg-[#e8f2f4] focus-visible:ring-[var(--brand-tiffany)]",
  ghost:
    "bg-transparent text-[var(--brand-petrol)] border-transparent hover:bg-[var(--surface-muted)] active:bg-[#e8f2f4] focus-visible:ring-[var(--brand-tiffany)]",
  danger:
    "bg-[var(--error)] text-white border-[var(--error)] hover:bg-[#a93632] active:bg-[#8f2e2b] focus-visible:ring-[var(--error)]",
  success:
    "bg-[var(--success)] text-white border-[var(--success)] hover:bg-[#197a53] active:bg-[#146743] focus-visible:ring-[var(--success)]"
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border px-4 text-sm font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

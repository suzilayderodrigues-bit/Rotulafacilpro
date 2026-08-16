import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";
import { cn } from "@/lib/utils";

type FieldState = "default" | "error" | "success";

const stateClasses: Record<FieldState, string> = {
  default: "border-[var(--border)] focus:border-[var(--brand-tiffany)] focus:ring-[var(--brand-tiffany)]",
  error: "border-[var(--error)] bg-[var(--error-bg)] focus:border-[var(--error)] focus:ring-[var(--error)]",
  success:
    "border-[var(--success)] bg-[var(--success-bg)] focus:border-[var(--success)] focus:ring-[var(--success)]"
};

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-2 block text-sm font-semibold text-[var(--foreground)]", className)}
      {...props}
    />
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  fieldState?: FieldState;
};

export function Input({ className, fieldState = "default", ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-[var(--radius-md)] border bg-white px-3 text-sm text-[var(--foreground)] outline-none transition",
        "placeholder:text-[var(--muted-foreground)] focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-[#eef4f5] disabled:text-[var(--muted)]",
        stateClasses[fieldState],
        className
      )}
      {...props}
    />
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  fieldState?: FieldState;
};

export function Textarea({ className, fieldState = "default", ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-y rounded-[var(--radius-md)] border bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none transition",
        "placeholder:text-[var(--muted-foreground)] focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-[#eef4f5] disabled:text-[var(--muted)]",
        stateClasses[fieldState],
        className
      )}
      {...props}
    />
  );
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  fieldState?: FieldState;
};

export function Select({ className, fieldState = "default", children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-[var(--radius-md)] border bg-white px-3 text-sm text-[var(--foreground)] outline-none transition",
        "focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-[#eef4f5] disabled:text-[var(--muted)]",
        stateClasses[fieldState],
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  fieldState?: FieldState;
};

export function Checkbox({ className, label, fieldState = "default", ...props }: CheckboxProps) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
      <input
        type="checkbox"
        className={cn(
          "size-4 rounded border-[var(--border)] accent-[var(--brand-tiffany)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-tiffany)] disabled:cursor-not-allowed disabled:opacity-50",
          fieldState === "error" && "accent-[var(--error)]",
          fieldState === "success" && "accent-[var(--success)]",
          className
        )}
        {...props}
      />
      {label}
    </label>
  );
}

export type RadioProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Radio({ className, label, ...props }: RadioProps) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
      <input
        type="radio"
        className={cn(
          "size-4 border-[var(--border)] accent-[var(--brand-tiffany)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-tiffany)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
      {label}
    </label>
  );
}

export type SwitchProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Switch({ className, label, ...props }: SwitchProps) {
  return (
    <label className="inline-flex items-center gap-3 text-sm text-[var(--foreground)]">
      <input type="checkbox" className="peer sr-only" {...props} />
      <span
        className={cn(
          "relative h-6 w-11 rounded-full bg-[#cddce0] transition peer-checked:bg-[var(--brand-tiffany)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--brand-tiffany)] peer-disabled:opacity-50",
          "after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5",
          className
        )}
      />
      {label}
    </label>
  );
}

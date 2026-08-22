"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, Label } from "@/components/design-system";

export type PasswordFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function PasswordField({ id, label, ...props }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const inputId = id ?? props.name;

  return (
    <div>
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        <Input
          id={inputId}
          type={isVisible ? "text" : "password"}
          className="pr-11"
          {...props}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--brand-petrol)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tiffany)]"
          aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}
          onClick={() => setIsVisible((current) => !current)}
        >
          {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

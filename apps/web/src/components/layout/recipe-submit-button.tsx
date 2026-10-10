"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/design-system";

export function RecipeSubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} className="min-h-11 w-full whitespace-normal sm:w-auto">{pending ? "Salvando..." : children}</Button>;
}

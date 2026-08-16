import type { TableHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-white">
      <table className={cn("w-full border-collapse text-left text-sm", className)} {...props} />
    </div>
  );
}

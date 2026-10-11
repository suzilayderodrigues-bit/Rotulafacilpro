"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { labelPreviewHref, resolveLabelFormat, resolveLabelTemplate } from "@/lib/final-label/visual";

// Presentation preferences only, per recipe and browser tab; never stores recipe data.
export function LabelSelectionMemory({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const query = useSearchParams();
  useEffect(() => {
    const key = `rotula-label-selection:${recipeId}`;
    try {
      if (!query.has("format") && !query.has("template")) {
        const saved = sessionStorage.getItem(key);
        if (saved) {
          const value = JSON.parse(saved) as { format?: string; template?: string };
          router.replace(labelPreviewHref(recipeId, resolveLabelFormat(value.format), resolveLabelTemplate(value.template)));
        }
      } else {
        sessionStorage.setItem(key, JSON.stringify({ format: resolveLabelFormat(query.get("format") ?? undefined), template: resolveLabelTemplate(query.get("template") ?? undefined) }));
      }
    } catch { /* Storage may be disabled; validated URL context remains available. */ }
  }, [recipeId, router, query]);
  return null;
}

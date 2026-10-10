"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Label, Select } from "@/components/design-system";
import { ingredientCategories } from "@/lib/ingredients/categories";

export function IngredientFilters({ tab, search, category }: { tab: "base" | "meus"; search?: string; category?: string }) {
  const router = useRouter();
  const [text, setText] = useState(search ?? "");
  const [chosenCategory, setChosenCategory] = useState(category ?? "");
  useEffect(() => {
    if (text.trim() === (search ?? "") && chosenCategory === (category ?? "")) return;
    const timer = setTimeout(() => {
      const query = new URLSearchParams();
      if (tab === "meus") query.set("aba", "meus");
      if (text.trim()) query.set("busca", text.trim());
      if (chosenCategory) query.set("categoria", chosenCategory);
      router.replace(`/ingredientes?${query}`, { scroll: false });
    }, 250);
    return () => clearTimeout(timer);
  }, [text, chosenCategory, search, category, tab, router]);
  return <div className="grid w-full gap-3 md:grid-cols-[1fr_240px] lg:max-w-3xl">
    <div><Label htmlFor="busca" className="sr-only">Buscar pelo início do nome</Label><Input id="busca" maxLength={120} value={text} onChange={event => setText(event.target.value)} placeholder="Buscar pelo início do nome" /></div>
    <div><Label htmlFor="categoria" className="sr-only">Categoria</Label><Select id="categoria" value={chosenCategory} onChange={event => setChosenCategory(event.target.value)}><option value="">Todas as categorias</option>{ingredientCategories.map(item => <option key={item} value={item}>{item}</option>)}</Select></div>
  </div>;
}

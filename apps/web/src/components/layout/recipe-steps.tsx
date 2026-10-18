import Link from "next/link";

export function RecipeSteps({ current, recipeId, detail }: { current: 1 | 2 | 3; recipeId?: string; detail: string }) {
  const id = recipeId ? encodeURIComponent(recipeId) : null;
  const steps = [
    { label: "Minha receita", href: id ? `/receitas/${id}/ingredientes` : null },
    { label: "Meu produto", href: id ? `/receitas/${id}/rendimento` : null },
    { label: "Minha tabela", href: id ? `/rotulo-final?recipeId=${id}` : null }
  ];
  return <nav aria-label="Etapas da receita" className="my-5">
    <p className="mb-3 text-sm font-semibold">Etapa {current} de 3 · {detail}</p>
    <ol className="grid gap-2 sm:grid-cols-3">
      {steps.map((step, index) => <li key={step.label}>
        {step.href ? <Link href={step.href} prefetch={false} aria-current={current === index + 1 ? "step" : undefined} className={`flex min-h-11 items-center rounded-[var(--radius-md)] border px-3 py-3 text-sm ${current === index + 1 ? "bg-[#e8f7fa] font-semibold" : "bg-white"}`}>{index + 1}. {step.label}</Link>
          : <span aria-current={current === index + 1 ? "step" : undefined} className="flex min-h-11 items-center rounded-[var(--radius-md)] border px-3 py-3 text-sm">{index + 1}. {step.label}</span>}
      </li>)}
    </ol>
  </nav>;
}

"use client";

import { AlertCircle } from "lucide-react";
import { Button, Card, CardDescription, CardHeader, CardTitle } from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function IngredientsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar activeItem="Ingredientes" />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-3xl px-5 py-6 lg:px-8 lg:py-8">
            <Card className="shadow-none">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--error-bg)] text-[var(--error)]">
                    <AlertCircle className="size-5" />
                  </div>
                  <div>
                    <CardTitle>Não foi possível carregar os ingredientes.</CardTitle>
                    <CardDescription>Tente novamente em alguns instantes.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <Button type="button" onClick={reset}>Tentar novamente</Button>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

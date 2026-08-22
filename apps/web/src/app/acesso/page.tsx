import { Button, Card, CardDescription, CardTitle } from "@/components/design-system";
import { logoutAction } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/session";

export default async function AccessPage() {
  const user = await requireUser();

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-8 text-[var(--foreground)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col justify-center">
        <Card className="p-6">
          <CardTitle>Acesso validado</CardTitle>
          <CardDescription>Rota interna técnica temporária para validar a sessão.</CardDescription>
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-[var(--muted)]">Nome</dt>
              <dd className="mt-1 text-base font-semibold">{user.name}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--muted)]">E-mail</dt>
              <dd className="mt-1 text-base font-semibold">{user.email}</dd>
            </div>
          </dl>
          <form action={logoutAction} className="mt-6">
            <Button type="submit" variant="outline">
              Sair
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}

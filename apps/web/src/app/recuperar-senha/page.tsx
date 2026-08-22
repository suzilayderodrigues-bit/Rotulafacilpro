import Link from "next/link";
import { Button, Input, Label } from "@/components/design-system";
import { AuthMessage, AuthShell } from "@/components/auth/auth-shell";
import { requestPasswordResetAction } from "@/lib/auth/actions";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RecoverPasswordPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const error = firstValue(params.error);
  const sent = firstValue(params.sent);

  return (
    <AuthShell
      title="Recuperar senha"
      description="Informe o e-mail da conta. A integração real de envio será conectada quando o serviço de e-mail for definido."
    >
      {error ? <AuthMessage type="error">Informe um e-mail válido.</AuthMessage> : null}
      {sent ? (
        <AuthMessage type="success">
          Se o e-mail estiver cadastrado, as instruções de recuperação serão enviadas.
        </AuthMessage>
      ) : null}
      <form action={requestPasswordResetAction} className="space-y-4">
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <Button type="submit" className="w-full">
          Solicitar recuperação
        </Button>
      </form>
      <p className="mt-5 text-sm text-[var(--muted)]">
        Lembrou a senha?{" "}
        <Link className="font-semibold text-[var(--brand-petrol)] hover:text-[var(--brand-tiffany)]" href="/login">
          Voltar para login
        </Link>
      </p>
    </AuthShell>
  );
}

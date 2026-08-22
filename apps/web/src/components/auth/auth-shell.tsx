import Image from "next/image";
import icon from "../../../../../assets/branding/icone.png.jpg";
import { Card } from "@/components/design-system";

export function AuthShell({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen px-5 py-8 text-[var(--foreground)]" style={{ background: "linear-gradient(135deg, rgba(22, 167, 185, 0.08), rgba(255, 255, 255, 0) 42%), var(--background)" }}>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="relative flex size-16 items-center justify-center rounded-full border border-[#b9e8ef] bg-white shadow-[var(--shadow-soft)]">
            <span className="absolute -right-0.5 top-2 size-3 rounded-full bg-[var(--accent-orange)]" />
            <Image
              src={icon}
              alt="Ícone oficial do Rotula Fácil Pro"
              className="size-11 rounded-full object-cover"
              priority
            />
          </div>
          <p className="mt-3 text-base font-semibold text-[var(--brand-navy)]">Rotula Fácil Pro</p>
        </div>
        <Card className="border-[var(--border)] p-6 shadow-[0_14px_34px_rgba(11,28,42,0.055)]">
          <div className="mb-5 h-1 w-12 rounded-full bg-[var(--accent-orange)]" />
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
          <div className="mt-6">{children}</div>
        </Card>
      </div>
    </main>
  );
}

export function AuthMessage({
  type,
  children
}: {
  type: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        type === "error"
          ? "mb-4 rounded-[var(--radius-md)] border border-[#f0c4c0] bg-[var(--error-bg)] px-3 py-2 text-sm text-[var(--error)]"
          : "mb-4 rounded-[var(--radius-md)] border border-[#bfead4] bg-[var(--success-bg)] px-3 py-2 text-sm text-[var(--success)]"
      }
    >
      {children}
    </div>
  );
}


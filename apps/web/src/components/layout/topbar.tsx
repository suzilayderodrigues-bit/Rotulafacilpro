import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import icon from "../../../../../assets/branding/icone.png.jpg";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-[var(--brand-navy)] px-4 text-white shadow-sm">
      <Link href="/dashboard" className="flex min-w-0 items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-cyan)]">
        <Image src={icon} alt="Ícone oficial do Rotula Fácil Pro" className="size-9 rounded-[var(--radius-md)] object-cover" priority />
        <span className="truncate text-sm font-semibold leading-tight">Rotula Fácil Pro</span>
      </Link>
      <form action={logoutAction}>
        <button type="submit" className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-white/20 px-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-cyan)]">
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </form>
    </header>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rotula Fácil Pro",
  description: "Design System do Rotula Fácil Pro"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

import { type ReactNode, Suspense } from "react";
import type { Metadata } from "next";
import { Lora, Montserrat } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kairos — Penjadwal Pertemuan Kelompok Berbasis Rutinitas",
  description:
    "Simpan jadwal rutin mingguan sekali, bagikan satu tautan ruang temu, dan temukan irisan waktu luang kelompok secara otomatis tanpa membocorkan detail kegiatan pribadi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={cn(
        "h-full antialiased",
        montserrat.variable,
        lora.variable,
      )}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <Providers>
          <Suspense
            fallback={<div className="h-16 border-b border-border bg-card" />}
          >
            <Navbar />
          </Suspense>
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

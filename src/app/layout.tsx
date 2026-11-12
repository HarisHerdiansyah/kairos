import { Suspense } from "react"
import type { Metadata } from "next"
import { Montserrat, Lora, IBM_Plex_Mono } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/navbar"

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
})

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Kairos — Penjadwal Pertemuan Kelompok Berbasis Rutinitas",
  description:
    "Simpan jadwal rutin mingguan sekali, bagikan satu tautan ruang temu, dan temukan irisan waktu luang kelompok secara otomatis tanpa membocorkan detail kegiatan pribadi.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="id"
      className={cn(
        "h-full antialiased",
        montserrat.variable,
        lora.variable,
        ibmPlexMono.variable
      )}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <Providers>
          <Suspense fallback={<div className="h-16 border-b border-border bg-card" />}>
            <Navbar />
          </Suspense>
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  )
}

import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "IDX Ownership Visualizer",
  description: "Visualisasi data kepemilikan 1% saham IDX",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}

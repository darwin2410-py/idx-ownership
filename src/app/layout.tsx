import type { Metadata } from "next"
import "./globals.css"
import Link from "next/link"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "IDX Ownership Visualizer - Data Kepemilikan Saham 1%",
  description: "Visualisasi data kepemilikan 1% saham IDX untuk mendeteksi pola akumulasi dan disposisi investor besar.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col bg-white">
        {/* Navigation Header */}
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 bg-white/95 backdrop-blur">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              {/* Logo/Brand */}
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-900">
                  IDX Ownership Visualizer
                </span>
              </Link>

              {/* Navigation Links */}
              <div className="flex items-center space-x-6">
                <Link
                  href="/"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Beranda
                </Link>
                <Link
                  href="/entities"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Entitas
                </Link>
                <Link
                  href="/stocks"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors min-h-10"
                >
                  Daftar Saham
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </body>
    </html>
  )
}

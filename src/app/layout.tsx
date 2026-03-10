import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TradingWatcher | Follow the Smart Money",
  description: "Track every trade made by politicians, hedge funds, and top investors the moment it's disclosed. Real-time congressional trading data, 13F institutional filings, and notable trader activity.",
  keywords: ["congress trades", "13f filings", "insider trading", "smart money", "institutional investors"],
  openGraph: {
    title: "TradingWatcher | Follow the Smart Money",
    description: "Real-time tracking of congressional trades, institutional 13F filings, and notable investor activity.",
    type: "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0f] text-slate-100`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

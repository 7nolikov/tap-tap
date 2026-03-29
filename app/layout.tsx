import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: "Tap-Tap-Share — Build & Share Grocery Lists Instantly",
  description:
    "Tap to select groceries, copy the list in one click. Share with anyone via WhatsApp, Telegram, or any app. No sign-up, works offline.",
  openGraph: {
    title: "Tap-Tap-Share — Build & Share Grocery Lists Instantly",
    description: "Tap items, share in one click. No sign-up. Works offline. Zero data leaves your device.",
    type: "website",
    url: "https://7nolikov.github.io/tap-tap/",
    siteName: "Tap-Tap-Share",
  },
  twitter: {
    card: "summary",
    title: "Tap-Tap-Share",
    description: "Tap items, share in one click. No sign-up. Works offline.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} antialiased`} suppressHydrationWarning>
      <body className={GeistSans.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}

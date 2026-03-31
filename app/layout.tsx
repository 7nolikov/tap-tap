import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import "./globals.css"

const APP_URL = "https://7nolikov.github.io/tap-tap"

export const viewport: Viewport = {
  themeColor: "#d97706",
}

export const metadata: Metadata = {
  title: "TapTap — Grocery Lists That Live in a Link",
  description:
    "Tap to select groceries, share your list as a link. No sign-up. No server. No tracking. Works offline. The entire list travels in the URL.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: "TapTap — Grocery Lists That Live in a Link",
    description: "Tap items, share in one click. No sign-up. Works offline. Zero data leaves your device.",
    type: "website",
    url: APP_URL + "/",
    siteName: "TapTap",
    images: [
      {
        url: APP_URL + "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TapTap — Tap items, share a link",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TapTap — Grocery Lists That Live in a Link",
    description: "Tap items, share in one click. No sign-up. Works offline.",
    images: [APP_URL + "/og-image.png"],
  },
  manifest: "/tap-tap/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TapTap",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} antialiased`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/tap-tap/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TapTap" />
      </head>
      <body className={GeistSans.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}

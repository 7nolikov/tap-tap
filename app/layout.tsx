import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import { APP_URL } from "@/lib/config"
import "./globals.css"

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfcf9" },
    { media: "(prefers-color-scheme: dark)", color: "#211f1d" },
  ],
  // The bottom action bar sits against the home indicator, so the app must own the
  // safe area rather than letting the browser pad it
  viewportFit: "cover",
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
        <link rel="icon" type="image/png" href="/tap-tap/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TapTap" />
        <link rel="apple-touch-icon" href="/tap-tap/icon-192.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "TapTap",
              description:
                "Tap items, share your grocery list as a link. No sign-up. No server. No tracking. Works offline.",
              url: APP_URL,
              applicationCategory: "LifestyleApplication",
              operatingSystem: "Any",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              featureList: [
                "Offline support via service worker",
                "Zero registration required",
                "URL-based list sharing — list travels in the link",
                "16 pre-built templates",
                "Dark mode",
              ],
            }),
          }}
        />
      </head>
      <body className={GeistSans.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          {/* Bottom-centre keeps toasts clear of the app bar; the offset clears the
              Compact list bar, which is 68px plus the safe-area inset */}
          <Toaster richColors position="bottom-center" offset="6rem" closeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}

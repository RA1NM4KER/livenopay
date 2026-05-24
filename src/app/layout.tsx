import type { Metadata } from "next";
import type { Viewport } from "next";
import Script from "next/script";
import { PwaRegistrar } from "@/components/pwa/pwa-registrar";
import type { RootLayoutProps } from "./types";
import "./globals.css";

export const metadata: Metadata = {
  title: "LiveNoPay",
  description: "Your electricity usage, your data, your control.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LiveNoPay"
  },
  icons: {
    icon: [{ url: "/app-icon", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/apple-icon", sizes: "512x512", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: "light dark",
  themeColor: [
    { color: "#f6f6f6", media: "(prefers-color-scheme: light)" },
    { color: "#121212", media: "(prefers-color-scheme: dark)" }
  ]
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
try {
  var theme = localStorage.getItem("electricity-ledger-theme") || "system";
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  var resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.dataset.theme = theme;
} catch (_) {}
`
          }}
        />
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}

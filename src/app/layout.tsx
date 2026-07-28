import type { Metadata } from "next";
import type { Viewport } from "next";
import Script from "next/script";
import { PwaRegistrar } from "@/components/pwa/pwa-registrar";
import type { RootLayoutProps } from "./types";
import "./globals.css";

// iOS only reads the web manifest icon for the home-screen icon, not the
// launch splash screen -- it needs an exact-pixel PNG per device matched by
// a `(device-width)/(device-height)/(-webkit-device-pixel-ratio)` media
// query, or it just shows a blank white screen. `/splash` renders the same
// mark as app-icon.tsx at whatever size is requested. Portrait sizes only,
// since the manifest locks orientation to portrait. List covers the last
// several years of iPhone/iPad models -- not exhaustive, but close.
const appleSplashSizes: Array<{ width: number; height: number; dpr: number }> = [
  { width: 375, height: 667, dpr: 2 },
  { width: 414, height: 736, dpr: 3 },
  { width: 375, height: 812, dpr: 3 },
  { width: 414, height: 896, dpr: 2 },
  { width: 414, height: 896, dpr: 3 },
  { width: 390, height: 844, dpr: 3 },
  { width: 428, height: 926, dpr: 3 },
  { width: 393, height: 852, dpr: 3 },
  { width: 430, height: 932, dpr: 3 },
  { width: 402, height: 874, dpr: 3 },
  { width: 440, height: 956, dpr: 3 },
  { width: 768, height: 1024, dpr: 2 },
  { width: 810, height: 1080, dpr: 2 },
  { width: 820, height: 1180, dpr: 2 },
  { width: 834, height: 1194, dpr: 2 },
  { width: 1024, height: 1366, dpr: 2 }
];

const appleSplashImages = appleSplashSizes.map(({ width, height, dpr }) => ({
  url: `/splash?w=${width * dpr}&h=${height * dpr}`,
  media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`
}));

export const metadata: Metadata = {
  title: "NewinMeter",
  description: "Your usage. Finally clear.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NewinMeter",
    startupImage: appleSplashImages
  },
  verification: {
    google: "z_wEWDWLL9ymDqwg8TujdHSPuuBKFWGngpjklpeV-4o"
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
  var theme = localStorage.getItem("electricity-ledger-theme") || "light";
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

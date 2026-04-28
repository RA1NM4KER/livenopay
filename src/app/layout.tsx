import type { Metadata } from "next";
import Script from "next/script";
import type { RootLayoutProps } from "./types";
import "./globals.css";

export const metadata: Metadata = {
  title: "Electricity Ledger",
  description: "Your electricity usage, your data, your control."
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
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Livenopay",
  description: "Local LiveMopay electricity analytics"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
try {
  var theme = localStorage.getItem("livenopay-theme") || "system";
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  var resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.dataset.theme = theme;
} catch (_) {}
`
          }}
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

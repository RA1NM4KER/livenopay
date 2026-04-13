import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        accentSoft: "rgb(var(--color-accent-soft) / <alpha-value>)",
        amberSoft: "rgb(var(--color-amber-soft) / <alpha-value>)",
        roseSoft: "rgb(var(--color-rose-soft) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        fixed: "rgb(var(--color-fixed) / <alpha-value>)",
        projection: "rgb(var(--color-projection) / <alpha-value>)",
        spend: "rgb(var(--color-spend) / <alpha-value>)",
        usage: "rgb(var(--color-usage) / <alpha-value>)"
      },
      boxShadow: {
        soft: "var(--shadow-soft)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;

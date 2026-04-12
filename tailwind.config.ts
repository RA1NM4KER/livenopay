import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f7f6f2",
        paper: "#fffefa",
        ink: "#24231f",
        muted: "#77736a",
        line: "#e4e0d7",
        accent: "#6f7f6b",
        accentSoft: "#dfe6d9",
        amberSoft: "#ece0c7",
        roseSoft: "#ead9d3"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(36, 35, 31, 0.07)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;

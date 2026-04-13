"use client";

import { useEffect, useState } from "react";
import type { ThemeChoice } from "./types";

const storageKey = "livenopay-theme";

function applyTheme(choice: ThemeChoice) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = choice === "system" ? (prefersDark ? "dark" : "light") : choice;

  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.dataset.theme = choice;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeChoice>("system");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    const initialTheme = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";

    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  function updateTheme(nextTheme: ThemeChoice) {
    setTheme(nextTheme);
    window.localStorage.setItem(storageKey, nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <label className="flex items-center gap-2 rounded-lg border border-line bg-paper px-2 py-1 text-sm text-muted">
      <span className="sr-only">Theme</span>
      <select
        aria-label="Theme"
        className="h-8 rounded-md bg-transparent px-2 text-sm text-ink outline-none transition focus:bg-canvas"
        onChange={(event) => updateTheme(event.target.value as ThemeChoice)}
        value={theme}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Moon, Monitor, Sun } from "lucide-react";
import type { ThemeChoice } from "./types";

const storageKey = "electricity-ledger-theme";

function applyTheme(choice: ThemeChoice) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = choice === "system" ? (prefersDark ? "dark" : "light") : choice;

  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.dataset.theme = choice;
}

const themeOptions: Array<{ value: ThemeChoice; label: string; icon: JSX.Element }> = [
  { value: "light", label: "Light", icon: <Sun size={14} strokeWidth={2} /> },
  { value: "system", label: "System", icon: <Monitor size={14} strokeWidth={2} /> },
  { value: "dark", label: "Dark", icon: <Moon size={14} strokeWidth={2} /> }
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeChoice>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    const initialTheme = stored === "light" || stored === "dark" || stored === "system" ? stored : "light";

    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") applyTheme("system");
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  function updateTheme(next: ThemeChoice) {
    setTheme(next);
    window.localStorage.setItem(storageKey, next);
    applyTheme(next);
  }

  return (
    <div role="group" aria-label="Theme" className="inline-flex gap-0.5 rounded-lg border border-line bg-canvas p-0.5">
      {themeOptions.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => updateTheme(option.value)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium transition ${
              active ? "bg-paper text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

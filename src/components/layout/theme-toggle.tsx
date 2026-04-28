"use client";

import { useEffect, useState } from "react";
import { Moon, Monitor, Sun } from "lucide-react";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import type { ThemeChoice } from "./types";

const storageKey = "electricity-ledger-theme";

function applyTheme(choice: ThemeChoice) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = choice === "system" ? (prefersDark ? "dark" : "light") : choice;

  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.dataset.theme = choice;
}

const themeOptions = [
  { value: "light", label: "Light", icon: <Sun size={14} /> },
  { value: "system", label: "System", icon: <Monitor size={14} /> },
  { value: "dark", label: "Dark", icon: <Moon size={14} /> }
];

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
      if (theme === "system") applyTheme("system");
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  function updateTheme(value: string) {
    const next = value as ThemeChoice;
    setTheme(next);
    window.localStorage.setItem(storageKey, next);
    applyTheme(next);
  }

  return (
    <DropdownSelect
      ariaLabel="Theme"
      value={theme}
      options={themeOptions}
      onChange={updateTheme}
      className="w-28"
      menuPlacement="bottom"
    />
  );
}

"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon/Icon";

/** localStorage key; the layout's anti-flash script reads the same one. */
const THEME_KEY = "tc-theme";

type Theme = "light" | "system" | "dark";

type ThemeOption = {
  value: Theme;
  label: string;
  icon: "sun" | "monitor" | "moon";
};

const OPTIONS: ThemeOption[] = [
  { value: "light", label: "Light theme", icon: "sun" },
  { value: "system", label: "System theme", icon: "monitor" },
  { value: "dark", label: "Dark theme", icon: "moon" },
];

type ThemeToggleProps = {
  className?: string;
};

/**
 * Three-state theme picker. An explicit choice sets [data-theme] on
 * <html>, which forces color-scheme and flips every light-dark()
 * token; System clears both so the OS preference rules again. The
 * choice persists in localStorage and the layout's blocking script
 * replays it before first paint.
 *
 * Native radios in a fieldset, so the group semantics, single tab
 * stop, and arrow-key movement all come from the platform.
 */
export default function ThemeToggle({ className }: ThemeToggleProps) {
  // The server renders System; the real choice is read at mount, since
  // only the browser knows what the anti-flash script applied.
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = document.documentElement.dataset.theme;
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    if (next === "system") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = next;
    }
    try {
      if (next === "system") {
        localStorage.removeItem(THEME_KEY);
      } else {
        localStorage.setItem(THEME_KEY, next);
      }
    } catch {
      // Storage being unavailable only costs persistence.
    }
  }

  return (
    <fieldset
      className={className ? `tc-theme-toggle ${className}` : "tc-theme-toggle"}
    >
      <legend className="tc-visually-hidden">Theme</legend>
      {OPTIONS.map((option) => (
        <label className="tc-theme-toggle__option" key={option.value}>
          <input
            checked={option.value === theme}
            className="tc-visually-hidden"
            name="tc-theme"
            onChange={() => apply(option.value)}
            type="radio"
            value={option.value}
          />
          <Icon name={option.icon} size="sm" />
          <span className="tc-visually-hidden">{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

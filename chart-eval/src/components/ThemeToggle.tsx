import type { ReactElement } from "react";
import { useTheme } from "../theme/ThemeContext";

/**
 * Accessible control to switch light / dark appearance (persists in localStorage).
 */
export function ThemeToggle(): ReactElement {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span className="theme-toggle__icon" aria-hidden>
        {isDark ? "☀️" : "🌙"}
      </span>
      <span className="theme-toggle__label">{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}

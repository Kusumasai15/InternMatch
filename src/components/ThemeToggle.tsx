import { Moon, Sun } from "lucide-react";
import { useSettings } from "../lib/settings";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useSettings();
  const dark = theme === "dark";
  const current = dark ? "Midnight Ocean" : "Ocean Light";
  return <button type="button" className="theme-toggle ocean-theme-toggle" onClick={toggleTheme}
    aria-label={`Switch to ${dark ? "Ocean Light" : "Midnight Ocean"}`} aria-pressed={dark} title={`Current theme: ${current}`}>
    {dark ? <Moon size={16} aria-hidden="true"/> : <Sun size={16} aria-hidden="true"/>}
    <span>{current}</span>
  </button>;
}

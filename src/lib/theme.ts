export type Theme = "dark" | "light";
export const PREFERENCES_KEY = "sihmatch-preferences-v1";

/** Keep existing preferences compatible; first visits use Midnight Ocean. */
export function readPreferences() {
  try {
    const value = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? "{}");
    return {
      language: ["en", "hi", "te"].includes(value?.language) ? value.language as "en" | "hi" | "te" : "en" as const,
      theme: value?.theme === "light" ? "light" as const : "dark" as const,
    };
  } catch { return { language: "en" as const, theme: "dark" as const }; }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0D2231" : "#F7F8F6");
}

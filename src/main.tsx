import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./professional.css";

// Load App inside the boundary so a module-initialization error is recoverable.
const App = React.lazy(() => import("./App"));

function prepareStartupStorage() {
  const object = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);
  const strings = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every(item => typeof item === "string");
  const validators: Record<string, (value: unknown) => boolean> = {
    "sihmatch-profile-v1": value => object(value) &&
      typeof value.name === "string" && typeof value.branch === "string" &&
      typeof value.location === "string" && typeof value.cgpa === "number" &&
      Number.isFinite(value.cgpa) && value.cgpa >= 0 && value.cgpa <= 10 &&
      strings(value.skills) && strings(value.interests),
    "sihmatch-saved-v1": strings,
    "sihmatch-preferences-v1": value => object(value) &&
      ["en", "hi", "te"].includes(String(value.language)) &&
      ["light", "dark"].includes(String(value.theme)),
    "sihmatch-catalog-v1": value => object(value) && value.version === 1 &&
      Array.isArray(value.items) && value.items.every(object),
    "sihmatch-applications-v1": value => object(value) && value.version === 1 &&
      Array.isArray(value.items) && value.items.every(object),
    "sihmatch-activity-v1": value => object(value) && value.version === 1 &&
      Array.isArray(value.items) && value.items.every(object),
  };
  for (const [key, validate] of Object.entries(validators)) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) continue;
      const value: unknown = JSON.parse(raw);
      if (!validate(value)) {
        window.localStorage.removeItem(key);
      } else if (key === "sihmatch-preferences-v1" && object(value)) {
        // Keep the selected theme, with English labels after removing the switcher.
        window.localStorage.setItem(key, JSON.stringify({ ...value, language: "en" }));
      }
    } catch {
      try { window.localStorage.removeItem(key); } catch { /* Use reader defaults. */ }
    }
  }
}

class StartupBoundary extends React.Component<
  { children: React.ReactNode }, { error: string | null; resetError: string }
> {
  state = { error: null as string | null, resetError: "" };
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : "An unexpected startup error occurred." };
  }
  reset = () => {
    try {
      const keys = Object.keys(window.localStorage).filter(key => key.startsWith("sihmatch-"));
      keys.forEach(key => window.localStorage.removeItem(key));
      window.location.reload();
    } catch {
      this.setState({ resetError: "Browser storage is unavailable. Enable storage and reload this page." });
    }
  };
  render() {
    return this.state.error ? <main className="empty-state panel" role="alert">
      <h1>InternMatch could not start</h1>
      <p>{this.state.error}</p>
      <p>Resetting clears this browser's cached profiles, saved roles and tracker notes. Your account and published internships stay on the server.</p>
      <button className="button button-dark" onClick={this.reset}>Reset browser cache</button>
      {this.state.resetError && <p>{this.state.resetError}</p>}
    </main> : this.props.children;
  }
}

prepareStartupStorage();
const root = document.getElementById("root");
if (!root) throw new Error("Missing application root element");
createRoot(root).render(<React.StrictMode><StartupBoundary>
  <React.Suspense fallback={<main className="empty-state panel" role="status">Loading InternMatch…</main>}>
    <App/>
  </React.Suspense>
</StartupBoundary></React.StrictMode>);

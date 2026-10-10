import { afterEach, describe, expect, it, vi } from "vitest";
import { readPreferences, applyTheme } from "./theme";
afterEach(() => vi.unstubAllGlobals());
describe("ocean theme preferences", () => {
  it("defaults to Midnight Ocean when preferences are missing or storage fails", () => {
    vi.stubGlobal("localStorage", { getItem: () => null });
    expect(readPreferences().theme).toBe("dark");
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("unavailable"); } });
    expect(readPreferences().theme).toBe("dark");
  });
  it("keeps an existing Ocean Light preference and rejects malformed preferences", () => {
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({theme:"light",language:"hi"}) });
    expect(readPreferences()).toEqual({theme:"light",language:"hi"});
    vi.stubGlobal("localStorage", { getItem: () => "broken" });
    expect(readPreferences()).toEqual({theme:"dark",language:"en"});
  });
  it("updates the root and browser theme color without reloading", () => {
    const setAttribute = vi.fn();
    const dataset: Record<string, string> = {};
    vi.stubGlobal("document", {documentElement:{dataset},querySelector:()=>({setAttribute})});
    applyTheme("light");
    expect(dataset.theme).toBe("light");
    expect(setAttribute).toHaveBeenLastCalledWith("content", "#F0F7FC");
    applyTheme("dark");
    expect(dataset.theme).toBe("dark");
  });
});

import { describe, it, expect } from "vitest";
import { pageFor } from "./routes";
describe("dashboard navigation", () => {
  it("opens every explicit page even without a saved profile", () => {
    for (const ready of [false, true]) {
      for (const route of ["profile", "internships", "recommendations", "graph", "applications"] as const) expect(pageFor("/" + route, ready)).toBe(route);
      expect(pageFor("/internships/demo", ready)).toBe("detail");
    }
  });
  it("keeps students out of the admin workspace", () => {
    expect(pageFor("/admin", true)).toBe("internships");
    expect(pageFor("/admin", false)).toBe("internships");
    expect(pageFor("/admin", false, "admin")).toBe("admin");
    expect(pageFor("/", false, "admin")).toBe("admin");
  });
  it("shows onboarding only on the landing route until a profile is saved", () => {
    expect(pageFor("/", false)).toBe("profile");
    expect(pageFor("/", true)).toBe("recommendations");
  });
});

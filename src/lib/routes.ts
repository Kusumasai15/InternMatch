import type { AppRoute } from "../types";

export function pageFor(path: string, hasProfile: boolean, role: "student" | "admin" = "student"): AppRoute {
  if (path === "/admin") return role === "admin" ? "admin" : "internships";
  if (path.startsWith("/internships/")) return "detail";
  if (path === "/profile") return "profile";
  if (path === "/internships") return "internships";
  if (path === "/graph") return "graph";
  if (path === "/recommendations") return "recommendations";
  if (path === "/applications") return "applications";
  if (role === "admin") return "admin";
  return hasProfile ? "recommendations" : "profile";
}

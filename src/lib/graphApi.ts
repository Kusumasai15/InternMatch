// Send the current profile and catalog to FastAPI for NetworkX graph calculations.
import type { Internship, Profile } from "../types";

export type GraphAnalytics = {
  nodeCounts: Record<string, number>;
  edgeCount: number;
  averageDegree: number;
  topSkills: Array<{ skill: string; centrality: number; demand: number; supply: number; gap: number; community: number }>;
  recommendations: Array<{
    internshipId: string;
    role: string;
    company: string;
    jaccard: number;
    proximity: number;
    communityCoverage: number;
    graphScore: number;
    shortestPath: number | null;
    matchingSkills: string[];
    missingSkills: string[];
  }>;
  communities: Array<{ id: number; label: string; skills: string[]; size: number }>;
  paths: Array<{ internshipId: string; path: string[] }>;
};

import { API_URL } from "./api";

export async function fetchGraphAnalytics(profile: Profile, internships: Internship[], signal?: AbortSignal): Promise<GraphAnalytics> {
  const response = await fetch(`${API_URL}/api/analytics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      profile,
      internships: internships.map(({ id, role, company, sector, location, workMode, minCgpa, branches, requiredSkills, interests }) => ({
        id, role, company, sector, location, workMode, minCgpa, branches, requiredSkills, interests,
      })),
    }),
  });
  if (!response.ok) throw new Error(`Graph analytics service returned ${response.status}.`);
  return response.json() as Promise<GraphAnalytics>;
}

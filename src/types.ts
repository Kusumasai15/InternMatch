export type Profile = {
  name: string;
  branch: string;
  cgpa: number;
  location: string;
  skills: string[];
  interests: string[];
};

export type Internship = {
  id: string;
  role: string;
  company: string;
  sector: string;
  logo: string;
  logoTone: string;
  location: string;
  workMode: "Hybrid" | "Remote" | "On-site";
  stipend: number;
  duration: string;
  closing: string;
  minCgpa: number;
  branches: string[];
  requiredSkills: string[];
  interests: string[];
  openings: number;
  applicants: number;
  summary: string;
};

export type ScoreBreakdown = {
  score: number;
  eligible: boolean;
  missingRequirements: string[];
  factors: {
    skills: number;
    interests: number;
    location: number;
    academics: number;
  };
  matchedSkills: string[];
  matchedInterests: string[];
  missingSkills: string[];
  reasons: string[];
  exclusionReason: string | null;
  graphBonus: number;
  weights: MatchWeights;
};

export type AppRoute = "admin" | "resume" | "profile" | "internships" | "graph" | "recommendations" | "detail" | "applications";

export type MatchWeights = { skills: number; interests: number; location: number; academics: number };

export type ApplicationRecord = { id: string; stage: "Saved" | "Applied" | "Interview" | "Offer" | "Rejected"; notes: string; deadline: string };

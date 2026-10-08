// Recommendation rules: check eligibility first, then score how well the profile fits.
import type { Internship, Profile, ScoreBreakdown, MatchWeights } from "../types";

export const DEFAULT_WEIGHTS: MatchWeights = { skills: 50, interests: 20, location: 15, academics: 15 };
const aliases: Record<string, string> = { js: "javascript", ml: "machine learning", ts: "typescript", "nodejs": "node.js", "node js": "node.js", "nextjs": "next.js", "next js": "next.js", "reactjs": "react", "react.js": "react", "py": "python", "amazon web services": "aws" };
export const normalizeSkill = (value: string) => aliases[value.toLowerCase().trim()] ?? value.toLowerCase().trim();
const normalise = (value: string) => value.toLowerCase().trim();
export const related: Record<string, string[]> = { react: ["next.js", "javascript"], "next.js": ["react", "javascript"], javascript: ["typescript", "react", "next.js"], typescript: ["javascript"], python: ["machine learning"], "machine learning": ["python", "statistics"], statistics: ["machine learning"], aws: ["azure", "cloud computing"], azure: ["aws", "cloud computing"] };
export function normalizeWeights(input: MatchWeights): MatchWeights {
  const keys = Object.keys(DEFAULT_WEIGHTS) as (keyof MatchWeights)[];
  const values = keys.map(key => Number.isFinite(input[key]) ? Math.max(0, input[key]) : 0);
  const total = values.reduce((a, b) => a + b, 0);
  if (!total) return { ...DEFAULT_WEIGHTS };
  const rounded = values.map(v => Math.floor(v / total * 100));
  const order = keys.map((_, i) => i).sort((a, b) => (values[b] / total * 100 - rounded[b]) - (values[a] / total * 100 - rounded[a]));
  const remainder = 100 - rounded.reduce((a, b) => a + b, 0);
  for (let i = 0; i < remainder; i++) rounded[order[i]]++;
  return Object.fromEntries(keys.map((key, i) => [key, rounded[i]])) as MatchWeights;
}
const overlaps = (left: string[], right: string[]) => right.filter(item => new Set(left.map(normalise)).has(normalise(item)));
/** Student skill -> another internship -> co-occurring required skill; target is excluded. */
function graphSignal(profile: Profile, target: Internship, openings: Internship[], missing: string[]) {
  const skills = new Set(profile.skills.map(normalizeSkill));
  const reachable = new Set<string>();
  for (const job of openings) {
    if (job.id === target.id || !job.requiredSkills.some(s => skills.has(normalizeSkill(s)))) continue;
    for (const skill of job.requiredSkills) reachable.add(normalizeSkill(skill));
  }
  return target.requiredSkills.length ? Math.min(8, missing.filter(s => reachable.has(normalizeSkill(s))).length / target.requiredSkills.length * 8) : 0;
}

/**
 * Eligibility is a hard gate; eligible students are ranked by a transparent
 * 50/20/15/15 blend of required-skill coverage, interest fit, location, and CGPA.
 */
export function scoreInternship(profile: Profile, opening: Internship, inputWeights: MatchWeights = DEFAULT_WEIGHTS, openings: Internship[] = []): ScoreBreakdown {
  const branchEligible = opening.branches.includes(profile.branch);
  const cgpaEligible = profile.cgpa >= opening.minCgpa;
  const eligible = branchEligible && cgpaEligible;
  const weights = normalizeWeights(inputWeights);
  const studentSkills = new Set(profile.skills.map(normalizeSkill));
  const requirements = [...new Map(opening.requiredSkills.map(skill => [normalizeSkill(skill), skill])).values()];
  const matchedSkills = requirements.filter(skill => studentSkills.has(normalizeSkill(skill)));
  const missingSkills = requirements.filter(skill => !studentSkills.has(normalizeSkill(skill)));
  const coverage = requirements.reduce((sum, skill) => sum + (studentSkills.has(normalizeSkill(skill)) ? 1 : (related[normalizeSkill(skill)] ?? []).some(s => studentSkills.has(s)) ? 0.5 : 0), 0);
  const baseSkills = requirements.length ? coverage / requirements.length * 100 : 100;
  const graphBonus = Math.round(Math.min(100 - baseSkills, graphSignal(profile, opening, openings, missingSkills)) * 100) / 100;
  const matchedInterests = overlaps(profile.interests, opening.interests);
  const skillFit = Math.min(100, Math.round(baseSkills + graphBonus));
  const interestFit = opening.interests.length ? Math.round((matchedInterests.length / opening.interests.length) * 100) : 100;
  const locationFit = opening.workMode === "Remote" || opening.location === "Remote"
    ? 100
    : opening.location.toLowerCase() === profile.location.toLowerCase()
      ? 100
      : opening.workMode === "Hybrid" ? 48 : 15;
  // Reward academic headroom without letting a high GPA overwhelm skills.
  const academicFit = Math.min(100, Math.round(70 + Math.max(0, profile.cgpa - opening.minCgpa) * 20));
  const raw = Math.round((skillFit * weights.skills + interestFit * weights.interests + locationFit * weights.location + academicFit * weights.academics) / 100);
  const missingRequirements = [
    ...(branchEligible ? [] : [`Branch not in eligible list (${opening.branches.map((branch) => branch.split(" ")[0]).join(", ")})`]),
    ...(cgpaEligible ? [] : [`CGPA ${opening.minCgpa.toFixed(1)} required; your CGPA is ${profile.cgpa.toFixed(1)}`]),
  ];
  return {
    score: eligible ? raw : 0,
    eligible,
    missingRequirements,
    factors: { skills: skillFit, interests: interestFit, location: locationFit, academics: academicFit },
    matchedSkills,
    matchedInterests,
    missingSkills,
    graphBonus,
    weights,
    exclusionReason: eligible ? null : missingRequirements.join("; "),
    reasons: [eligible ? "Eligible first. Relevant next. Here’s why." : `Excluded: ${missingRequirements.join("; ")}.`, `${matchedSkills.length} of ${requirements.length} required skills match directly; related skills earn half credit.`, `Graph bonus: +${graphBonus.toFixed(1)} skill points (maximum 8), inside the ${weights.skills}% skills component.`, `${interestFit}% interest fit; ${locationFit}% location fit; ${academicFit}% academic fit.`, ...missingRequirements],
  };
}

export function rankInternships(profile: Profile, openings: Internship[], weights: MatchWeights = DEFAULT_WEIGHTS) {
  return openings
    .map((opening) => ({ opening, match: scoreInternship(profile, opening, weights, openings) }))
    .sort((a, b) => Number(b.match.eligible) - Number(a.match.eligible) || b.match.score - a.match.score);
}

export const formatStipend = (amount: number) => `₹${(amount / 1000).toFixed(0)}k`;

export function skillGaps(profile: Profile, openings: Internship[], weights: MatchWeights = DEFAULT_WEIGHTS) {
  const ranked = rankInternships(profile, openings, weights).filter(({ match }) => match.eligible);
  const counts = new Map<string, {skill: string; frequency: number}>();
  for (const {match} of ranked.slice(0, 10)) for (const skill of match.missingSkills) {
    const key = normalizeSkill(skill);
    const current = counts.get(key);
    counts.set(key, {skill: current?.skill ?? skill, frequency: (current?.frequency ?? 0) + 1});
  }
  return [...counts.values()].map(({skill, frequency}) => ({skill, frequency,
    unlocks: ranked.filter(({match}) => match.missingSkills.length === 1 && normalizeSkill(match.missingSkills[0]) === normalizeSkill(skill)).length,
    learningUrl: /react|javascript|typescript|css|next|figma|prototyp/i.test(skill) ? "https://developer.mozilla.org/en-US/docs/Learn_web_development" : "https://www.freecodecamp.org/learn/"
  })).sort((a, b) => b.frequency - a.frequency || b.unlocks - a.unlocks || a.skill.localeCompare(b.skill)).slice(0, 5);
}

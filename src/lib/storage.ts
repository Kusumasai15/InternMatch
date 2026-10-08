// Browser storage: keep profile caches, saved internships, and tracker entries separate per account.
import { recordActivity } from "./activity";
import { branches } from "../data";
import type { Profile, ApplicationRecord } from "../types";

export const emptyProfile: Profile = { name: "", branch: "", cgpa: NaN, location: "", skills: [], interests: [] };
let storageAccount = "anonymous";
export function setStorageAccount(id: string) { storageAccount = id; }
export const storageAccountKey = (key: string) => `${key}:${storageAccount}`;
const PROFILE_KEY = "sihmatch-profile-v2";
const SAVED_KEY = "sihmatch-saved-v1";

export function readProfile(): Profile {
  try {
    const raw = window.localStorage.getItem(storageAccountKey(PROFILE_KEY));
    if (!raw) return { ...emptyProfile, skills: [], interests: [] };
    return parseProfile(JSON.parse(raw)) ?? { ...emptyProfile, skills: [], interests: [] };
  } catch {
    return { ...emptyProfile, skills: [], interests: [] };
  }
}

export function saveProfile(profile: Profile, accountId?: string) {
  try {
    const valid = parseProfile(profile);
    if (valid) window.localStorage.setItem(accountId ? `${PROFILE_KEY}:${accountId}` : storageAccountKey(PROFILE_KEY), JSON.stringify(valid));
  } catch {
    // Private browsing and quota errors do not block the live prototype session.
  }
}

export function readSaved(): string[] {
  try {
    const raw = window.localStorage.getItem(storageAccountKey(SAVED_KEY));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function writeSaved(ids: string[]) {
  try { window.localStorage.setItem(storageAccountKey(SAVED_KEY), JSON.stringify(ids)); } catch { /* Optional demo persistence. */ }
}

const TRACKER_KEY = "sihmatch-applications-v1";
export const APPLICATION_STAGES = ["Saved", "Applied", "Interview", "Offer", "Rejected"] as const;
export function parseProfile(value: unknown): Profile | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= 200;
  const list = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 100 && v.every(text);
  if ((typeof p.name !== "string" || p.name.length > 200) || !text(p.branch) || !branches.includes(p.branch) || !text(p.location) || typeof p.cgpa !== "number" || !Number.isFinite(p.cgpa) || p.cgpa < 0 || p.cgpa > 10 || !list(p.skills) || !p.skills.length || !list(p.interests) || !p.interests.length) return null;
  const clean = (items: string[]) => [...new Map(items.map(s => [s.trim().toLowerCase(), s.trim()])).values()];
  return {name:p.name.trim(), branch:p.branch, location:p.location.trim(), cgpa:p.cgpa, skills:clean(p.skills), interests:clean(p.interests)};
}
export function readApplications(): ApplicationRecord[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(storageAccountKey(TRACKER_KEY)) ?? "null");
    if (!value || typeof value !== "object") return [];
    const envelope = value as Record<string, unknown>;
    if (envelope.version !== 1 || !Array.isArray(envelope.items)) return [];
    const items: ApplicationRecord[] = [];
    for (const raw of envelope.items.slice(0, 500)) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;
      if (typeof item.id !== "string" || !item.id || item.id.length > 200 || typeof item.stage !== "string" || !APPLICATION_STAGES.some(stage => stage === item.stage)) continue;
      const deadline = typeof item.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.deadline) && Number.isFinite(Date.parse(item.deadline)) ? item.deadline : "";
      items.push({id:item.id, stage:item.stage as ApplicationRecord["stage"], notes:typeof item.notes === "string" ? item.notes.slice(0,4000) : "", deadline});
    }
    return [...new Map(items.map(item => [item.id,item])).values()];
  } catch { return []; }
}
export function writeApplications(items: ApplicationRecord[]): boolean {
  try { const previous = readApplications(); window.localStorage.setItem(storageAccountKey(TRACKER_KEY), JSON.stringify({version:1,items})); for (const item of items) if(item.stage !== "Saved" && previous.find(p=>p.id===item.id)?.stage !== item.stage) recordActivity("application",item.id); return true; } catch { return false; }
}
export function closingBadge(closing: string, now = new Date()): string {
  const end = new Date(closing); end.setHours(0,0,0,0);
  const today = new Date(now); today.setHours(0,0,0,0);
  if (!Number.isFinite(end.getTime())) return "Deadline unavailable";
  const days = Math.round((end.getTime()-today.getTime())/86400000);
  return days < 0 ? "Applications closed" : days === 0 ? "Closes today" : "Closing in " + days + " days";
}

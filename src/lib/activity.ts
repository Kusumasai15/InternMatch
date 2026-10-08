export type Activity = { type: "view" | "save" | "unsave" | "application" | "recommendation"; id: string; at: string; value: number };
import { storageAccountKey } from "./storage";
const KEY = "sihmatch-activity-v1";
export function readActivity(): Activity[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(storageAccountKey(KEY)) ?? "null");
    if (!data || typeof data !== "object") return [];
    const envelope = data as Record<string, unknown>;
    if (envelope.version !== 1 || !Array.isArray(envelope.items)) return [];
    return envelope.items.filter((r): r is Activity => !!r && typeof r === "object" && ["view","save","unsave","application","recommendation"].includes(r.type) && typeof r.id === "string" && typeof r.at === "string" && Number.isFinite(Date.parse(r.at)) && typeof r.value === "number" && Number.isFinite(r.value) && r.value >= 0).slice(-2000);
  } catch { return []; }
}
export function recordActivity(type: Activity["type"], id = "", value = 1) {
  try { localStorage.setItem(storageAccountKey(KEY), JSON.stringify({version:1,items:[...readActivity(),{type,id,at:new Date().toISOString(),value}].slice(-2000)})); window.dispatchEvent(new Event("sih-activity")); } catch { /* Analytics never block the app. */ }
}

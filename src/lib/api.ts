const configuredUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
export const API_URL = configuredUrl.endsWith("/") ? configuredUrl.slice(0, -1) : configuredUrl;
let csrfToken = "";
export function setCsrfToken(value: string) { csrfToken = value; }
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (options.method && !["GET", "HEAD"].includes(options.method) && csrfToken) headers.set("X-CSRF-Token", csrfToken);
  let response: Response;
  try { response = await fetch(API_URL + path, {...options, headers, credentials: "include"}); }
  catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new Error("Cannot connect to the server. Start the backend and try again.");
  }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/api/auth/")) window.dispatchEvent(new Event("sih-session-expired"));
    const result = await response.json().catch(() => ({}));
    const message = typeof result.detail === "string" ? result.detail : Array.isArray(result.detail) ? result.detail.map((item: {msg: string}) => item.msg).join(". ") : "The request could not be completed.";
    throw new ApiError(message, response.status);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

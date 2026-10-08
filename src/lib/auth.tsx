// Shared account state: pages use this provider to sign in, sign out, and save account changes.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Profile } from "../types";
import { api, ApiError, setCsrfToken } from "./api";
import { setStorageAccount, saveProfile as cacheProfile } from "./storage";
export type Account = {id: string; email: string; name: string; role: "student" | "admin"; profile: Profile | null};
type Session = {user: Account; csrfToken: string};
type Auth = {user: Account | null; loading: boolean; error: string; signIn: (email: string, password: string) => Promise<void>; register: (name: string, email: string, password: string) => Promise<void>; logout: () => Promise<void>; updateProfile: (profile: Profile) => Promise<void>; updateAccount: (details: {name: string; email: string; currentPassword: string; password?: string}) => Promise<void>; refresh: () => Promise<void>};
const Context = createContext<Auth | null>(null);
export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const accept = (session: Session | null) => {
    setStorageAccount(session?.user.id ?? "anonymous");
    setCsrfToken(session?.csrfToken ?? "");
    if (session?.user.profile) cacheProfile(session.user.profile);
    setUser(session?.user ?? null);
  };
  const refresh = async () => {
    setLoading(true); setError("");
    try { accept(await api<Session>("/api/auth/me")); }
    catch (err) { accept(null); if (!(err instanceof ApiError && err.status === 401)) setError((err as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    let active = true;
    api<Session>("/api/auth/me").then(session => {if(active)accept(session);}).catch(err => {if(active){accept(null);if(!(err instanceof ApiError && err.status===401))setError(err.message);}}).finally(()=>{if(active)setLoading(false);});
    const expired = () => {accept(null);setError("Your session expired. Sign in again.");};
    window.addEventListener("sih-session-expired", expired);
    return () => {active=false;window.removeEventListener("sih-session-expired", expired);};
  }, []);
  const signIn = async (email: string, password: string) => {accept(await api<Session>("/api/auth/login", {method:"POST",body:JSON.stringify({email,password})}));setError("");};
  const register = async (name: string, email: string, password: string) => {accept(await api<Session>("/api/auth/register", {method:"POST",body:JSON.stringify({name,email,password})}));setError("");};
  const logout = async () => {try {await api("/api/auth/logout", {method:"POST"});} catch(error) {if(!(error instanceof ApiError && error.status===401))throw error;} accept(null);};
  const updateProfile = async (profile: Profile) => {
    const accountId = user?.id;
    if (!accountId) throw new Error("Sign in to save your profile.");
    const result = await api<Profile>("/api/profile", {method:"PUT",body:JSON.stringify(profile)});
    cacheProfile(result, accountId);setUser(previous=>previous?.id===accountId?{...previous,profile:result}:previous);
  };
  const updateAccount = async (details: {name: string; email: string; currentPassword: string; password?: string}) => {accept(await api<Session>("/api/admin/account", {method:"PUT",body:JSON.stringify(details)}));};
  return <Context.Provider value={{user,loading,error,signIn,register,logout,updateProfile,updateAccount,refresh}}>{children}</Context.Provider>;
}
export function useAuth() {const value=useContext(Context);if(!value)throw new Error("Missing account provider");return value;}

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "./api";
import { useAuth } from "./auth";
type Analysis = {skills: string[]; projectSkills: string[]; suggestedBranch: string | null; suggestedInterests: string[]; sectionsDetected: Record<string, boolean>};
type Result = {analysis: Analysis | null};

function useResumeState() {
  const {user, refresh} = useAuth();
  const operation = useRef(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [entry, setEntry] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const accept = (result: Result) => {setAnalysis(result.analysis);setSkills(result.analysis?.skills ?? []);};
  const request = useRef<Promise<Result> | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    request.current ??= api<Result>("/api/resume");
    request.current.then(result => {if(active)accept(result);})
      .catch(err => {if(active)setError(err.message);})
      .finally(() => {if(active)setLoading(false);});
    return () => {active=false;};
  }, []);
  const upload = async (file: File, onExtract?: (skills: string[]) => void) => {
    if(operation.current || loading) return;
    setError("");setMessage("");
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["pdf", "docx"].includes(extension)) {setError("Choose a PDF or DOCX resume.");return;}
    if (!file.size || file.size > 5 * 1024 * 1024) {setError("Choose a non-empty resume of at most 5 MB.");return;}
    operation.current=true;setBusy(true);setProgress(0);
    try {
      const uploadId = crypto.randomUUID();
      for (let offset=0, index=0; offset<file.size; offset+=2*1024*1024, index++) {
        const bytes = new Uint8Array(await file.slice(offset, offset+2*1024*1024).arrayBuffer());
        let binary="";
        for(let start=0;start<bytes.length;start+=8192) binary+=String.fromCharCode(...bytes.subarray(start,start+8192));
        const final=offset+bytes.length>=file.size;
        setMessage(final ? "Analyzing document…" : "Uploading securely…");
        const result=await api<Result>("/api/resume/upload", {method:"POST", body:JSON.stringify({uploadId,extension,index,data:btoa(binary),final})});
        setProgress(Math.round((offset+bytes.length)/file.size*100));
        if(final) {accept(result);if(!user?.profile)onExtract?.(result.analysis?.skills ?? []);}
      }
      setMessage(user?.profile ? "Analysis saved. Review the skills below. Your personalized recommendations have refreshed." : "Analysis saved. Review your skills, then complete and save your profile to personalize recommendations.");
      if(user?.profile) await refresh();
    } catch(err) {setError((err as Error).message);}
    finally {operation.current=false;setBusy(false);}
  };
  const save = async (onExtract?: (skills: string[]) => void) => {
    if(operation.current || loading) return;
    operation.current=true;setBusy(true);setError("");setMessage("");
    try {accept(await api<Result>("/api/resume", {method:"PUT",body:JSON.stringify({skills})}));setMessage(user?.profile ? "Reviewed skills saved; recommendations refreshed." : "Reviewed skills saved. Complete and save your profile to personalize recommendations.");if(user?.profile)await refresh();else onExtract?.(skills);}
    catch(err) {setError((err as Error).message);}finally {operation.current=false;setBusy(false);}
  };
  const remove = async () => {
    if(operation.current || loading) return;
    operation.current=true;setBusy(true);setError("");setMessage("");
    try {await api("/api/resume", {method:"DELETE"});accept({analysis:null});setMessage("Resume analysis and introduced profile skills deleted.");await refresh();}
    catch(err) {setError((err as Error).message);}finally {operation.current=false;setBusy(false);}
  };
  const add = () => {const value=entry.trim();if(value && value.length<=200 && skills.length<100 && !skills.some(skill=>skill.toLowerCase()===value.toLowerCase()))setSkills([...skills,value]);setEntry("");};
  return {analysis, skills, setSkills, entry, setEntry, busy, loading, progress, message, error, upload, save, remove, add};
}
const ResumeContext = createContext<ReturnType<typeof useResumeState> | null>(null);
function StudentResumeProvider({children}: {children: ReactNode}) {
  const state = useResumeState();
  return <ResumeContext.Provider value={state}>{children}</ResumeContext.Provider>;
}
// Preserve analysis and pending edits across navigation and account refreshes.
// Account changes discard resume state. Guests and admins never fetch it.
export function ResumeProvider({children}: {children: ReactNode}) {
  const {user} = useAuth();
  return user?.role === "student" ? <StudentResumeProvider key={user.id}>{children}</StudentResumeProvider> : <>{children}</>;
}
export function useResume() {return useContext(ResumeContext);}

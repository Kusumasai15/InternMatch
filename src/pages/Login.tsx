import { useState, type FormEvent } from "react";
import { ArrowRight, GraduationCap, ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/auth";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
export default function Login() {
  const {signIn, register, error: connectionError, refresh} = useAuth();
  const [mode,setMode] = useState<"login" | "register">("login");
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();setBusy(true);setError("");
    try {if(mode === "register")await register(name.trim(),email.trim(),password);else await signIn(email.trim(),password);setPassword("");}
    catch(err){setError((err as Error).message);}finally{setBusy(false);}
  };
  return <main className="auth-shell"><section className="auth-intro"><Logo/><div><span className="eyebrow">YOUR NEXT OPPORTUNITY</span><h1>Find an internship<br/>that fits you.</h1><p>Build your student profile, explore opportunities, and see how your skills connect to meaningful work.</p><div className="auth-benefit"><GraduationCap size={22}/><span><strong>For students</strong>Personal recommendations from your skills and interests.</span></div><div className="auth-benefit"><ShieldCheck size={22}/><span><strong>For admins</strong>Publish internships and manage the shared catalog.</span></div></div><small>InternMatch – Student–Internship Recommendation System</small></section><section className="auth-panel"><div className="auth-theme-control"><ThemeToggle/></div><form className="auth-form panel" onSubmit={submit}><span className="eyebrow">WELCOME TO INTERNMATCH</span><h2>{mode === "login" ? "Sign in" : "Create a student account"}</h2><p>{mode === "login" ? "Sign in to access your workspace." : "Save your profile and start exploring internships."}</p><div className="auth-tabs" role="group" aria-label="Account access"><button type="button" aria-pressed={mode==="login"} disabled={busy} onClick={()=>{setMode("login");setError("");}}>Sign in</button><button type="button" aria-pressed={mode==="register"} disabled={busy} onClick={()=>{setMode("register");setError("");}}>Student registration</button></div>{mode === "register" && <label className="form-field">Name<input required maxLength={200} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>}<label className="form-field">Email address<input type="email" required maxLength={254} autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="form-field">Password<input type="password" required minLength={10} maxLength={128} autoComplete={mode==="login"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)}/><small className="field-helper">{mode==="register"?"Use at least 10 characters.":"Use your student or admin account credentials."}</small></label>{(error||connectionError)&&<div className="form-errors" role="alert">{error||connectionError}</div>}<button className="button button-dark button-block" type="submit" disabled={busy}>{busy?"Please wait…":mode==="login"?"Sign in":"Create account"}<ArrowRight size={16}/></button>{connectionError&&<button className="text-action" type="button" disabled={busy} onClick={()=>void refresh()}>Retry connection</button>}<p className="auth-note">Admin accounts are created by your project administrator.</p></form></section></main>;
}

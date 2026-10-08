import { useSettings } from "../lib/settings";
import type { Label } from "../i18n";
import { Activity, BriefcaseBusiness, ChevronDown, ChevronLeft, CircleHelp, GraduationCap, Settings2, Sparkles } from "lucide-react";
import type { AppRoute, Profile } from "../types";
import { rankInternships } from "../lib/matching";
import Logo from "./Logo";

const primaryNav: Array<{ route: string; label: string; icon: typeof BriefcaseBusiness }> = [
  { route: "/profile", label: "My profile", icon: GraduationCap },
  { route: "/internships", label: "Internships", icon: BriefcaseBusiness }, { route: "/recommendations", label: "For you", icon: Sparkles },
  { route: "/graph", label: "Graph view", icon: Activity },
  { route: "/applications", label: "Applications", icon: BriefcaseBusiness },
];

export default function Sidebar({mobileNav, pathname, route, ranked, profile, navigate, setToast, role="student"}: {mobileNav: boolean; pathname: string; route: AppRoute; ranked: ReturnType<typeof rankInternships>; profile: Profile; navigate: (path:string)=>void; setToast:(message:string)=>void; role?:"student"|"admin"}) { const {t}=useSettings(); const navKey:Record<string,Label>={"/admin":"admin","/profile":"profile","/internships":"internships","/recommendations":"recommendations","/graph":"graph","/applications":"applications"}; return (      <aside className={`sidebar${mobileNav ? " sidebar--open" : ""}`}>
        <div className="sidebar-top"><Logo/><button className="sidebar-collapse" aria-label={t("close")} onClick={()=>navigate(pathname)}><ChevronLeft size={14}/></button></div>
        <div className="workspace-switcher"><span className="workspace-symbol">I</span><span><strong>InternMatch</strong><small>Project workspace</small></span><ChevronDown size={14}/></div>
        <nav className="side-nav" aria-label="Main navigation"><span className="nav-section-label">{t("workspace")}</span>{(role === "admin" ? [{route:"/admin",label:"Manage internships",icon:Settings2},{route:"/internships",label:"Internships",icon:BriefcaseBusiness}] : primaryNav).map(({ route: itemRoute, icon: Icon }) => <a aria-current={route===itemRoute.slice(1) || (itemRoute==="/internships"&&route==="detail")?"page":undefined} href={itemRoute} key={itemRoute} onClick={(e) => { e.preventDefault(); navigate(itemRoute); }} className={`nav-link${route === itemRoute.slice(1) || (itemRoute === "/internships" && (route === "detail" || route === "internships")) || (itemRoute === "/recommendations" && route === "recommendations") ? " is-active" : ""}`}><Icon size={16}/><span>{t(navKey[itemRoute])}</span>{itemRoute === "/recommendations" && <b className="nav-count">{ranked.filter((item) => item.match.eligible).length}</b>}</a>)}
        </nav>
        <div className="sidebar-bottom"><div className="demo-mode-card"><div className="demo-mode-head"><span className="status-spark"><Sparkles size={12}/></span><span>SHARED WORKSPACE</span></div><p>Internships are managed by your admin. Your account keeps your profile personal.</p></div><button className="nav-help" onClick={() => setToast("Tip: refine your profile to surface new graph connections.")}><CircleHelp size={15}/><span>Help & guidance</span><span className="help-key">?</span></button><button className="sidebar-profile" onClick={() => navigate(role === "admin" ? "/admin" : "/profile")}><span className="student-avatar">{(profile.name || "Student").split(" ").map((n) => n[0]).slice(0,2).join("")}</span><span className="sidebar-profile-copy"><strong>{profile.name || (role === "admin" ? "Admin" : "Student")}</strong><small>{role === "admin" ? "Admin account" : profile.branch ? profile.branch.split(" ").slice(0,2).join(" ") + " · " + (Number.isFinite(profile.cgpa) ? profile.cgpa.toFixed(1) : "—") : "Complete your profile"}</small></span><Settings2 size={15}/></button></div>
      </aside>); }

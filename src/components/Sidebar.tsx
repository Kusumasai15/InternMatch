import { useEffect, useRef, useState } from "react";
import { useSettings } from "../lib/settings";
import type { Label } from "../i18n";
import { Activity, BriefcaseBusiness, ChevronLeft, CircleHelp, GraduationCap, Settings2, Sparkles, FileUp, X } from "lucide-react";
import type { AppRoute, Profile } from "../types";
import { rankInternships } from "../lib/matching";
import Logo from "./Logo";

const primaryNav: Array<{ route: string; label: string; icon: typeof BriefcaseBusiness }> = [
  { route: "/profile", label: "My profile", icon: GraduationCap },
  { route: "/resume", label: "Upload resume", icon: FileUp },
  { route: "/internships", label: "Internships", icon: BriefcaseBusiness }, { route: "/recommendations", label: "For you", icon: Sparkles },
  { route: "/graph", label: "Graph view", icon: Activity },
  { route: "/applications", label: "Applications", icon: BriefcaseBusiness },
];

export default function Sidebar({mobileNav, pathname, route, ranked, profile, navigate, role="student"}: {mobileNav: boolean; pathname: string; route: AppRoute; ranked: ReturnType<typeof rankInternships>; profile: Profile; navigate: (path:string)=>void; setToast:(message:string)=>void; role?:"student"|"admin"}) { const {t}=useSettings(); const [guideOpen, setGuideOpen] = useState(false); const guideRef = useRef<HTMLDialogElement>(null); const navKey:Record<string,Label>={"/admin":"admin","/profile":"profile","/resume":"resume","/internships":"internships","/recommendations":"recommendations","/graph":"graph","/applications":"applications"}; useEffect(() => { const dialog = guideRef.current; if (guideOpen && dialog && !dialog.open) dialog.showModal(); }, [guideOpen]); return (      <aside className={`sidebar${mobileNav ? " sidebar--open" : ""}`}>
        <div className="sidebar-top"><Logo/><button className="sidebar-collapse" aria-label={t("close")} onClick={()=>navigate(pathname)}><ChevronLeft size={14}/></button></div>
        <nav className="side-nav" aria-label="Main navigation"><span className="nav-section-label">{t("workspace")}</span>{(role === "admin" ? [{route:"/admin",label:"Manage internships",icon:Settings2},{route:"/internships",label:"Internships",icon:BriefcaseBusiness}] : primaryNav).map(({ route: itemRoute, icon: Icon }) => <a aria-current={route===itemRoute.slice(1) || (itemRoute==="/internships"&&route==="detail")?"page":undefined} href={itemRoute} key={itemRoute} onClick={(e) => { e.preventDefault(); navigate(itemRoute); }} className={`nav-link${route === itemRoute.slice(1) || (itemRoute === "/internships" && (route === "detail" || route === "internships")) || (itemRoute === "/recommendations" && route === "recommendations") ? " is-active" : ""}`}><Icon size={16}/><span>{t(navKey[itemRoute])}</span>{itemRoute === "/recommendations" && <b className="nav-count">{ranked.filter((item) => item.match.eligible).length}</b>}</a>)}
        </nav>
        <div className="sidebar-bottom"><button className="nav-help" onClick={() => setGuideOpen(true)} aria-haspopup="dialog"><CircleHelp size={15}/><span>Help & guidance</span><span className="help-key">?</span></button><button className="sidebar-profile" onClick={() => navigate(role === "admin" ? "/admin" : "/profile")}><span className="student-avatar">{(profile.name || "Student").split(" ").map((n) => n[0]).slice(0,2).join("")}</span><span className="sidebar-profile-copy"><strong>{profile.name || (role === "admin" ? "Admin" : "Student")}</strong><small>{role === "admin" ? "Admin account" : profile.branch ? profile.branch.split(" ").slice(0,2).join(" ") + " Â· " + (Number.isFinite(profile.cgpa) ? profile.cgpa.toFixed(1) : "â€”") : "Complete your profile"}</small></span><Settings2 size={15}/></button></div>
        <dialog className="guide-dialog" ref={guideRef} aria-labelledby="guide-title" onClose={() => setGuideOpen(false)}>
          <div className="guide-dialog-head"><div><span className="eyebrow">INTERNMATCH GUIDE</span><h2 id="guide-title">How this website works</h2></div><button className="icon-button" aria-label="Close guide" onClick={() => guideRef.current?.close()}><X size={18}/></button></div>
          <p className="guide-intro">InternMatch helps students explore internships and understand how their profile aligns with available opportunities.</p>
          <ol className="guide-steps">
            {role === "student" && <li><strong>Build your profile</strong><span>Add your education, skills, interests, and preferred location. You can optionally upload a resume for skill suggestions.</span></li>}
            {role === "student" && <li><strong>Explore opportunities</strong><span>Browse internships, search and filter the catalog, open a listing for details, and save roles you want to revisit.</span></li>}
            {role === "student" && <li><strong>Review your matches</strong><span>Recommendations compare your profile with internship requirements. Match scores are estimates, not hiring probabilities.</span></li>}
            {role === "student" && <li><strong>Keep track of next steps</strong><span>Use Applications to organize saved roles and update your personal progress. Tracking a role does not submit an application to a company.</span></li>}
            {role === "student" && <li><strong>See connections</strong><span>Graph view visualizes relationships among your profile and internship catalog, with related analytics.</span></li>}
            {role === "admin" && <li><strong>Manage the shared catalog</strong><span>Use Manage internships to publish and maintain internship listings available to student accounts.</span></li>}
            <li><strong>Your account stays personal</strong><span>Your profile and saved opportunities are associated with your account; internship listings are shared across the workspace.</span></li>
          </ol>
          <div className="guide-dialog-actions"><button className="button button-dark" onClick={() => guideRef.current?.close()}>Got it</button></div>
        </dialog>
      </aside>); }

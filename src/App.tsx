// Main workspace: chooses the page and connects account, profile, and catalog data.
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { SettingsProvider, useSettings } from "./lib/settings";
import ErrorBoundary from "./components/ErrorBoundary";
import { CatalogProvider, useCatalog } from "./lib/catalog";
import { AuthProvider, useAuth } from "./lib/auth";
import { ResumeProvider } from "./lib/resume";
import Login from "./pages/Login";
import { recordActivity } from "./lib/activity";
import { Check, ChevronRight, Menu, Search, LogOut, X } from "lucide-react";
import { rankInternships } from "./lib/matching";
import { emptyProfile, parseProfile, readSaved, writeSaved } from "./lib/storage";
import { pageFor } from "./lib/routes";
import Logo from "./components/Logo";
import ThemeToggle from "./components/ThemeToggle";
import LoadingSkeleton from "./components/LoadingSkeleton";
import Sidebar from "./components/Sidebar";

const ResumeUpload = lazy(() => import("./components/ResumeUpload"));
const ManageInternships = lazy(() => import("./pages/ManageInternships"));
const Applications = lazy(() => import("./pages/Applications"));
const ProfilePage = lazy(() => import("./pages/Profile"));
const InternshipListings = lazy(() => import("./pages/Internships"));
const DetailPage = lazy(() => import("./pages/InternshipDetail"));
const Recommendations = lazy(() => import("./pages/Recommendations"));
const GraphPage = lazy(() => import("./pages/Graph"));

function Workspace() {
  const {internships, error: catalogError, loading: catalogLoading, refresh: refreshCatalog} = useCatalog();
  const {user, logout, updateProfile} = useAuth();
  const {t} = useSettings();
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [queryString, setQueryString] = useState(() => window.location.search);
  const enteredProfile = useMemo(() => user?.profile ?? {...emptyProfile, name: user?.name ?? ""}, [user]);
  const [saved, setSaved] = useState<string[]>(() => typeof window === "undefined" ? [] : readSaved());
  const [searchText, setSearchText] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState("");
  const hasProfile = !!parseProfile(enteredProfile);
  const profile = useMemo(() => ({ ...enteredProfile, cgpa: Number.isFinite(enteredProfile.cgpa) ? enteredProfile.cgpa : 0 }), [enteredProfile]);
  const route = pageFor(pathname, hasProfile, user?.role);
  const detailId = pathname.match(/^\/internships\/([^/]+)/)?.[1] ?? "";
  const ranked = useMemo(() => rankInternships(profile, internships), [profile, internships]);
  const lastView=useRef("");
  const lastRanking=useRef("");
  useEffect(() => { if(lastView.current!==pathname){recordActivity("view", pathname);lastView.current=pathname;} }, [pathname]);
  useEffect(() => { const key=JSON.stringify(ranked.map(r=>[r.opening.id,r.match.score,r.match.eligible]));if(lastRanking.current!==key){recordActivity("recommendation", "", ranked.filter(r => r.match.eligible).length);lastRanking.current=key;} }, [ranked]);
  const activeTitle = t(route);
  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setPathname(window.location.pathname);
    setQueryString(window.location.search);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  useEffect(() => {
    const sync = () => { setPathname(window.location.pathname); setQueryString(window.location.search); };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => { writeSaved(saved); }, [saved]);
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(""), 3200); return () => window.clearTimeout(timer); } }, [toast]);
  const openJob = (id: string) => navigate(`/internships/${id}`);
  const toggleSaved = (id: string) => { recordActivity(saved.includes(id) ? "unsave" : "save", id); setSaved((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]); setToast(saved.includes(id) ? "Removed from your saved internships." : "Saved — your shortlist is waiting here."); };
  const pageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-route]");
    if (target?.dataset.route) navigate(target.dataset.route);
  };
  const onLogout = async () => { try { await logout(); window.history.replaceState({}, "", "/"); } catch(error) {setToast((error as Error).message);} };
  const onSearch = (event: FormEvent) => { event.preventDefault(); navigate(`/internships?q=${encodeURIComponent(searchText)}`); };
  let view: React.ReactNode;
  if (route === "admin" && user?.role === "admin") view = <ManageInternships/>;
  else if (route === "resume" && user?.role === "student") view = <div className="page-stack"><ResumeUpload onNavigate={navigate}/></div>;
  else if (route === "profile") view = <ProfilePage profile={enteredProfile} onUpdate={updateProfile} onNavigate={navigate} notify={setToast}/>;
  else if (route === "internships") {
    const query = new URLSearchParams(queryString).get("q") ?? "";
    const branch = new URLSearchParams(queryString).get("branch");
    view = <InternshipListings key={pathname + queryString} profile={profile} saved={saved} onOpen={openJob} onSave={toggleSaved} searchInitial={query} branchInitial={branch} setToast={setToast}/>;
  } else if (route === "recommendations") view = <Recommendations profile={profile} ranked={ranked} saved={saved} onSave={toggleSaved} onOpen={openJob} onNavigate={navigate}/>;
  else if (route === "applications") view = <Applications saved={saved} onSave={toggleSaved} onOpen={openJob} onNavigate={navigate}/>;
  else if (route === "graph") view = <GraphPage profile={profile}/>;
  else if (route === "detail") view = <DetailPage id={detailId} profile={profile} onBack={() => navigate("/internships")} onNavigate={navigate} saved={saved} onSave={toggleSaved}/>;
  else view = <Recommendations profile={profile} ranked={ranked} saved={saved} onSave={toggleSaved} onOpen={openJob} onNavigate={navigate}/>;
  return (
    <div className="app-shell" onClick={pageClick}><a className="skip-link" href="#main-content">{t("skip")}</a>
      {mobileNav && <button className="mobile-scrim" aria-label={t("close")} onClick={() => setMobileNav(false)}/>}
      <Sidebar mobileNav={mobileNav} pathname={pathname} route={route} ranked={ranked} profile={profile} navigate={navigate} setToast={setToast} role={user?.role}/>
      <div className="main-area"><header className="topbar"><button className="mobile-menu" aria-label={t("menu")} aria-expanded={mobileNav} onClick={() => setMobileNav(true)}><Menu size={19}/></button><div className="topbar-crumb"><span>InternMatch</span><ChevronRight size={13}/><strong>{activeTitle}</strong></div><div className="topbar-right"><ThemeToggle/><form className="global-search" onSubmit={onSearch}><Search size={15}/><input aria-label={t("search")} value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder={t("placeholder")}/></form><button className="outline-button logout-button" aria-label="Sign out" onClick={() => void onLogout()}><LogOut size={15}/><span>Sign out</span></button><span className="top-avatar">{(profile.name || "Student").split(" ").map((n) => n[0]).slice(0,2).join("")}</span></div></header>
        <main id="main-content" tabIndex={-1} className={`content-frame content-frame--${route}`} key={route + (route === "detail" ? detailId : "")}><div className="page-content">{user?.role === "student" && !hasProfile && route !== "profile" && <div className="graph-callout" role="status"><span>Complete and save your student profile for personalized matches and NetworkX analytics.</span><button className="outline-button" onClick={() => navigate("/profile")}>Complete profile</button></div>}{catalogError && <div role="alert" className="form-errors">{catalogError} <button className="text-action" onClick={() => void refreshCatalog()}>Retry</button></div>}<ErrorBoundary key={pathname} message={t("error")} retry={t("retry")}><Suspense fallback={<LoadingSkeleton label={t("loading")}/>}>{catalogLoading && route !== "resume" ? <LoadingSkeleton label="Loading internships..."/> : view}</Suspense></ErrorBoundary></div><footer className="app-footer"><span><Logo compact/> <span>InternMatch – Student–Internship Recommendation System</span></span><span>InternMatch <i/> Built for the next step.</span></footer></main>
      </div>
      {toast && <div role="status" className="toast"><span><Check size={15}/></span>{toast}<button aria-label="Dismiss notification" onClick={() => setToast("")}><X size={14}/></button></div>}
    </div>
  );
}

function SessionWorkspace(){const {user,loading}=useAuth();if(loading)return <main className="startup-loading"><LoadingSkeleton label="Connecting to your workspace..."/></main>;if(!user)return <Login/>;return <CatalogProvider key={user.id}><Workspace key={user.id}/></CatalogProvider>;}

export default function App(){return <SettingsProvider><AuthProvider><ResumeProvider><SessionWorkspace/></ResumeProvider></AuthProvider></SettingsProvider>;}

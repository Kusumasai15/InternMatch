import { useCatalog } from "../lib/catalog";
import CompareTable from "../components/CompareTable";
import { closingBadge } from "../lib/storage";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, Check, ChevronDown, ListFilter, Search, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { branches, cities } from "../data";
import type { Profile } from "../types";
import { rankInternships, normalizeSkill } from "../lib/matching";

import OpportunityCard from "../components/InternshipCard";
import FilterSelect from "../components/FilterBar";
import { SectionHeading } from "../components/Shared";
export default function InternshipListings({ profile, onOpen, saved, onSave, searchInitial, branchInitial, setToast }: {
  profile: Profile; onOpen: (id: string) => void; saved: string[]; onSave: (id: string) => void; searchInitial: string; branchInitial: string | null; setToast: (message: string) => void;
}) {
  const {internships} = useCatalog();
  const params = new URLSearchParams(window.location.search);
  const param = (key: string, fallback: string) => params.get(key) || fallback;
  const [compared, setCompared] = useState<string[]>([]);
  const toggleCompare = (id: string) => setCompared(prev => prev.includes(id) ? prev.filter(p => p !== id) : prev.length < 3 ? [...prev,id] : prev);
  const [workMode, setWorkMode] = useState(() => param("mode", "All modes"));
  const [keyword, setKeyword] = useState(searchInitial);
  const [location, setLocation] = useState(() => param("location", "All locations"));
  const [branch, setBranch] = useState(branchInitial || "All branches");
  const [skill, setSkill] = useState(() => param("skill", "All skills"));
  const [duration, setDuration] = useState(() => param("duration", "Any duration"));
  const [stipend, setStipend] = useState(() => param("stipend", "Any stipend"));
  const [minScore, setMinScore] = useState(() => Math.max(0, Math.min(100, Number(params.get("score")) || 0)));
  const [sort, setSort] = useState(() => param("sort", "Best match"));
  const [filtersOpen, setFiltersOpen] = useState(() => [...params.keys()].some(k => !["q", "sort"].includes(k)));
  const ranked = useMemo(() => rankInternships(profile, internships), [profile, internships]);
  const result = useMemo(() => ranked.filter(({ opening, match }) => {
    const text = `${opening.role} ${opening.company} ${opening.sector} ${opening.summary} ${opening.requiredSkills.join(" ")}`.toLowerCase();
    return (!keyword || text.includes(keyword.toLowerCase()))
      && (location === "All locations" || opening.location === location || (location === "Remote" && opening.workMode === "Remote"))
      && (workMode === "All modes" || opening.workMode === workMode)
      && (branch === "All branches" || opening.branches.includes(branch))
      && (skill === "All skills" || opening.requiredSkills.some((item) => normalizeSkill(item) === normalizeSkill(skill)))
      && (duration === "Any duration" || opening.duration === duration)
      && (stipend === "Any stipend" || opening.stipend >= Number(stipend))
      && match.score >= minScore;
  }).sort((a, b) => sort === "Highest stipend" ? b.opening.stipend - a.opening.stipend : sort === "Closing soon" ? Date.parse(a.opening.closing) - Date.parse(b.opening.closing) : sort === "Highest match" ? b.match.score - a.match.score : Number(b.match.eligible) - Number(a.match.eligible) || b.match.score - a.match.score), [ranked, keyword, location, branch, skill, duration, stipend, minScore, sort, workMode]);
  const clear = () => { setKeyword(""); setWorkMode("All modes"); setLocation("All locations"); setBranch("All branches"); setSkill("All skills"); setDuration("Any duration"); setStipend("Any stipend"); setMinScore(0); setSort("Best match"); };
  const activeCount = Number(!!keyword) + Number(location !== "All locations") + Number(branch !== "All branches") + Number(skill !== "All skills") + Number(duration !== "Any duration") + Number(stipend !== "Any stipend") + Number(minScore > 0) + Number(workMode !== "All modes");
  useEffect(() => {
    const query = new URLSearchParams();
    const filters: [string,string,string][] = [["q",keyword,""],["location",location,"All locations"],["branch",branch,"All branches"],["skill",skill,"All skills"],["duration",duration,"Any duration"],["stipend",stipend,"Any stipend"],["mode",workMode,"All modes"],["sort",sort,"Best match"],["score",String(minScore),"0"]];
    filters.forEach(([key,value,fallback]) => {if(value!==fallback)query.set(key,value);});
    window.history.replaceState(window.history.state,"",window.location.pathname+(query.size?"?"+query.toString():""));
  }, [keyword,location,branch,skill,duration,stipend,workMode,sort,minScore]);
  const handleSearch = (value: string) => { setKeyword(value); };
  return <div className="page-stack">
    <SectionHeading eyebrow={`${internships.length} OPPORTUNITIES`} title="Internships" description="Browse opportunities, filter your search, and compare roles against your profile." action={<div className="listings-action"><button className={`outline-button filter-toggle${filtersOpen ? " is-on" : ""}`} onClick={() => setFiltersOpen((v) => !v)}><SlidersHorizontal size={15}/> Filters{activeCount > 0 && <b>{activeCount}</b>}</button><div className="select-wrap sort-select"><ArrowDown size={13}/><select aria-label="Sort internships" value={sort} onChange={(e) => setSort(e.target.value)}><option>Best match</option><option>Highest match</option><option>Highest stipend</option><option>Closing soon</option></select><ChevronDown size={14}/></div></div>}/>
    <div className="list-search"><Search size={17}/><input aria-label="Search internships" value={keyword} onChange={(e) => handleSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") setToast("Search results updated."); }} placeholder="Search roles, companies, skills…"/><kbd>↵</kbd><span>Try “Python” or “design”</span></div>
    {filtersOpen && <div className="filter-panel panel"><div className="filter-grid"><FilterSelect label="Work mode" value={workMode} options={["All modes", "Hybrid", "Remote", "On-site"]} onChange={setWorkMode}/><FilterSelect label="Location" value={location} options={["All locations", ...cities]} onChange={setLocation}/><FilterSelect label="Branch eligibility" value={branch} options={["All branches", ...branches]} onChange={setBranch}/><FilterSelect label="Required skill" value={skill} options={["All skills", ...new Set(internships.flatMap(j => j.requiredSkills))]} onChange={setSkill}/><FilterSelect label="Duration" value={duration} options={["Any duration", "3 months", "4 months", "5 months", "6 months"]} onChange={setDuration}/><FilterSelect label="Minimum stipend" value={stipend} options={["Any stipend", "25000", "30000", "35000", "40000"]} displayOptions={["Any stipend", "₹25,000+", "₹30,000+", "₹35,000+", "₹40,000+"]} onChange={setStipend}/><div className="score-filter"><label htmlFor="score-slider">Minimum match score <b>{minScore}%</b></label><input id="score-slider" type="range" min="0" max="80" step="5" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}/></div></div><button className="text-action clear-filters" onClick={clear}>Clear filters <X size={13}/></button></div>}
    <div className="results-summary"><span><strong>{result.length}</strong> opportunities {activeCount ? "match your filters" : "to explore"}</span><span className="result-context"><Check size={14}/> Ranked for {(profile.name || "Student").split(" ")[0]} <i/> eligible first</span></div>
    {result.length ? <div className="listings-list">{result.map(({ opening }) => <div key={opening.id}><OpportunityCard opening={opening} profile={profile} saved={saved.includes(opening.id)} onOpen={onOpen} onSave={onSave}/><div className="listing-extras"><label><input type="checkbox" checked={compared.includes(opening.id)} disabled={!compared.includes(opening.id) && compared.length >= 3} onChange={() => toggleCompare(opening.id)}/> Compare</label><span>{closingBadge(opening.closing)}</span></div></div>)}</div> : <div className="empty-state panel"><span className="empty-icon"><ListFilter size={25}/></span><h3>Nothing in this combination, yet.</h3><p>Try loosening one filter. Great fits can start with a single shared signal.</p><button className="outline-button" onClick={clear}>Reset filters</button></div>}
    <CompareTable jobs={internships.filter(j => compared.includes(j.id))} profile={profile} openings={internships} onRemove={toggleCompare}/>
    <div className="listings-footnote"><ShieldCheck size={15}/><span>Eligibility is checked against each company's stated criteria before a match score is shown.</span></div>
  </div>;
}


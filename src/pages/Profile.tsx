import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useAuth } from "../lib/auth";
import { useResume } from "../lib/resume";
import { ArrowRight, Check, ChevronDown, Code2, Compass, GraduationCap, MapPin, Sparkles, X } from "lucide-react";
import { branches, cities } from "../data";
import { parseProfile } from "../lib/storage";
import type { Profile } from "../types";

import { SectionHeading, SkillChips } from "../components/Shared";
import ResumeUpload from "../components/ResumeUpload";
function TagEditor({ label, values, onChange, suggestions, helper }: { label: string; values: string[]; onChange: (next: string[]) => void; suggestions: string[]; helper: string }) {
  const [entry, setEntry] = useState("");
  const add = (item: string) => {
    const additions = item.split(",").map(value => value.trim()).filter(Boolean);
    onChange([...new Map([...values, ...additions].map(value => [value.toLowerCase(), value])).values()]);
    setEntry("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") { event.preventDefault(); add(entry); }
  };
  return <div className="form-field"><label htmlFor={"tags-"+label}>{label}</label><div className="tag-input-shell"><div className="tag-input-items">{values.map((value) => <span className="editable-tag" key={value}>{value}<button type="button" aria-label={`Remove ${value}`} onClick={() => onChange(values.filter((item) => item !== value))}><X size={12}/></button></span>)}<input id={"tags-"+label} value={entry} onChange={(e) => setEntry(e.target.value)} onKeyDown={onKeyDown} onBlur={() => entry.trim() && add(entry)} placeholder={values.length ? "Add another…" : `Add ${label.toLowerCase()} and press Enter`} /></div></div><small className="field-helper">{helper}</small>{suggestions.length > 0 && <div className="suggestion-row">{suggestions.filter((item) => !values.includes(item)).slice(0, 5).map((item) => <button type="button" key={item} onClick={() => add(item)}><PlusTiny/>{item}</button>)}</div>}</div>;
}


function PlusTiny() { return <span className="plus-tiny">+</span>; }


export default function ProfilePage({ profile, onUpdate, onNavigate, notify }: { profile: Profile; onUpdate: (next: Profile) => void | Promise<void>; onNavigate: (path: string) => void; notify: (message: string) => void }) {
  const [draft, setDraft] = useState<Profile>(profile);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const {user} = useAuth();
  const resume = useResume();
  const introducedSkills = useRef<string[]>([]);
  useEffect(() => setDraft(profile), [profile]);
  useEffect(() => {
    if (user?.profile) {introducedSkills.current = [];return;}
    const extracted = resume?.analysis?.skills ?? [];
    const previousIntroduced = introducedSkills.current;
    introducedSkills.current = extracted.filter(skill => !profile.skills.some(value => value.toLowerCase() === skill.toLowerCase())).map(skill => skill.toLowerCase());
    setDraft(previous => {
      const baseline = previous.skills.filter(skill => !previousIntroduced.includes(skill.toLowerCase()));
      return {...previous, skills: [...new Map([...baseline, ...extracted].map(skill => [skill.toLowerCase(), skill])).values()]};
    });
  }, [resume?.analysis, user?.profile, profile]);
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setDraft((prev) => ({ ...prev, [key]: value }));
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = [
      ...(branches.includes(draft.branch) ? [] : ["Choose a supported engineering branch."]),
      ...(draft.name.length <= 200 ? [] : ["Keep your name under 200 characters."]),
      ...(Number.isFinite(draft.cgpa) && draft.cgpa >= 0 && draft.cgpa <= 10 ? [] : ["Enter a CGPA from 0 to 10."]),
      ...(draft.skills.length ? [] : ["Add at least one skill to calculate a useful match."]),
      ...(draft.interests.length ? [] : ["Add at least one interest."]),
      ...(draft.location.trim() ? [] : ["Choose a preferred location."]),
    ];
    setErrors(nextErrors);
    if (nextErrors.length) return;
    const valid = parseProfile(draft);
    if (!valid) { setErrors(["Use up to 100 skills and interests, each under 200 characters."]); return; }
    setSaving(true);
    try { await onUpdate(valid); notify("Profile saved — your match scores have been refreshed."); }
    catch (error) { setErrors([(error as Error).message]); }
    finally { setSaving(false); }
  };
  const completeness = Math.min(100, Math.round((Number(!!draft.branch) + Number(Number.isFinite(draft.cgpa)) + Number(!!draft.location) + Number(draft.skills.length > 0) + Number(draft.interests.length > 0)) / 5 * 100));
  return <div className="page-stack">
    <ResumeUpload onNavigate={onNavigate}/>
    <SectionHeading eyebrow="YOUR WORKSPACE" title="Student profile" description="Add your skills, interests, and preferences to find internships that fit you." action={<span className="profile-status"><i/> Saved to your student account</span>}/>
    <div className="profile-layout"><form className="profile-form panel" onSubmit={save}>
      <div className="panel-title"><div><span className="eyebrow">01 — THE BASICS</span><h3>Tell us about yourself</h3><p>Just enough to make eligibility and location meaningful.</p></div><span className="form-index">01</span></div>
      <div className="field-grid"><div className="form-field"><label htmlFor="student-name">Full name (optional)</label><input id="student-name" value={draft.name} onChange={(e) => update("name", e.target.value)} placeholder="Your name" autoComplete="name"/></div><div className="form-field"><label htmlFor="branch-select">Engineering branch</label><div className="select-wrap"><select required id="branch-select" value={draft.branch} onChange={(e) => update("branch", e.target.value)}><option value="" disabled>Select a branch</option>{branches.map((branch) => <option key={branch}>{branch}</option>)}</select><ChevronDown size={15}/></div></div><div className="form-field"><label htmlFor="cgpa-field">Current CGPA <span>/ 10</span></label><input id="cgpa-field" required type="number" min="0" max="10" step="0.1" value={Number.isFinite(draft.cgpa) ? draft.cgpa : ""} onChange={(e) => update("cgpa", e.target.value === "" ? NaN : Number(e.target.value))}/></div><div className="form-field"><label htmlFor="location-select">Preferred location</label><div className="select-wrap"><select required id="location-select" value={cities.includes(draft.location) ? draft.location : ""} onChange={(e) => update("location", e.target.value)}><option value="" disabled>Select a city</option>{cities.map((city) => <option key={city}>{city}</option>)}</select><ChevronDown size={15}/></div></div></div>
      <div className="form-divider"/>
      <div className="panel-title panel-title--tight"><div><span className="eyebrow">02 — YOUR ADVANTAGES</span><h3>Skills you bring</h3><p>Include tools, languages and techniques. Press Enter to add.</p></div><Code2 size={19} className="section-line-icon"/></div>
      <TagEditor label="Skills" values={draft.skills} onChange={(next) => update("skills", next)} helper="Start with the skills you can confidently demonstrate." suggestions={["Python", "SQL", "React", "TypeScript", "Figma", "Machine Learning", "Java", "Node.js", "CSS", "Linux"]}/>
      <div className="form-divider"/>
      <div className="panel-title panel-title--tight"><div><span className="eyebrow">03 — WHAT MOVES YOU</span><h3>Interests & direction</h3><p>What kind of work would you be excited to do?</p></div><Compass size={19} className="section-line-icon"/></div>
      <TagEditor label="Interests" values={draft.interests} onChange={(next) => update("interests", next)} helper="This signal helps surface relevant teams — even if your skill set is still growing." suggestions={["Developer tools", "Data for good", "Product design", "Artificial intelligence", "Fintech", "Cloud computing", "Accessibility", "Open source"]}/>
      {errors.length > 0 && <div className="form-errors" role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div>}
      <div className="form-actions"><span>Save to recalculate your scores</span><button className="button button-dark" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"} <Check size={15}/></button></div>
    </form><aside className="profile-aside"><div className="profile-preview"><div className="profile-avatar">{draft.name.split(" ").map((n) => n[0]).slice(0, 2).join("") || "ST"}<i/></div><span className="eyebrow">STUDENT PROFILE</span><h3>{draft.name || "Your name"}</h3><p>{draft.branch}</p><div className="profile-preview-meta"><span><GraduationCap size={15}/>{Number.isFinite(draft.cgpa) ? draft.cgpa.toFixed(1) : "—"} CGPA</span><span><MapPin size={15}/>{draft.location || "Choose location"}</span></div><div className="preview-divider"/><div className="preview-block"><span>CORE SKILLS</span><SkillChips items={draft.skills}/></div><div className="preview-block"><span>INTERESTS</span><SkillChips items={draft.interests}/></div></div>
      <div className="profile-completion panel"><div className="completion-head"><strong>Profile completeness</strong><b>{completeness}%</b></div><div className="completion-track" role="progressbar" aria-label="Profile completeness" aria-valuenow={completeness} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${completeness}%` }}/></div><p>{completeness === 100 ? "Your profile is ready to find its next fit." : "Fill in your profile to unlock more accurate matches."}</p></div>
      <div className="profile-tip"><Sparkles size={16}/><span><strong>A little context goes a long way.</strong> Add one more interest to connect with teams outside your exact keyword match.</span></div>
      <button className="text-action view-matches" onClick={() => onNavigate("/recommendations")}>See how you match <ArrowRight size={14}/></button></aside></div>
  </div>;
}


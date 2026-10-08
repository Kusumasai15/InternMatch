import { useCatalog } from "../lib/catalog";
import type { Internship, Profile } from "../types";
import { scoreInternship, DEFAULT_WEIGHTS } from "../lib/matching";

import Tag from "./SkillTag";
export function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: React.ReactNode; description?: string; action?: React.ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>;
}


export function CompanyMark({ opening, size = "md" }: { opening: Internship; size?: "sm" | "md" | "lg" }) {
  return <span className={`company-mark company-mark--${opening.logoTone} company-mark--${size}`} aria-label={`${opening.company} logo`}>{opening.logo}</span>;
}


export function ToneBadge({ opening }: { opening: Internship }) {
  return <span className="sector-label"><i className={`sector-dot sector-dot--${opening.logoTone}`} />{opening.sector}</span>;
}


export function SkillChips({ items, muted = false }: { items: string[]; muted?: boolean }) {
  return <div className={`chip-row${muted ? " chip-row--muted" : ""}`}>{items.map((item) => <Tag key={item}>{item}</Tag>)}</div>;
}


export function ScoreBars({ opening, profile }: { opening: Internship; profile: Profile }) {
  const {internships} = useCatalog();
  const match = scoreInternship(profile, opening, DEFAULT_WEIGHTS, internships);
  const rows = [
    { key: "skills", label: "Skill alignment", value: match.factors.skills, weight: "50%", text: match.matchedSkills.length ? `${match.matchedSkills.join(", ")} matched` : "No direct skill overlap yet" },
    { key: "interests", label: "Interest fit", value: match.factors.interests, weight: "20%", text: match.matchedInterests.length ? `${match.matchedInterests.join(", ")} aligned` : "Explore this team's focus" },
    { key: "location", label: "Location preference", value: match.factors.location, weight: "15%", text: opening.workMode === "Remote" || opening.location === profile.location ? "Fits your preferred location" : `${opening.workMode} · ${opening.location}` },
    { key: "academics", label: "Academic headroom", value: match.factors.academics, weight: "15%", text: `Minimum ${opening.minCgpa.toFixed(1)} · you have ${profile.cgpa.toFixed(1)}` },
  ];
  return <div className="score-breakdown">{rows.map((row) => <div className="score-factor" key={row.key}><div className="factor-head"><strong>{row.label}</strong><span>Weight {row.weight}</span></div><div className="factor-track"><span style={{ width: `${row.value}%` }} /></div><div className="factor-foot"><small>{row.text}</small><b>{row.value}%</b></div></div>)}</div>;
}


export function NetworkIcon() { return <span className="network-icon"><i/><i/><i/></span>; }


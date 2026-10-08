import { useSettings } from "../lib/settings";
import { useCatalog } from "../lib/catalog";
import { ArrowUpRight, Bookmark, CalendarDays, MapPin } from "lucide-react";
import type { Internship, Profile } from "../types";
import { formatStipend, scoreInternship, DEFAULT_WEIGHTS } from "../lib/matching";
import MatchRing from "./MatchRing";

import { CompanyMark, ToneBadge, SkillChips } from "./Shared";
export default function OpportunityCard({ opening, profile, saved, onSave, onOpen, compact = false }: {
  opening: Internship; profile: Profile; saved: boolean; onSave: (id: string) => void; onOpen: (id: string) => void; compact?: boolean;
}) {
  const {internships} = useCatalog();
  const {t}=useSettings();
  const match = scoreInternship(profile, opening, DEFAULT_WEIGHTS, internships);
  return (
    <article className={`opportunity-card${compact ? " opportunity-card--compact" : ""}`}>
      <div className="opportunity-card__top"><CompanyMark opening={opening} /><div className="opportunity-title"><button className="text-link job-title" onClick={() => onOpen(opening.id)}>{opening.role}</button><span>{opening.company}<b>·</b>{opening.location === "Remote" ? "Remote" : opening.location}</span></div><div className="opportunity-top-actions"><button className={`icon-button save-button${saved ? " is-saved" : ""}`} aria-label={saved ? t("unsave") : t("save")} title={saved ? "Saved" : "Save internship"} onClick={() => onSave(opening.id)}><Bookmark size={17} fill={saved ? "currentColor" : "none"} /></button><MatchRing score={match.score} size={compact ? 56 : 62} compact /></div></div>
      <div className="opportunity-card__meta"><ToneBadge opening={opening} /><span><MapPin size={13} />{opening.workMode}</span><span><CalendarDays size={13} />{opening.duration}</span><span className="stipend-text">{formatStipend(opening.stipend)}<small> / mo</small></span></div>
      {!compact && <><p className="opportunity-summary">{opening.summary}</p><SkillChips items={opening.requiredSkills.slice(0, 4)} muted /></>}
      <div className="opportunity-card__bottom"><span className="match-explainer"><i />{match.matchedSkills.length} of {opening.requiredSkills.length} skills match</span><button className="arrow-link" onClick={() => onOpen(opening.id)}>View opportunity <ArrowUpRight size={15} /></button></div>
    </article>
  );
}


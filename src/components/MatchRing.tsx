import { useSettings } from "../lib/settings";
type Props = { score: number; size?: number; compact?: boolean };

export default function MatchRing({ score, size = 62, compact = false }: Props) {
  const {t}=useSettings();
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(score, 100)) / 100);
  return (
    <div className={`match-ring${compact ? " match-ring--compact" : ""}`} style={{ width: size, height: size }} role="img" aria-label={`${score}% ${t("matchScore")}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--line)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={score >= 75 ? "var(--green)" : score >= 55 ? "#c99445" : "#cc8075"} strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span>{score}<small>%</small></span>
    </div>
  );
}

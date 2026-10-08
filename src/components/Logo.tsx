type LogoProps = { compact?: boolean };

export default function Logo({ compact = false }: LogoProps) {
  return (
    <div className={`brand-lockup${compact ? " brand-lockup--compact" : ""}`} aria-label="InternMatch">
      <img src="/brand-mark.svg" width="36" height="36" alt="" />
      {!compact && <span className="brand-copy"><strong>Intern<span>Match</span></strong><small>STUDENT INTERNSHIPS</small></span>}
    </div>
  );
}

export default function LoadingSkeleton({ label = "Loading page…" }: { label?: string }) {
  return <div className="loading-skeleton panel" role="status" aria-live="polite" aria-busy="true">
    <span className="loading-caption">{label}</span>
    <div aria-hidden="true" className="skeleton-layout">
      <span className="skeleton-line skeleton-line--title"/>
      <span className="skeleton-line"/>
      <div className="skeleton-cards">{[0, 1, 2].map(id => <div key={id} className="skeleton-card"><span className="skeleton-avatar"/><span className="skeleton-line"/><span className="skeleton-line skeleton-line--short"/></div>)}</div>
    </div>
  </div>;
}

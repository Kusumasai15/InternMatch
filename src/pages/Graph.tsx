import { useEffect, useState } from "react";
import { Activity, Network, Route, Sparkles, Target, Users } from "lucide-react";
import { useCatalog } from "../lib/catalog";
import { fetchGraphAnalytics, type GraphAnalytics } from "../lib/graphApi";
import { parseProfile } from "../lib/storage";
import type { Profile } from "../types";
import GraphCanvas from "../components/GraphCanvas";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { SectionHeading } from "../components/Shared";

const pct = (value: number) => `${Math.round(value * 100)}%`;

export default function GraphPage({ profile }: { profile: Profile }) {
  const { internships } = useCatalog();
  const [analytics, setAnalytics] = useState<GraphAnalytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setAnalytics(null);
    if (!parseProfile(profile)) {
      setError("Complete and save your profile to connect to NetworkX analytics.");
      return () => controller.abort();
    }
    fetchGraphAnalytics(profile, internships, controller.signal)
      .then(setAnalytics)
      .catch((err: unknown) => { if ((err as Error).name !== "AbortError") setError("NetworkX service is offline. The interactive graph still works locally."); });
    return () => controller.abort();
  }, [profile, internships]);

  return <div className="page-stack">
    <SectionHeading eyebrow="EXPLORE YOUR CONNECTIONS" title="Graph analytics" description="See how your skills and interests connect to companies and internship opportunities." action={<span className="live-pill"><i/> {analytics ? "Analytics connected" : "Local graph active"}</span>} />

    {analytics && <section className="graph-analytics-grid" aria-label="Graph analytics summary">
      <div className="analytics-stat"><span><Network size={15}/> Nodes</span><strong>{Object.values(analytics.nodeCounts).reduce((a, b) => a + b, 0)}</strong><small>{analytics.edgeCount} relationships</small></div>
      <div className="analytics-stat"><span><Activity size={15}/> Avg. degree</span><strong>{analytics.averageDegree}</strong><small>connections per node</small></div>
      <div className="analytics-stat"><span><Target size={15}/> Top graph match</span><strong>{analytics.recommendations[0]?.graphScore ?? 0}%</strong><small>{analytics.recommendations[0]?.role ?? "No result"}</small></div>
      <div className="analytics-stat"><span><Users size={15}/> Communities</span><strong>{analytics.communities.length}</strong><small>skill communities detected</small></div>
    </section>}

    {analytics && <div className="analytics-panels">
      <section className="panel analytics-panel"><div className="chart-card-header"><div><span className="eyebrow">CENTRALITY</span><h3>Most connected skills.</h3><span className="chart-subtitle">Degree centrality on the skill co-occurrence graph.</span></div></div><div className="analytics-list">{analytics.topSkills.slice(0, 6).map((item, index) => <div className="analytics-row" key={item.skill}><span><b>{String(index + 1).padStart(2, "0")}</b>{item.skill}</span><div className="analytics-bar"><i style={{ width: `${Math.max(8, item.centrality * 100)}%` }} /></div><strong>{pct(item.centrality)}</strong></div>)}</div></section>
      <section className="panel analytics-panel"><div className="chart-card-header"><div><span className="eyebrow">COMMUNITY DETECTION</span><h3>Related skill clusters.</h3><span className="chart-subtitle">Greedy modularity communities from skill co-occurrence.</span></div></div><div className="community-list">{analytics.communities.slice(0, 5).map((community) => <div className="community-item" key={community.id}><span className="community-number">{community.id}</span><div><strong>{community.label}</strong><small>{community.skills.slice(0, 6).join(" · ")}{community.skills.length > 6 ? " · …" : ""}</small></div><b>{community.size}</b></div>)}</div></section>
    </div>}

    {analytics && <section className="panel analytics-panel"><div className="chart-card-header"><div><span className="eyebrow">GRAPH SIMILARITY</span><h3>Why these internships connect to you.</h3><span className="chart-subtitle">Jaccard skill similarity + path proximity + community coverage.</span></div><Route size={19} /></div><div className="recommendation-analytics-table"><div className="analytics-table-head"><span>Opportunity</span><span>Jaccard</span><span>Path</span><span>Community</span><span>Graph score</span></div>{analytics.recommendations.slice(0, 7).map((item) => <div className="analytics-table-row" key={item.internshipId}><span><strong>{item.role}</strong><small>{item.company}</small></span><b>{pct(item.jaccard)}</b><b>{item.shortestPath ? `${item.shortestPath} hops` : "—"}</b><b>{pct(item.communityCoverage)}</b><strong>{item.graphScore}%</strong></div>)}</div></section>}

    {analytics?.paths.length ? <section className="panel analytics-panel"><div className="chart-card-header"><div><span className="eyebrow">GRAPH TRAVERSAL</span><h3>Shortest recommendation paths.</h3><span className="chart-subtitle">A readable path from the student through skills to an opportunity.</span></div><Sparkles size={19} /></div><div className="path-list">{analytics.paths.slice(0, 5).map((item) => <div className="path-row" key={item.internshipId}>{item.path.map((node, i) => <span key={`${node}-${i}`}><b>{node}</b>{i < item.path.length - 1 && <em>→</em>}</span>)}</div>)}</div></section> : null}

    {error && <div className="graph-callout"><div><Sparkles size={16}/><strong>Local-first graph mode.</strong><span>{error}</span></div><span>{profile.skills.length} skills · {profile.interests.length} interests</span></div>}
    {!analytics && !error && <LoadingSkeleton label="Connecting to the NetworkX analytics service…"/>}

    <div className="graph-callout"><div><Sparkles size={16}/><strong>Your graph is personal.</strong><span>Update a skill on your profile and its edges recalculate across the network.</span></div><span>{profile.skills.length} skills · {profile.interests.length} interests · {internships.length} opportunities</span></div>
    <GraphCanvas profile={profile} internships={internships}/>
    <p className="graph-footnote"><i className="footnote-line"/> Solid paths show explicit relationships; domain nodes model internship sectors, while NetworkX analytics calculate similarity, centrality, communities and traversal metrics.</p>
  </div>;
}

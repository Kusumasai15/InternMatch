import { useSettings } from "../lib/settings";
import { forceLayout } from "../lib/force";
import { useMemo, useState } from "react";
import type { Internship, Profile } from "../types";
import { rankInternships, normalizeSkill, related } from "../lib/matching";
import { Network, Minus, Plus, RotateCcw } from "lucide-react";

type Kind = "student" | "skill" | "interest" | "company" | "domain" | "internship";
type GraphNode = { id: string; label: string; kind: Kind; x: number; y: number; note: string; openingId?: string };

const kindMeta: Record<Kind, { color: string; caption: string }> = {
  student: { color: "var(--graph-student)", caption: "Student" }, skill: { color: "var(--graph-skill)", caption: "Skill" },
  interest: { color: "var(--graph-interest)", caption: "Interest" }, company: { color: "var(--graph-company)", caption: "Company" },
  domain: { color: "var(--graph-domain)", caption: "Domain" },
  internship: { color: "var(--graph-internship)", caption: "Opportunity" },
};

export default function GraphCanvas({ profile, internships }: { profile: Profile; internships: Internship[] }) {
  const {t}=useSettings();
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState("student");
  const [drag, setDrag] = useState<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const [query,setQuery]=useState("");
  const [visibleKinds,setVisibleKinds]=useState<Kind[]>(["student","skill","interest","company","internship"]);
  const ranked=useMemo(()=>rankInternships(profile,internships),[profile,internships]);
  const {nodes,edges}=useMemo(()=>{
    const built:GraphNode[]=[{id:"student",label:profile.name || "Student",kind:"student",x:500,y:310,note:profile.branch+" · "+profile.cgpa+" CGPA"}];
    const links:{from:string;to:string;strength:number;target?:string;label?:string}[]=[];
    const add=(id:string,label:string,kind:Kind,note:string,openingId?:string)=>{if(!built.some(n=>n.id===id))built.push({id,label,kind,note,openingId,x:0,y:0});};
    const skillId=(s:string)=>"skill:"+normalizeSkill(s);
    for(const skill of profile.skills){add(skillId(skill),skill,"skill","Listed student skill.");links.push({from:"student",to:skillId(skill),strength:1});}
    for(const interest of profile.interests){const id="interest:"+interest.toLowerCase();add(id,interest,"interest","Student interest.");links.push({from:"student",to:id,strength:0.7});}
    for(const {opening,match} of ranked){const target="internship:"+opening.id;add(target,opening.role,"internship",opening.company+" · "+match.score+"% · "+(match.exclusionReason??match.reasons.join(" ")),opening.id);const company="company:"+opening.company;add(company,opening.company,"company",opening.sector);links.push({from:company,to:target,strength:0.5,label:"Offers"});const domain="domain:"+opening.sector.toLowerCase();add(domain,opening.sector,"domain","Internship domain.");links.push({from:target,to:domain,strength:0.55,label:"Belongs to domain"});
      for(const required of opening.requiredSkills){const req=skillId(required);add(req,required,"skill","Internship skill requirement.");
        const exact=profile.skills.find(s=>normalizeSkill(s)===normalizeSkill(required));
        const partial=!exact&&profile.skills.find(s=>(related[normalizeSkill(required)]??[]).includes(normalizeSkill(s)));
        if(exact||partial)links.push({from:skillId(exact||partial||required),to:target,strength:exact?1:0.5,target,label:exact?"Direct skill":"Related skill: half credit"});
        else links.push({from:req,to:target,strength:0.2});
        if(match.graphBonus>0&&!exact){for(const bridge of internships){if(bridge.id===opening.id||!bridge.requiredSkills.some(s=>normalizeSkill(s)===normalizeSkill(required)))continue;const source=profile.skills.find(s=>bridge.requiredSkills.some(r=>normalizeSkill(r)===normalizeSkill(s)));if(source){links.push({from:skillId(source),to:"internship:"+bridge.id,strength:0.35,target,label:"Graph bonus: shared skill"},{from:"internship:"+bridge.id,to:req,strength:0.35,target,label:"Graph bonus: co-occurrence"},{from:req,to:target,strength:0.35,target,label:"Graph bonus: inferred connection"});break;}}}
      }
      for(const interest of match.matchedInterests)links.push({from:"interest:"+interest.toLowerCase(),to:target,strength:0.6,target,label:"Interest fit"});
    }
    const positions=new Map(forceLayout(built.map(n=>n.id),links).map(n=>[n.id,n]));
    return {nodes:built.map(n=>({...n,...positions.get(n.id)})),edges:links};
  },[profile,internships,ranked]);
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const selectedNode = byId.get(active) ?? nodes[0];
  const selectedTarget=selectedNode.kind==="internship"?selectedNode.id:"";
  const highlighted=edges.filter(e=>selectedTarget?e.target===selectedTarget:e.from===active||e.to===active);
  const pathIds=new Set(highlighted.flatMap(e=>[e.from,e.to]));
  if(selectedTarget&&highlighted.length)pathIds.add("student");
  const shown=nodes.filter(n=>visibleKinds.includes(n.kind));
  const focus=(id:string)=>{const n=byId.get(id);if(n){setActive(id);setScale(1);setPan({x:500-n.x,y:310-n.y});setVisibleKinds(prev=>prev.includes(n.kind)?prev:[...prev,n.kind]);}};
  const onDown = (event: React.PointerEvent<SVGSVGElement>) => {
    (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
    setDrag({ startX: event.clientX, startY: event.clientY, originX: pan.x, originY: pan.y });
  };
  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (drag) { const factor=1000/event.currentTarget.getBoundingClientRect().width; setPan({ x: drag.originX + (event.clientX - drag.startX)*factor, y: drag.originY + (event.clientY - drag.startY)*factor }); }
  };

  return (
    <div className="graph-workspace">
      <div className="graph-map-wrap"><div className="graph-toolbar"><label>Search and focus<input aria-label="Search graph nodes" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Skill, company or role"/></label><button className="outline-button" onClick={()=>{const n=nodes.find(n=>(n.label+" "+n.note).toLowerCase().includes(query.toLowerCase()));if(n)focus(n.id);}}>Focus first match</button>{(Object.keys(kindMeta) as Kind[]).map(kind=><label key={kind}><input type="checkbox" checked={visibleKinds.includes(kind)} onChange={()=>setVisibleKinds(prev=>prev.includes(kind)?prev.filter(k=>k!==kind):[...prev,kind])}/>{kindMeta[kind].caption}</label>)}</div>
        <div className="graph-map-head"><span className="graph-head-mark"><Network size={16} /></span><div><strong>Opportunity network</strong><small>Shared signals connect you to internships</small></div><span className="graph-node-count">{nodes.length} nodes <i /> {edges.length} edges</span></div>
        {!shown.length && <p className="empty-state" role="status">No node types selected. Use Reset to restore the graph.</p>}
        <div className="graph-map" onWheel={(event) => { setScale((value) => Math.max(0.65, Math.min(1.65, value + (event.deltaY > 0 ? -0.07 : 0.07)))); }}>
          <svg viewBox="0 0 1000 620" role="group" aria-label="Interactive student skills and internship graph; keyboard node list follows" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)} onClick={(event) => { if (event.target === event.currentTarget) setActive("student"); }}>
            <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
              {edges.map((edge, i) => {
                const from = byId.get(edge.from); const to = byId.get(edge.to);
                if(!from||!to||!visibleKinds.includes(from.kind)||!visibleKinds.includes(to.kind))return null;
                const lit=highlighted.includes(edge)||(selectedTarget&&pathIds.has(edge.to)&&edge.from==="student");
                return from && to ? <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={`graph-edge${lit ? " graph-edge--active" : ""}`} strokeWidth={lit ? 2 : 1.15} opacity={selectedTarget&&!lit?0.12:edge.strength} /> : null;
              })}
              {shown.map((node) => {
                const selected = active === node.id || pathIds.has(node.id);
                const dot = node.kind === "student" ? 13 : node.kind === "internship" ? 8 : 6;
                const meta = kindMeta[node.kind];
                return (
                  <g key={node.id} className={`graph-node graph-node--${node.kind}${selected ? " is-selected" : ""}`} transform={`translate(${node.x},${node.y})`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setActive(node.id); setDrag(null); }} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setActive(node.id);}}} tabIndex={0} role="button" aria-pressed={active===node.id} aria-label={`${meta.caption}: ${node.label}`}>
                    {selected && <circle r={dot + 10} className="graph-halo" />}
                    <circle r={dot + 4} className="graph-node-shadow" />
                    <circle r={dot} fill={meta.color} className="graph-node-dot" />
                    {node.kind === "student" && <text x="0" y="36" textAnchor="middle" className="graph-text graph-student-label">{node.label}</text>}
                    {node.kind !== "student" && <text x={node.kind === "skill" ? -15 : 18} y="4" textAnchor={node.kind === "skill" ? "end" : "start"} className="graph-text">{node.label.length > 22 ? `${node.label.slice(0, 20)}…` : node.label}</text>}
                  </g>
                );
              })}
            </g>
          </svg>
          <div className="graph-controls">
            <button aria-label="Zoom out" onClick={() => setScale((value) => Math.max(0.65, value - 0.15))}><Minus size={15} /></button>
            <span>{Math.round(scale * 100)}%</span>
            <button aria-label="Zoom in" onClick={() => setScale((value) => Math.min(1.65, value + 0.15))}><Plus size={15} /></button>
            <button aria-label={t("reset")} onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); setVisibleKinds(["student","skill","interest","company","domain","internship"]); setQuery(""); setActive("student"); }}><RotateCcw size={14} /></button>
          </div>
        </div>
        <div className="graph-legend">{(Object.entries(kindMeta) as Array<[Kind, { color: string; caption: string }]>).map(([kind, meta]) => <span key={kind}><i style={{ background: meta.color }} />{meta.caption}</span>)}</div>
      </div>
      <aside className="graph-inspector" aria-live="polite"><span className="eyebrow">SELECTED NODE</span><div className={`inspector-icon${selectedNode.kind==="student"?" inspector-icon--student":""}`} style={{ background: kindMeta[selectedNode.kind].color }}>{selectedNode.kind === "student" ? (profile.name || "Student").slice(0, 1) : selectedNode.label.slice(0, 1)}</div><span className="pill pill-muted">{kindMeta[selectedNode.kind].caption}</span><h3>{selectedNode.label}</h3><p>{selectedNode.note}</p>
        {selectedNode.openingId && <p className="inspector-hint">Highlighted solid paths show direct/related skill credit. Fainter co-occurrence paths explain the capped graph bonus. Academic and location factors are stated in the node explanation.</p>}
        {selectedTarget && <ul>{[...new Set(highlighted.map(e=>e.label).filter(Boolean))].map(label=><li key={label}>{label}</li>)}</ul>}
        <details className="graph-node-list" open><summary>Keyboard node list</summary>{shown.filter(n=>(n.label+" "+n.note).toLowerCase().includes(query.toLowerCase())).map(n=><button className="text-action" key={n.id} aria-pressed={active===n.id} onClick={()=>focus(n.id)}>{kindMeta[n.kind].caption}: {n.label}</button>)}{!shown.some(n=>(n.label+" "+n.note).toLowerCase().includes(query.toLowerCase()))&&<p>No matching visible nodes. Reset filters to widen the search.</p>}</details>
        <div className="inspector-sep" /><small className="eyebrow">HOW TO EXPLORE</small><p>Drag the canvas to pan. Use the controls or scroll to zoom. Select any node to inspect what connects it to your profile.</p>
      </aside>
    </div>
  );
}

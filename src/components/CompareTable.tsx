import type { Internship, Profile } from "../types";
import { DEFAULT_WEIGHTS, scoreInternship } from "../lib/matching";
export default function CompareTable({jobs,profile,openings,onRemove}: {jobs:Internship[];profile:Profile;openings:Internship[];onRemove:(id:string)=>void}) {
  if (!jobs.length) return null;
  const matches=jobs.map(j=>scoreInternship(profile,j,DEFAULT_WEIGHTS,openings));
  const rows: {label:string;values:number[];display:string[];higher:boolean}[] = [
    {label:"Match score",values:matches.map(m=>m.eligible?m.score:NaN),display:matches.map(m=>m.eligible ? m.score+"%" : "Ineligible"),higher:true},
    {label:"Monthly stipend",values:jobs.map(j=>j.stipend),display:jobs.map(j=>"₹"+j.stipend.toLocaleString("en-IN")),higher:true},
    {label:"Skills to learn",values:matches.map(m=>m.missingSkills.length),display:matches.map(m=>m.missingSkills.join(", ")||"All required skills match"),higher:false},
    {label:"Minimum CGPA",values:jobs.map(j=>j.minCgpa),display:jobs.map(j=>j.minCgpa.toFixed(1)),higher:false},
    {label:"Location fit",values:matches.map(m=>m.factors.location),display:jobs.map((j,i)=>j.location+" · "+j.workMode+" ("+matches[i].factors.location+"%)"),higher:true},
    {label:"Duration (shorter commitment)",values:jobs.map(j=>parseInt(j.duration)),display:jobs.map(j=>j.duration),higher:false},
    {label:"Closing date (more time)",values:jobs.map(j=>Date.parse(j.closing)),display:jobs.map(j=>j.closing),higher:true}
  ];
  return <section className="panel match-lab" aria-label="Compare internships"><h3>Compare your shortlist ({jobs.length}/3)</h3><p>Best values are highlighted. Ties share the highlight; a shorter duration means less time commitment.</p><div className="table-scroll"><table className="demo-table"><thead><tr><th>Factor</th>{jobs.map(j=><th key={j.id}>{j.company}<br/>{j.role}<br/><button className="text-action" onClick={()=>onRemove(j.id)}>Remove</button></th>)}</tr></thead><tbody>{rows.map(row=>{const best=row.higher?Math.max(...row.values.filter(Number.isFinite)):Math.min(...row.values.filter(Number.isFinite));return <tr key={row.label}><th scope="row">{row.label}</th>{row.display.map((text,i)=><td key={jobs[i].id} className={row.values[i]===best?"best":""}>{text}{row.values[i]===best&&<span className="best-label"> · Best</span>}</td>)}</tr>;})}</tbody></table></div></section>;
}

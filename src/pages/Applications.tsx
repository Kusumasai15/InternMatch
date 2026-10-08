import { useCatalog } from "../lib/catalog";
import { useState } from "react";
import type { ApplicationRecord } from "../types";
import { APPLICATION_STAGES, closingBadge, readApplications, writeApplications } from "../lib/storage";
export default function Applications({saved,onSave,onOpen,onNavigate}: {saved:string[];onSave:(id:string)=>void;onOpen:(id:string)=>void;onNavigate:(path:string)=>void}) {
  const {internships} = useCatalog();
  const [records,setRecords]=useState<ApplicationRecord[]>(readApplications);
  const [error,setError]=useState("");
  const ids=[...new Set([...saved,...records.filter(r=>r.stage!=="Saved").map(r=>r.id)])];
  const entries=ids.flatMap(id=>{const job=internships.find(j=>j.id===id);return job?[{job,record:records.find(r=>r.id===id)??{id,stage:"Saved" as const,notes:"",deadline:""}}]:[];});
  const update=(record:ApplicationRecord, patch:Partial<ApplicationRecord>)=>{
    const next={...record,...patch};
    const list=[...records.filter(r=>r.id!==record.id),next];
    setRecords(list);setError(writeApplications(list)?"":"Browser storage is unavailable. Changes remain in this session.");
    if(next.stage==="Saved"&&!saved.includes(next.id))onSave(next.id);
  };
  return <div className="page-stack"><div className="section-heading"><div><span className="eyebrow">YOUR NEXT STEPS</span><h2>Applications</h2><p>Track your own applications here. Stage changes record local progress; they do not send an application to a company.</p></div></div>{error&&<p role="alert">{error}</p>}{!entries.length&&<div className="empty-state panel"><h3>Your next step starts with a saved role.</h3><button className="outline-button" onClick={()=>onNavigate("/internships")}>Browse internships</button></div>}
    <div className="tracker-board">{APPLICATION_STAGES.map(stage=><section className="tracker-column panel" key={stage} aria-label={stage+" applications"}><h3>{stage} <small>({entries.filter(e=>e.record.stage===stage).length})</small></h3>{entries.filter(e=>e.record.stage===stage).map(({job,record})=><article className="tracker-card" key={job.id}><button className="text-link" onClick={()=>onOpen(job.id)}>{job.role}</button><strong>{job.company}</strong><span>{closingBadge(job.closing)}</span><label className="lab-field">Stage<select value={record.stage} onChange={e=>update(record,{stage:e.target.value as ApplicationRecord["stage"]})}>{APPLICATION_STAGES.map(s=><option key={s}>{s}</option>)}</select></label><label className="lab-field">Notes<textarea rows={3} maxLength={4000} value={record.notes} onChange={e=>update(record,{notes:e.target.value})} placeholder="Follow-up, interview prep…"/></label><label className="lab-field">Personal deadline<input type="date" value={record.deadline} onChange={e=>update(record,{deadline:e.target.value})}/></label>{record.deadline&&<small>{closingBadge(record.deadline+"T00:00:00")}</small>}{["Saved","Applied","Interview"].includes(record.stage)&&<button className="outline-button" onClick={()=>update(record,{stage:record.stage==="Saved"?"Applied":record.stage==="Applied"?"Interview":"Offer"})}>{record.stage==="Saved"?"Mark applied":record.stage==="Applied"?"Move to interview":"Mark offer"}</button>}{record.stage!=="Rejected"&&<button className="text-action" onClick={()=>update(record,{stage:"Rejected"})}>Mark rejected</button>}</article>)}{!entries.some(e=>e.record.stage===stage)&&<p className="tracker-empty">No applications at this stage.</p>}</section>)}</div>
  </div>;
}

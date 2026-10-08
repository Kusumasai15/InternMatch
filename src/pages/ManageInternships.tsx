import AdminAccountSettings from "../components/AdminAccountSettings";
import { useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { useCatalog } from "../lib/catalog";
import { branches } from "../data/skills";
import type { Internship } from "../types";
import { SectionHeading } from "../components/Shared";
const blank: Internship={id:"",role:"",company:"",sector:"",logo:"I",logoTone:"green",location:"",workMode:"Hybrid",stipend:15000,duration:"3 months",closing:"",minCgpa:7,branches:[],requiredSkills:[],interests:[],openings:1,applicants:0,summary:""};
export default function ManageInternships() {
  const {internships,save,remove,refresh,loading}=useCatalog();
  const [draft,setDraft]=useState<Internship>(blank);
  const [skills,setSkills]=useState("");
  const [interests,setInterests]=useState("");
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [deleteId,setDeleteId]=useState("");
  const update=<K extends keyof Internship>(key:K,value:Internship[K])=>setDraft(previous=>({...previous,[key]:value}));
  const reset=()=>{setDraft({...blank,branches:[]});setSkills("");setInterests("");setError("");};
  const edit=(job:Internship)=>{
    setDraft({...job,branches:[...job.branches],closing:/^\d{4}-\d{2}-\d{2}$/.test(job.closing)?job.closing:new Date(job.closing).toISOString().slice(0,10)});
    setSkills(job.requiredSkills.join(", "));setInterests(job.interests.join(", "));setMessage("");setError("");
    document.getElementById("internship-editor")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
  };
  const submit=async(event:FormEvent)=>{
    event.preventDefault();setError("");setMessage("");
    const tags=(value:string)=>[...new Set(value.split(",").map(s=>s.trim()).filter(Boolean))];
    const requiredSkills=tags(skills), topics=tags(interests);
    if(!draft.branches.length||!requiredSkills.length||!topics.length){setError("Choose at least one branch and add skills and interests.");return;}
    setBusy(true);
    try{await save({...draft,logo:draft.company.trim()[0]||"I",requiredSkills,interests:topics});setMessage(draft.id?"Internship updated for all students.":"Internship published. Students can now find it in their catalog.");reset();}
    catch(err){setError((err as Error).message);}finally{setBusy(false);}
  };
  const deleteOpening=async(id:string)=>{
    setBusy(true);setError("");setMessage("");
    try{await remove(id);if(draft.id===id)reset();setDeleteId("");setMessage("Internship removed from the shared catalog.");}
    catch(err){setError((err as Error).message);}finally{setBusy(false);}
  };
  return <div className="page-stack"><SectionHeading eyebrow="ADMIN WORKSPACE" title="Manage internships" description="Publish opportunities for students and keep the shared catalog up to date." action={<button className="outline-button" disabled={busy} onClick={()=>void refresh()}><RefreshCw size={16}/>Refresh catalog</button>}/>
    <AdminAccountSettings/>
    {message&&<div className="graph-callout" role="status">{message}</div>}{error&&<div className="form-errors" role="alert">{error}</div>}
    <section id="internship-editor" className="panel internship-editor"><div className="panel-title"><div><span className="eyebrow">INTERNSHIP DETAILS</span><h3>{draft.id?"Edit internship":"Add an internship"}</h3><p>Students use these requirements to understand eligibility and profile fit.</p></div><Plus size={20}/></div><form onSubmit={submit}><fieldset disabled={busy} className="editor-fields"><div className="editor-grid">{(["role","company","sector","location"] as const).map(key=><label className="lab-field" key={key}>{{role:"Role title",company:"Company",sector:"Sector",location:"Location"}[key]}<input required maxLength={1000} value={draft[key]} onChange={e=>update(key,e.target.value)}/></label>)}<label className="lab-field">Work mode<select value={draft.workMode} onChange={e=>update("workMode",e.target.value as Internship["workMode"])}><option>Hybrid</option><option>Remote</option><option>On-site</option></select></label><label className="lab-field">Duration<select value={draft.duration} onChange={e=>update("duration",e.target.value)}>{["3 months","4 months","5 months","6 months"].map(value=><option key={value}>{value}</option>)}</select></label>{(["stipend","minCgpa","openings"] as const).map(key=><label className="lab-field" key={key}>{{stipend:"Monthly stipend (₹)",minCgpa:"Minimum CGPA",openings:"Openings"}[key]}<input type="number" required min={key==="openings"?1:0} max={key==="minCgpa"?10:key==="stipend"?10000000:100000} step={key==="minCgpa"?0.1:1} value={draft[key]} onChange={e=>update(key,Number(e.target.value))}/></label>)}<label className="lab-field">Closing date<input type="date" required value={draft.closing} onChange={e=>update("closing",e.target.value)}/></label><label className="lab-field">Required skills<input required maxLength={10000} placeholder="Python, SQL, React" value={skills} onChange={e=>setSkills(e.target.value)}/><small className="field-helper">Separate each skill with a comma.</small></label><label className="lab-field">Interests<input required maxLength={10000} placeholder="Research, Open source" value={interests} onChange={e=>setInterests(e.target.value)}/><small className="field-helper">Use topics that describe this opportunity.</small></label></div><label className="lab-field">Internship description<textarea required maxLength={1000} rows={4} value={draft.summary} onChange={e=>update("summary",e.target.value)}/></label><fieldset className="editor-branches"><legend>Eligible branches</legend><div className="branch-options">{branches.map(branch=><label className="branch-choice" key={branch}><input type="checkbox" checked={draft.branches.includes(branch)} onChange={()=>update("branches",draft.branches.includes(branch)?draft.branches.filter(item=>item!==branch):[...draft.branches,branch])}/>{branch}</label>)}</div></fieldset><div className="editor-actions"><button className="button button-dark" type="submit">{busy?"Saving…":draft.id?"Save changes":"Publish internship"}</button><button className="outline-button" type="button" onClick={reset}>{draft.id?"Cancel edit":"Clear form"}</button></div></fieldset></form></section>
    <section className="panel managed-catalog"><div className="panel-title"><div><span className="eyebrow">SHARED CATALOG</span><h3>{internships.length} internships</h3><p>Published opportunities are visible to every signed-in student.</p></div></div>{loading?<p role="status">Loading catalog…</p>:!internships.length?<p>No internships yet. Publish your first opportunity above.</p>:<div className="table-scroll"><table className="demo-table"><thead><tr><th>Opportunity</th><th>Location</th><th>Closing date</th><th>Actions</th></tr></thead><tbody>{internships.map(job=><tr key={job.id}><td><strong>{job.role}</strong><br/><span>{job.company}</span></td><td>{job.location}<br/>{job.workMode}</td><td>{job.closing}</td><td><div className="catalog-actions"><button className="outline-button" disabled={busy} onClick={()=>edit(job)}><Pencil size={14}/>Edit</button>{deleteId===job.id?<><button className="outline-button danger-button" disabled={busy} onClick={()=>void deleteOpening(job.id)}>Confirm removal</button><button className="text-action" disabled={busy} onClick={()=>setDeleteId("")}>Cancel</button></>:<button className="outline-button danger-button" disabled={busy} onClick={()=>setDeleteId(job.id)}><Trash2 size={14}/>Remove</button>}</div></td></tr>)}</tbody></table></div>}</section></div>;
}

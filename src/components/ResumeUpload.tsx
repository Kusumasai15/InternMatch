import { Upload, FileCheck, Trash2, X, ShieldCheck, ArrowRight, UserRound } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useResume } from "../lib/resume";

export default function ResumeUpload({onExtract, onNavigate}: {onExtract?: (skills: string[]) => void; onNavigate?: (path: string) => void}) {
  const {user} = useAuth();
  const resume = useResume();
  if(user?.role !== "student" || !resume) return null;
  const {analysis, skills, setSkills, entry, setEntry, busy, loading, progress, message, error, upload, save, remove, add} = resume;
  return <section className="panel resume-panel" aria-labelledby="resume-heading" aria-busy={busy || loading}>
    <div className="resume-intro"><div><span className="eyebrow">UPLOAD RESUME</span><h3 id="resume-heading">Turn your experience into a stronger match</h3><p>Upload your resume to find skills you can review and add to your student profile.</p></div><span className="resume-intro-icon"><FileCheck size={22}/></span></div>
    <div className="resume-upload-area">
      <div className="resume-upload-copy"><span className="resume-upload-icon"><Upload size={19}/></span><div><strong>Start with your resume</strong><span>Text-based PDF or DOCX · up to 5 MB</span></div></div>
      <label className={`button button-dark resume-upload-button${busy || loading ? " is-busy" : ""}`}><Upload size={16}/>{loading ? "Loading resume..." : busy ? "Processing resume..." : "Upload Resume"}<input aria-label="Upload Resume" type="file" accept=".pdf,.docx" disabled={busy || loading} onChange={event=>{const file=event.target.files?.[0];event.target.value="";if(file)void upload(file,onExtract);}}/></label>
    </div>
    {!user?.profile && <div className="resume-profile-note" role="status"><span className="resume-note-icon"><UserRound size={17}/></span><div><strong>Get personalized recommendations</strong><p>You can review your resume now. To use its skills in your matches, complete and save your profile with your branch, CGPA, location, skills, and interests.</p><a href="/profile" onClick={event=>{if(onNavigate && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey){event.preventDefault();onNavigate("/profile");}}}>Complete student profile <ArrowRight size={14}/></a></div></div>}
    {loading && <p role="status">Loading saved resume analysis...</p>}
    <div className="resume-privacy"><ShieldCheck size={16}/><p><strong>Private to your student account.</strong> No external AI services are used. Original files are discarded after analysis; interrupted uploads expire after 10 minutes and are cleaned on API activity or startup.</p></div>
    {busy && <div className="resume-progress" role="progressbar" aria-label="Resume upload" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{width:`${progress}%`}}/></div>}
    {message && <p role="status">{message}</p>}{error && <p className="form-errors" role="alert">{error}</p>}
    {analysis && <div className="resume-results"><h4>Extracted skills · review and correct</h4><div className="tag-input-items">{skills.map(skill=><span className="editable-tag" key={skill}>{skill}<button type="button" disabled={busy || loading} aria-label={`Remove resume skill ${skill}`} onClick={()=>setSkills(skills.filter(value=>value!==skill))}><X size={12}/></button></span>)}</div>
      {!skills.length && <p>No recognized skills remain. Add skills you can demonstrate.</p>}
      <div className="resume-edit-row"><input disabled={busy || loading} aria-label="Add resume skill" maxLength={200} value={entry} onChange={event=>setEntry(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();add();}}} placeholder="Correct or add a skill"/><button type="button" className="outline-button" disabled={busy || loading || !entry.trim()} onClick={add}>Add skill</button></div>
      {analysis.suggestedBranch && <p><strong>Possible field:</strong> {analysis.suggestedBranch}. Confirm your branch in your student profile; eligibility is never inferred automatically.</p>}
      {!!analysis.projectSkills.length && <p><strong>Project skill evidence:</strong> {analysis.projectSkills.join(", ")} (included once in skill coverage).</p>}
      {!!analysis.suggestedInterests.length && <p><strong>Possible interests:</strong> {analysis.suggestedInterests.join(", ")}. Choose your own interests in your student profile.</p>}
      <p className="field-helper">Detected sections: {Object.entries(analysis.sectionsDetected).filter(([,found])=>found).map(([name])=>name).join(", ") || "none"}. Names, contacts, employers and raw sentences are not retained. Complete and save your profile to apply skills if it has not been saved yet.</p>
      <div className="resume-actions"><button type="button" className="button button-dark" disabled={busy || loading} onClick={()=>void save(onExtract)}>Save reviewed skills</button><button type="button" className="outline-button" disabled={busy || loading} onClick={()=>void remove()}><Trash2 size={15}/>Delete resume-derived data</button></div>
    </div>}
  </section>;
}

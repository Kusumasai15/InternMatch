import { useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";

export default function AdminAccountSettings() {
  const {user, updateAccount} = useAuth();
  const [name,setName] = useState(user?.name ?? "");
  const [email,setEmail] = useState(user?.email ?? "");
  const [currentPassword,setCurrentPassword] = useState("");
  const [password,setPassword] = useState("");
  const [confirmation,setConfirmation] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  if(user?.role !== "admin") return null;
  const submit = async (event: FormEvent) => {
    event.preventDefault();setError("");setMessage("");
    if(!name.trim()){setError("Enter your name.");return;}
    if(password !== confirmation){setError("New passwords must match.");return;}
    setBusy(true);
    try {
      await updateAccount({name:name.trim(),email:email.trim(),currentPassword,...(password?{password}: {})});
      setCurrentPassword("");setPassword("");setConfirmation("");
      setMessage("Account updated. Use your updated credentials next time you sign in. Other sessions have been signed out.");
    } catch(err) {setError((err as Error).message);} finally {setBusy(false);}
  };
  return <section className="panel internship-editor" id="admin-account"><div className="panel-title"><div><span className="eyebrow">ACCOUNT SETTINGS</span><h3>Admin account</h3><p>Update your name, email, or password. Enter your current password to confirm changes.</p></div></div>
    {error && <div className="form-errors" role="alert">{error}</div>}{message && <div className="graph-callout" role="status">{message}</div>}
    <form onSubmit={submit}><fieldset disabled={busy} className="editor-fields"><div className="editor-grid">
      <label className="lab-field">Name<input required maxLength={200} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>
      <label className="lab-field">Email<input required type="email" maxLength={254} autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label className="lab-field">Current password<input required type="password" minLength={10} maxLength={128} autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label>
      <label className="lab-field">New password (optional)<input type="password" minLength={10} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/><small className="field-helper">Leave blank to keep your password. Use at least 10 characters.</small></label>
      <label className="lab-field">Confirm new password<input type="password" required={!!password} minLength={10} maxLength={128} autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>
    </div><div className="editor-actions"><button className="button button-dark" type="submit">{busy?"Saving…":"Save account changes"}</button></div></fieldset></form></section>;
}

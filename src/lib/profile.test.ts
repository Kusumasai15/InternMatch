import { describe, it, expect, vi } from "vitest";
import { emptyProfile, parseProfile, readProfile, saveProfile, setStorageAccount, writeSaved, readSaved } from "./storage";
import { defaultProfile } from "../data";
import { rankInternships } from "./matching";
import { internships } from "../data";
describe("entered profiles", () => {
  it("keeps saved profiles and shortlists separate between accounts", () => {
    const entries=new Map<string,string>();
    vi.stubGlobal("window",{localStorage:{getItem:(key:string)=>entries.get(key)??null,setItem:(key:string,value:string)=>entries.set(key,value)}});
    setStorageAccount("student-a");saveProfile({...defaultProfile,name:"Student A"});writeSaved(["role-a"]);
    setStorageAccount("student-b");expect(readProfile().branch).toBe("");expect(readSaved()).toEqual([]);
    saveProfile({...defaultProfile,name:"Student B"});writeSaved(["role-b"]);
    setStorageAccount("student-a");expect(readProfile().name).toBe("Student A");expect(readSaved()).toEqual(["role-a"]);
    setStorageAccount("anonymous");vi.unstubAllGlobals();
  });
  it("requires profile signals but permits an empty name and zero CGPA", () => {
    expect(parseProfile(emptyProfile)).toBeNull();
    expect(parseProfile({...defaultProfile,name:"",cgpa:0})).not.toBeNull();
    for (const patch of [{branch:""},{cgpa:NaN},{location:" "},{skills:[]},{interests:[]}]) expect(parseProfile({...defaultProfile,...patch})).toBeNull();
  });
  it("starts blank, persists valid profiles and ignores corrupt storage", () => {
    const entries = new Map<string,string>();
    vi.stubGlobal("window",{localStorage:{getItem:(key:string)=>entries.get(key)??null,setItem:(key:string,value:string)=>entries.set(key,value)}});
    expect(readProfile().branch).toBe("");
    const entered = {...defaultProfile,name:"",skills:[" Python ","python"]};
    saveProfile(entered);
    expect(readProfile().name).toBe("");
    expect(readProfile().skills).toEqual(["python"]);
    entries.set("sihmatch-profile-v2:anonymous","broken");
    expect(readProfile().branch).toBe("");
    vi.unstubAllGlobals();
  });
  it("recomputes rankings and what-if scores from entered signals", () => {
    const before=rankInternships({...defaultProfile,skills:["Figma"]},internships);
    const after=rankInternships({...defaultProfile,skills:["React","TypeScript","Python","SQL"]},internships);
    expect(after.map(r=>r.match.score)).not.toEqual(before.map(r=>r.match.score));
  });
});

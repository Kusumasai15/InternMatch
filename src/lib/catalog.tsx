// Shared internship catalog: load records from FastAPI and refresh them for every page.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import { branches } from "../data/skills";
import type { Internship } from "../types";
export function parseInternship(raw: unknown): Internship | null {
  if(!raw||typeof raw!=="object")return null;
  const r=raw as Record<string,unknown>;
  const text=(v:unknown):v is string=>typeof v==="string"&&v.trim().length>0&&v.length<=1000;
  const list=(v:unknown):v is string[]=>Array.isArray(v)&&v.length>0&&v.length<=100&&v.every(text);
  const number=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v)&&v>=0;
  if(!text(r.id)||!text(r.role)||!text(r.company)||!text(r.sector)||!text(r.location)||!text(r.duration)||!text(r.summary)||!text(r.closing)||!Number.isFinite(Date.parse(r.closing))||!list(r.branches)||!r.branches.every(b=>branches.includes(b))||!list(r.requiredSkills)||!list(r.interests)||!number(r.stipend)||!number(r.minCgpa)||r.minCgpa>10||!number(r.openings)||r.openings<1||!Number.isInteger(r.openings)||!number(r.applicants)||!Number.isInteger(r.applicants)||(r.workMode!=="Remote"&&r.workMode!=="Hybrid"&&r.workMode!=="On-site"))return null;
  return {id:r.id,role:r.role.trim(),company:r.company.trim(),sector:r.sector.trim(),location:r.location.trim(),duration:r.duration.trim(),summary:r.summary.trim(),closing:r.closing,minCgpa:r.minCgpa,stipend:r.stipend,openings:r.openings,applicants:r.applicants,workMode:r.workMode,branches:[...new Set(r.branches)],requiredSkills:[...new Set(r.requiredSkills.map(s=>s.trim()))],interests:[...new Set(r.interests.map(s=>s.trim()))],logo:text(r.logo)?r.logo:r.company[0],logoTone:text(r.logoTone)?r.logoTone:"green"};
}
type Catalog = {internships:Internship[];error:string;loading:boolean;refresh:()=>Promise<void>;save:(job:Internship)=>Promise<void>;remove:(id:string)=>Promise<void>};
const Context=createContext<Catalog|null>(null);
export function CatalogProvider({children, initialInternships=[]}: {children:ReactNode;initialInternships?:Internship[]}) {
  const [internships,setInternships]=useState<Internship[]>(initialInternships);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const load = async (signal?: AbortSignal) => {
    const raw=await api<unknown[]>("/api/internships", {signal});
    const items=raw.map(parseInternship);
    if(items.some(item=>item===null))throw new Error("The catalog contains an invalid internship.");
    return items as Internship[];
  };
  const refresh = async () => {
    try {setInternships(await load());setError("");}
    catch(err){setError((err as Error).message);}
    finally{setLoading(false);}
  };
  useEffect(()=>{
    const controller=new AbortController();
    load(controller.signal).then(items=>{setInternships(items);setError("");}).catch(err=>{if(err.name!=="AbortError")setError(err.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    const onFocus=()=>void refresh();
    window.addEventListener("focus",onFocus);
    const timer=window.setInterval(onFocus,30000);
    return()=>{controller.abort();window.removeEventListener("focus",onFocus);window.clearInterval(timer);};
  },[]);
  const save=async(job:Internship)=>{
    const {id,...details}=job;
    const result=await api<Internship>("/api/internships"+(id?"/"+encodeURIComponent(id):""),{method:id?"PUT":"POST",body:JSON.stringify(details)});
    setInternships(previous=>[result,...previous.filter(item=>item.id!==result.id)]);setError("");
  };
  const remove=async(id:string)=>{
    await api("/api/internships/"+encodeURIComponent(id),{method:"DELETE"});
    setInternships(previous=>previous.filter(item=>item.id!==id));setError("");
  };
  return <Context.Provider value={{internships,error,loading,refresh,save,remove}}>{children}</Context.Provider>;
}
export function useCatalog(){const value=useContext(Context);if(!value)throw new Error("Missing catalogue provider");return value;}

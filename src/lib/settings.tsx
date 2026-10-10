import {createContext,useContext,useEffect,useState,type ReactNode} from "react";
import {dictionary,type Language,type Label} from "../i18n";
import { readPreferences, applyTheme, PREFERENCES_KEY } from "./theme";
type Settings={language:Language;theme:"light"|"dark";setLanguage:(l:Language)=>void;toggleTheme:()=>void;t:(key:Label)=>string};
const Context=createContext<Settings|null>(null);
export function SettingsProvider({children}:{children:ReactNode}){const [settings,setSettings]=useState(readPreferences);useEffect(()=>{applyTheme(settings.theme);document.documentElement.lang=settings.language;try{localStorage.setItem(PREFERENCES_KEY,JSON.stringify(settings));}catch{/* Preferences still work for this session. */}},[settings]);return <Context.Provider value={{...settings,setLanguage:language=>setSettings(s=>({...s,language})),toggleTheme:()=>setSettings(s=>({...s,theme:s.theme==="light"?"dark":"light"})),t:key=>dictionary[settings.language][key]}}>{children}</Context.Provider>;}
export function useSettings(){const settings=useContext(Context);if(!settings)throw new Error("Missing settings provider");return settings;}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthProvider } from "../lib/auth";
import { SettingsProvider } from "../lib/settings";
import { defaultProfile, internships } from "../data";
import { rankInternships } from "../lib/matching";
import Login from "./Login";
import Sidebar from "../components/Sidebar";
beforeEach(()=>vi.stubGlobal("localStorage",{getItem:()=>null,setItem:()=>{}}));
afterEach(()=>vi.unstubAllGlobals());
describe("account interface",()=>{
  it("shows sign-in and student registration with no admin signup",()=>{
    const html=renderToStaticMarkup(<SettingsProvider><AuthProvider><Login/></AuthProvider></SettingsProvider>);
    expect(html).toContain("Student registration");expect(html).toContain('type="password"');expect(html).toContain("Admin accounts are created");expect(html).not.toContain("Admin registration");
  });
  it("shows catalog management navigation only to admins",()=>{
    const sidebar=(role:"student"|"admin")=>renderToStaticMarkup(<SettingsProvider><Sidebar mobileNav={false} pathname="/" route={role==="admin"?"admin":"profile"} ranked={rankInternships(defaultProfile,internships)} profile={defaultProfile} navigate={()=>{}} setToast={()=>{}} role={role}/></SettingsProvider>);
    expect(sidebar("student")).not.toContain('href="/admin"');expect(sidebar("admin")).toContain('href="/admin"');
  });
  it("places the active resume analyzer directly below My profile for students only",()=>{
    const sidebar=(role:"student"|"admin")=>renderToStaticMarkup(<SettingsProvider><Sidebar mobileNav={true} pathname="/resume" route={role==="student"?"resume":"admin"} ranked={[]} profile={defaultProfile} navigate={()=>{}} setToast={()=>{}} role={role}/></SettingsProvider>);
    const student=sidebar("student");
    expect(student).toMatch(/href="\/profile"[^]*?<\/a><a aria-current="page" href="\/resume"/);
    expect(student).toContain("AI Resume Analyzer");
    expect(student).toContain("lucide-file-up");
    expect(student).toContain("sidebar--open");
    expect(sidebar("admin")).not.toContain('href="/resume"');
  });

});

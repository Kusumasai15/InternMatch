import { AuthProvider } from "../lib/auth";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsProvider } from "../lib/settings";
import { CatalogProvider } from "../lib/catalog";
import { defaultProfile, internships } from "../data";
import { rankInternships } from "../lib/matching";
import ManageInternships from "./ManageInternships";
import ProfilePage from "./Profile";
import InternshipListings from "./Internships";
import Recommendations from "./Recommendations";
import Applications from "./Applications";
import GraphPage from "./Graph";
import DetailPage from "./InternshipDetail";
import CompareTable from "../components/CompareTable";

const noop = () => {};
const opening = internships[0];
const profile = {...defaultProfile, name: "Student Test"};
function render(page: React.ReactNode) {
  return renderToStaticMarkup(<SettingsProvider><AuthProvider><CatalogProvider initialInternships={internships}>{page}</CatalogProvider></AuthProvider></SettingsProvider>);
}
beforeEach(() => {
  const storage = {getItem: () => null, setItem: noop};
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", {localStorage: storage, location: {search: ""}});
});
afterEach(() => vi.unstubAllGlobals());

describe("workspace pages", () => {
  it("renders the admin publishing form and shared catalog", () => {
    const html=render(<ManageInternships/>);
    expect(html).toContain("Manage internships");expect(html).toContain("Publish internship");expect(html).toContain("Eligible branches");
  });
  it("renders the profile form with required controls and optional name", () => {
    const html = render(<ProfilePage profile={profile} onUpdate={noop} onNavigate={noop} notify={noop}/>);
    expect(html).toContain("Student profile");
    expect(html).toContain("Full name (optional)");
    expect(html).toContain("Save profile");
  });
  it("renders listings and comparison controls", () => {
    const html = render(<InternshipListings profile={profile} saved={[]} onOpen={noop} onSave={noop} searchInitial="" branchInitial={null} setToast={noop}/>);
    expect(html).toContain(opening.role);
    expect(html).toContain("Compare");
    expect(html).toContain("Filters");
  });
  it("renders saved-profile recommendations without removed simulations", () => {
    const html = render(<Recommendations profile={profile} ranked={rankInternships(profile, internships)} saved={[]} onSave={noop} onOpen={noop} onNavigate={noop}/>);
    expect(html).toContain("Recommended internships");
    expect(html).not.toContain("Try changes here");
    expect(html).not.toContain("What if");
  });
  it("renders the graph and accessible exploration controls", () => {
    const html = render(<GraphPage profile={profile}/>);
    expect(html).toContain("Graph analytics");
    expect(html).toContain("Search graph nodes");
    expect(html).toContain("Zoom in");
  });
  it("renders the tracker with a saved internship", () => {
    const html = render(<Applications saved={[opening.id]} onSave={noop} onOpen={noop} onNavigate={noop}/>);
    expect(html).toContain(opening.role);
    expect(html).toContain("Mark applied");
    expect(html).toContain("Personal deadline");
  });
  it("renders internship details and match breakdown", () => {
    const html = render(<DetailPage id={opening.id} profile={profile} onBack={noop} onNavigate={noop} saved={[]} onSave={noop}/>);
    expect(html).toContain("About this internship");
    expect(html).toContain("Eligibility &amp; requirements");
    expect(html).toContain("Save this opportunity");
  });
  it("renders comparison scores for a shortlist", () => {
    const html = render(<CompareTable jobs={internships.slice(0, 2)} profile={profile} openings={internships} onRemove={noop}/>);
    expect(html).toContain("Compare your shortlist (2/3)");
    expect(html).toContain("Monthly stipend");
  });
});

import {describe,it,expect} from "vitest";
import {forceLayout} from "./force";
import {parseInternship} from "./catalog";
import {internships} from "../data/internships";
describe("graph and editable catalogue",()=>{
 it("settles deterministically inside the canvas",()=>{const ids=["student","skill","opening"],edges=[{from:"student",to:"skill"},{from:"skill",to:"opening"}];const first=forceLayout(ids,edges);expect(first).toEqual(forceLayout(ids,edges));expect(first.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)&&n.x>=45&&n.x<=925&&n.y>=40&&n.y<=565)).toBe(true);});
 it("handles empty/single graphs and unknown edge endpoints",()=>{expect(forceLayout([],[])).toEqual([]);expect(forceLayout(["s"],[{from:"missing",to:"s"}])).toHaveLength(1);});
 it("accepts every seed opening and rejects malformed local edits",()=>{expect(internships.every(j=>parseInternship(j)!==null)).toBe(true);expect(parseInternship({...internships[0],workMode:"onsite"})).toBeNull();expect(parseInternship({...internships[0],minCgpa:11})).toBeNull();expect(parseInternship({...internships[0],branches:["invented"]})).toBeNull();expect(parseInternship({...internships[0],closing:"invalid"})).toBeNull();});
});

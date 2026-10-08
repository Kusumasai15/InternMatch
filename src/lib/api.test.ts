import { afterEach, describe, expect, it, vi } from "vitest";
import { api, setCsrfToken } from "./api";
afterEach(()=>{vi.unstubAllGlobals();setCsrfToken("");});
describe("account API",()=>{
  it("uses session cookies and CSRF for catalog mutations",async()=>{
    const request=vi.fn().mockResolvedValue({ok:true,status:201,json:async()=>({id:"new"})});
    vi.stubGlobal("fetch",request);setCsrfToken("test-csrf");
    await api("/api/internships",{method:"POST",body:"{}"});
    const options=request.mock.calls[0][1];
    expect(options.credentials).toBe("include");
    expect(options.headers.get("X-CSRF-Token")).toBe("test-csrf");
  });
  it("reports expired sessions to the account provider",async()=>{
    const expired=vi.fn();vi.stubGlobal("window",{dispatchEvent:expired});
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:false,status:401,json:async()=>({detail:"Sign in to continue"})}));
    await expect(api("/api/internships")).rejects.toThrow("Sign in");
    expect(expired).toHaveBeenCalledOnce();
  });
});

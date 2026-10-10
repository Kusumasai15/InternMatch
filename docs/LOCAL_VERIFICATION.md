# Local repair and verification — 10 October 2026

## Problems and fixes

- Copied `node_modules` was incomplete: Vitest and TypeScript entry points were missing. Reinstalled with npm and generated `package-lock.json`.
- Python command aliases were inaccessible inside the execution sandbox; installed Python 3.12.10 through `py install 3.12` and created root `.venv`. Existing Python 3.14 and `backend/.venv` were preserved. Project metadata requires 3.12 and the pinned Pydantic dependency was installed successfully on that version.
- npm initially reported six vulnerabilities in the old Vite/Vitest toolchain. Updated Vite to 8.3.4, React plugin to 6.1.2, and Vitest to 5.0.3. The resulting npm audit reported zero vulnerabilities. Node 22.12+ is now required; installed Node 24.21.0 works. npm is the documented package manager. The original pnpm lockfile is retained as a historical file; use `package-lock.json` and npm for this setup.
- Graph proximity always returned zero: directed student-to-skill and internship-to-skill edges could not form a directed student-to-internship path. Use the undirected relationship view for both proximity and readable paths, while retaining the directed graph for relation semantics. Added assertions for a two-hop connection and proximity 0.5.
- Frontend had no API proxy and defaulted to a hardcoded backend origin. Added development/preview `/api` proxy to loopback port 8000, with same-origin requests by default and an optional `VITE_API_URL` override. Restricted Vite binding to loopback; preserved UI styling and features.
- Setup documentation incorrectly allowed Python 3.11 and lacked an integrated Windows launcher. Updated README, added explicit interpreter commands, npm commands, VS Code setup, and `start-local.ps1`.
- The first launcher readiness checks failed despite successful process startup. Replaced them with direct loopback requests with system proxies disabled. The corrected launcher passed readiness checks and keeps both servers running.
- Execution sandbox blocked package network access, build-tool parent-directory access, and PostgreSQL binary DLL loading. Necessary commands passed when rerun with approved unsandboxed execution. These were environment restrictions, not application failures.

## Files changed

`backend/app/analytics.py`, `backend/tests/test_analytics.py`, `src/lib/api.ts`, `vite.config.ts`, `package.json`, `package-lock.json`, `.env.example`, `.gitignore`, `README.md`, `start-local.ps1`, `scripts/smoke_local.py`, and this report.

## Verification results

| Check | Result |
| --- | --- |
| Python interpreter | 3.12.10 in root `.venv` |
| Backend dependency installation and `pip check` | Installed; no broken requirements |
| `python -m pytest backend/tests -q` | 29 passed |
| `npm test` | 30 passed in 7 files |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; output in `dist/` |
| npm dependency audit | Zero vulnerabilities |
| `git diff --check` | Passed |
| PowerShell launcher | Starts both servers; readiness checks passed |
| Real localhost frontend, health, docs, API proxy requests | HTTP 200; anonymous `/api/auth/me` correctly returns 401 |
| `python scripts/smoke_local.py` | Passed all real HTTP flow checks below |

The smoke script checks the main localhost servers without account mutations, then launches a disposable backend on port 8001 with temporary SQLite storage. It verifies registration, student login/logout, profile update and persistence, the 40-item seed catalog, NetworkX results with nonzero proximity, admin login, publish/edit/remove, expected 404/422 responses, and CORS preflight. Passwords are generated at runtime; test fixtures are never inserted into the user's database. The temporary server is stopped afterward.

Existing backend tests additionally verify duplicate accounts, password hashing, session expiry/rotation, rate limiting, CSRF/origin checks, student/admin permissions, admin account changes, account isolation, and seed deletion persistence across initialization. Frontend tests cover matching aliases, related skills, eligibility gates, capped graph bonuses, profile parsing/storage isolation, routes, API error handling, graph layout, catalog validation, and static page rendering.

## Limits and incomplete features

- No browser was available through the browser connector. Interactive form clicks, search/filter interactions, responsive appearance, browser console errors, and a full accessibility audit remain unverified. Static rendering tests and real HTTP requests passed; they do not replace browser interaction testing.
- Saved internships and application stages/notes/deadlines are account-specific localStorage data. They do not synchronize across devices or submit employer applications. There is no employer submission API.
- The catalog is the original 40 demonstration listings, not verified live opportunities. No new real-looking internship data was added.
- SQLite initialization creates missing tables and seeds once, preserving existing records. There is no versioned migration framework; no schema change was needed.
- The dashboard is the existing recommendations/graph workspace and admin catalog view; no separate dashboard service was found.
- Optional Neo4j and hosted PostgreSQL were not run. SQLite is the verified local database. No deployment was performed.
- One dependency deprecation warning remains: Starlette's TestClient references the deprecated AnyIO `BlockingPortal` alias. All backend tests passed. Vite emitted a build timing diagnostic; the build completed without compilation errors.

## Starting and stopping

From the VS Code PowerShell terminal in the project root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-local.ps1
```

Keep the terminal open. Ctrl+C stops its child servers. The script never reinstalls packages; logs go to `.local-logs/`. If a port is occupied, it reports the conflict without killing the other process.

- Frontend: http://localhost:3000
- Backend health: http://localhost:8000/api/health
- FastAPI docs: http://localhost:8000/docs
- Backend origin: http://localhost:8000 (no root `/` endpoint is implemented; root 404 is expected)

No default admin password exists. Create an admin only if needed:

```powershell
.\.venv\Scripts\python.exe -m backend.create_admin
```

The command prompts securely for credentials. Select `.venv\Scripts\python.exe` as the VS Code Python interpreter. No cloud account or environment secrets are required for local SQLite execution.

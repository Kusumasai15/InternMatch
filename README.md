# 🌊 InternMatch

**Explainable internship discovery, guided by your skills.**
https://student-internship recommentation.vercel.app/
![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![NetworkX](https://img.shields.io/badge/Analytics-NetworkX-0891B2)
![Production verification pending](https://img.shields.io/badge/Production-verification_pending-orange)

InternMatch is a full-stack student–internship recommendation system. Students build profiles, extract skills from resumes, and explore opportunities with transparent compatibility scores and graph insights. Administrators maintain a shared catalog through an authenticated management workspace.

> The bundled **40 internships are demonstration listings**, not verified live openings. Local functionality has documented test coverage; the latest authentication/resume changes still require real PostgreSQL and live Vercel verification.

[Local setup](#-local-setup) · [Configuration](#-environment-configuration) · [Testing](#-testing-and-verification) · [Deployment](#-vercel-deployment) · [Student guide](docs/STUDENT_GUIDE.md)

## ✨ Key features

| Area | Implemented functionality |
|---|---|
| Resume assistance | Private PDF/DOCX upload, automatic skill extraction, review/correction, persistence, and deletion of resume-derived data |
| Personalized discovery | Branch/CGPA eligibility, weighted compatibility scores, matched/missing skills, explanations, and skill-gap suggestions |
| Student dashboard | Profile summary, ranked recommendations, search/filter, details, comparison, saved opportunities, and application tracking |
| Graph exploration | Interactive visualization with NetworkX similarity, proximity, centrality, communities, and readable connection paths |
| Authentication | Student registration, student/admin sign-in, server-backed sessions, and role-aware navigation |
| Admin dashboard | Publish/edit/remove internships and update account name, email, and password with current-password confirmation |
| Interface | Midnight Ocean and Ocean Light, persistent theme switcher, responsive layouts, animations, and reduced-motion support |

Catalog changes refresh on window focus and every 30 seconds. Saved opportunities and application stages, notes, and deadlines are **account-specific browser data**; they do not sync across devices or submit applications to employers.

## 📄 Resume-to-recommendation workflow

1. Register as a student and open **My profile**.
2. Upload a text-based **PDF or DOCX up to 5 MiB**. Progress and validation errors appear inline.
3. Review extracted skills, remove incorrect matches, add corrections, and select **Save reviewed skills**.
4. Confirm branch, CGPA (0–10), interests, and preferred location. These fields and at least one skill are required; profile name is optional. Existing profiles receive detected skills automatically; a new profile applies them on its first save.
5. Explore **For you**, compare roles, save opportunities, and track applications. **Delete resume-derived data** removes analysis and skills introduced by it while retaining previously saved manual skills.

Extraction uses a bounded vocabulary, aliases, and deterministic parsing with PyMuPDF and python-docx. Project skill evidence, section flags, and advisory education/career-interest suggestions are detected. No paid LLM is used, CGPA is not inferred, and repeated keywords do not earn extra points. Scanned/textless PDFs require external OCR; OCR is not implemented.

After processing, only structured analysis is retained, rather than original files, raw sentences, or contact details. Interrupted uploads use private database staging, expire after ten minutes, and are cleaned during API startup or resume activity; cleanup is not a background timer. Provider backups have separate retention policies. See [resume behavior, privacy, and verification](docs/RESUME_RECOMMENDATIONS.md).

## 🧠 Explainable matching and NetworkX

**Branch and minimum CGPA are hard eligibility gates.** Eligible roles use these default weights:

| Component | Weight | Basis |
|---|---:|---|
| Skills | 50% | Required-skill coverage, aliases, related-skill half credit, and capped co-occurrence bonus |
| Interests | 20% | Overlap with listing interests |
| Location | 15% | Preferred location and remote/hybrid/on-site mode |
| Academics | 15% | CGPA headroom above the minimum |

```text
score = round(0.50 × skillFit + 0.20 × interestFit
            + 0.15 × locationFit + 0.15 × academicFit)
```

Components are scaled to 0–100. The graph bonus adds at most eight points **inside the skills component**, capped at 100. Resume and manual skills use the same rules. **For you** includes eligible roles with at least one directly matched skill or interest. Ineligible roles remain visible in the catalog with zero scores and exclusion reasons. Scores estimate compatibility, not hiring probabilities.

The recommendation system has two complementary parts: [TypeScript matching](src/lib/matching.ts) ranks listings and explains scores; [NetworkX analytics](backend/app/analytics.py) builds a student–skill–interest–internship–company–domain graph. NetworkX returns Jaccard similarity, undirected path proximity, shortest paths, skill co-occurrence centrality, and modularity communities. Its stateless endpoint calculates from the supplied profile/catalog without exposing stored account records. Frontend graph exploration remains available if analytics fails after catalog loading.

## 🛠️ Technology stack and design

| Layer | Technologies |
|---|---|
| Frontend | React 18, TypeScript, Vite, Lucide icons, SVG graph visualization |
| API | Python 3.12, FastAPI, Pydantic, Uvicorn |
| Recommendations | TypeScript scoring; NetworkX graph analytics |
| Resume parsing | PyMuPDF, python-docx |
| Persistence | SQLite locally; PostgreSQL through psycopg, with Neon configuration documented |
| Hosting | Vercel configuration for Vite SPA + FastAPI Python Function |
| Verification | Vitest, pytest/FastAPI TestClient, Playwright/Chromium, HTTP smoke checks, GitHub Actions |
| Optional demo | Neo4j, Docker Compose, Cypher fixtures |

**Midnight Ocean** defaults to navy surfaces and cyan accents; **Ocean Light** provides a light alternative. The keyboard-accessible moon/sun button on sign-in and in the header saves the preference and switches without reloading. Existing preferences are preserved. Responsive cards/forms, scrolling tables/boards, entrance/stagger effects, hover/focus feedback, match progress, and brief loading skeletons respect reduced-motion preferences. See [theme and responsive verification](docs/MIDNIGHT_OCEAN.md).

## 🚀 Local setup

Use **Python 3.12**, **Node.js ≥22.12** (Node 24 is used in CI), and npm. The declared Python range is `>=3.12,<3.13`; newer interpreters are unsupported. Docker is needed only for the optional Neo4j demo.

Run commands from the repository root containing `package.json` and `backend/`. Examples use Windows PowerShell.

### Install dependencies

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
npm ci
```

Install Python 3.12 first if missing; Python Install Manager users can run `py install 3.12`. On macOS/Linux, use `python3.12 -m venv .venv` and `.venv/bin/python` in place of the Windows interpreter path.

### Create an admin (optional)

```powershell
.\.venv\Scripts\python.exe -m backend.create_admin
```

The command prompts for name, email, and a password of at least ten characters. **There are no default admin credentials.** Public registration creates students only; this command does not promote existing students. Use the same database configuration for admin setup and the API.

### Start both services

Terminal one:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal two:

```powershell
npm run dev
```

| Service | Local URL |
|---|---|
| Application | http://localhost:3000 |
| API documentation | http://localhost:8000/docs |
| Health | http://localhost:8000/api/health |
| Database readiness | http://localhost:8000/api/readiness |

Use `localhost` consistently. FastAPI is required for authentication and the shared catalog; its root `/` has no endpoint.

After installation, the Windows launcher can start both services instead:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-local.ps1
```

It checks dependencies/ports, waits for HTTP readiness, and writes logs to `.local-logs/`. Keep its terminal open; Ctrl+C stops its child servers. It does not reinstall packages or terminate unrelated processes. In VS Code, select `.venv\Scripts\python.exe` as the interpreter. Activation is optional when using explicit interpreter paths.

## 🔐 Environment configuration

Local SQLite setup needs no secrets. Optional overrides belong in root `.env.local` and `backend/.env`; refer to [.env.example](.env.example) and [backend/.env.example](backend/.env.example). Restart the relevant server after changes.

| Variable | Local development | Vercel / hosted production |
|---|---|---|
| `VITE_API_URL` | Empty/unset; Vite proxies `/api` to `127.0.0.1:8000` | Empty/unset for same-origin requests |
| `APP_DATABASE_PATH` | Optional; default `backend/data/app.sqlite3` | Leave unset; production rejects SQLite |
| `DATABASE_URL` | Leave unset for SQLite | Secret PostgreSQL URL; Neon pooled runtime connection with provider TLS options |
| `ALLOWED_ORIGINS` | Exact origins, e.g. `http://localhost:3000,http://127.0.0.1:3000` | Exact HTTPS aliases/custom domains; no wildcard or path |
| `COOKIE_SECURE` | `false` for local HTTP | `true`; production enforces secure cookies |
| `APP_ENV` | Unset | `production` for separately hosted production APIs; Vercel is detected automatically |
| `TEST_DATABASE_URL` | Optional disposable direct PostgreSQL database | Never use production storage for tests |

Never put database credentials in `VITE_*`: these values are exposed to the browser. Keep real environment files and connection strings out of commits, screenshots, and logs. An explicit backend URL is supported with matching CORS settings; do not use `/api` as `VITE_API_URL`, because request paths already contain it.

### Security and persistence

- Scrypt password hashing, hashed opaque session tokens, and eight-hour HttpOnly, SameSite=Lax cookies; Secure is enforced in production.
- CSRF tokens and origin checks for authenticated mutations, admin authorization for management, and authentication/upload-start rate limits.
- Current-password confirmation and duplicate-email checks for admin account updates; other sessions are revoked while the current browser stays signed in.
- Student-only, account-owned resume analysis with signature/structure, size/page/text, archive expansion, and unsafe XML/encrypted-document validation.
- API `Cache-Control: no-store` and sanitized health/readiness failures.

| Data | Storage |
|---|---|
| Accounts, profiles, sessions, internships, structured resume results | Backend database |
| Profile cache | Account-specific localStorage; server profile is authoritative on sign-in |
| Saved roles and application tracking | Account-specific localStorage in this browser |
| Theme preference | localStorage |

Authentication secrets are not stored in localStorage. Back up SQLite to preserve platform data. Demo listings seed only once: restarts preserve edits/deletions, and editing seed JSON does not update an existing database. PostgreSQL initialization does not migrate local records. There is no versioned migration framework yet.

## ✅ Testing and verification

After installing dependencies, run from the root:

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -q --basetemp .local-logs/pytest-readme
npm test
npm run typecheck
npm run build
```

With localhost services running and port 8001 free:

```powershell
.\.venv\Scripts\python.exe scripts/smoke_local.py
npx playwright install chromium
npm run test:ui
```

Smoke/browser scripts exercise disposable SQLite data on port 8001, preserving the main database. Screenshots go to `.local-logs/ui/`.

For PostgreSQL, securely set `TEST_DATABASE_URL` to a dedicated disposable direct database with schema-creation permission, then run:

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_accounts.py backend/tests/test_resumes.py -q
```

Each test uses a private disposable schema. GitHub Actions configures frontend checks, SQLite tests, and these PostgreSQL suites; configuration alone does not prove a successful CI run.

| Scope | Recorded status |
|---|---|
| Latest local resume/auth report | 52 backend tests, 33 frontend tests, TypeScript checking, and production build passed |
| Chromium | Resume upload/review/reload/deletion plus 68 page/theme/viewport checks passed |
| Local HTTP flows | Auth, profile persistence, catalog CRUD, analytics, CORS, and validation documented as passing |
| Real PostgreSQL/Neon and latest Vercel release | Integration, cloud build, and live acceptance verification pending |
| Broader UI coverage | Firefox/Safari, physical-device touch, full accessibility audit, and every admin control remain unverified |

These are **previously recorded results**, not tests rerun for this README edit. See the [latest resume report](docs/RESUME_RECOMMENDATIONS.md), [UI report](docs/MIDNIGHT_OCEAN.md), and [earlier local verification](docs/LOCAL_VERIFICATION.md) for scope and historical counts.

The build output is `dist/`. Run `npm run preview` to open http://localhost:4173 with FastAPI still running. Add that exact origin to `ALLOWED_ORIGINS` and restart the API before authenticated preview testing.

## ☁️ Vercel deployment

[vercel.json](vercel.json) and [api/index.py](api/index.py) configure one project containing the Vite SPA and FastAPI Python Function. API rewrites precede the SPA fallback; the configured function duration is 60 seconds. **Prepared configuration is not a verified deployment.** Earlier production logs informed the PostgreSQL authentication fix; the latest changes have not been confirmed live.

1. Run local checks and disposable PostgreSQL tests. Review the diff and secret exclusions before manually publishing the intended code to GitHub.
2. Provision Neon PostgreSQL with separate production and preview databases/branches. Use a pooled runtime URL with provider TLS options; psycopg prepared statements are disabled for pooler compatibility.
3. Import the repository into Vercel: **root = repository root**, **preset = Vite**, **Node = 24.x**, **install = `npm ci`**, **build = `npm run build`**, **output = `dist`**. Python 3.12 is declared in the repository.
4. Set `DATABASE_URL`, exact HTTPS `ALLOWED_ORIGINS`, and `COOKIE_SECURE=true` separately per environment. Leave `VITE_API_URL` unset. Vercel adds its generated deployment hostname as an exact allowed origin; stable aliases/custom domains still need configuration.
5. Create the hosted admin with `python -m backend.create_admin` against the intended database using the secure process-only credential procedure in the deployment guide. Hosted and local users are separate.
6. Deploy manually to a preview first. Verify health/readiness, `/api/docs`, direct SPA routes, anonymous/wrong-login 401 responses, real student/admin login, secure cookies, profile persistence, PDF/DOCX upload/review/deletion, and catalog CRUD.
7. Confirm persistence after redeployment and measure cloud bundle size, memory, cold starts, and routing before production promotion.

Use the [deployment guide](docs/DEPLOYMENT.md) together with the [latest resume acceptance checks](docs/RESUME_RECOMMENDATIONS.md). The authentication rate-limit UPSERT now qualifies `auth_attempts.attempts` to address the observed PostgreSQL ambiguous-column failure. SQLite regression results do not establish the live Neon fix. PyMuPDF licensing and the actual Vercel Python bundle/runtime behavior also require review before distribution. No push or deployment is performed by this documentation update.

## 🏗️ Architecture and project map

```text
React / TypeScript browser
  ├─ Matching, graph UI, account-specific localStorage
  └─ Same-origin /api
       ├─ Local: Vite proxy → Uvicorn / FastAPI → SQLite
       └─ Hosted configuration: Vercel Python Function → Neon PostgreSQL
          FastAPI: accounts, catalog, resume parsing, NetworkX analytics
```

| Path | Responsibility |
|---|---|
| `src/pages/`, `src/components/` | Student/admin views and reusable UI, including resume upload |
| `src/lib/` | API/auth, matching, catalog, storage, routes, theme, graph layout |
| `src/midnight-ocean.css` | Theme tokens and motion layered over existing structural styles |
| `backend/app/` | Routes, security, database adapters, document analysis, graph calculations |
| `backend/create_admin.py` | Interactive admin provisioning |
| `api/index.py`, `vercel.json` | Vercel entry point, build, and routing |
| `data/`, `neo4j/` | Demo fixtures and optional independent graph demonstration |
| `backend/tests/`, `scripts/`, `.github/workflows/` | Regression, HTTP/UI verification, seed export, CI |
| `docs/`, `public/` | Guides, verification reports, branding, route metadata |

### Optional Neo4j demonstration

```powershell
docker compose up -d neo4j
python scripts/export_neo4j_seed.py
```

Open http://localhost:7474 and follow the [Neo4j guide](neo4j/README.md) for demo credentials and seed import. Neo4j is independent of the application database; admin edits are not synchronized into it.

## 🔭 Future improvements

Planned directions, **not implemented features**:

- Complete Neon integration and live Vercel acceptance checks for the latest changes.
- Add versioned database migrations and verified local-to-hosted migration.
- Sync saved roles and application tracking across devices.
- Integrate verified live listings and employer application workflows.
- Expand resume vocabulary, evaluate OCR, and add scheduled staging cleanup where required.
- Broaden accessibility/cross-browser testing and measure production latency/capacity.

## Troubleshooting and further reading

- **Missing requirements/module:** run from the root, use the correct virtual environment, and install `backend/requirements-dev.txt` for pytest.
- **Sign-in/catalog error:** start FastAPI, check `VITE_API_URL` and exact allowed origins, then use the retry action.
- **Port 3000 occupied:** stop the conflicting service; Vite requires that port.
- **Local login works, hosted login fails:** accounts are separate. Check deployed auth fixes/readiness and register or create the account in the intended environment.

[Student guide](docs/STUDENT_GUIDE.md) · [Architecture](docs/ARCHITECTURE.md) · [Demo script](DEMO_SCRIPT.md) · [Viva notes](docs/VIVA_NOTES.md) · [Resume guide](docs/RESUME_RECOMMENDATIONS.md) · [Deployment guide](docs/DEPLOYMENT.md)

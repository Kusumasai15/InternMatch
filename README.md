# InternMatch – Student–Internship Recommendation System

InternMatch helps students find internships based on their skills, interests, and academic profile. Admins maintain a shared catalog, and students sign in to explore recommendations and graph analytics.

## New to the project?

Read the [student guide](docs/STUDENT_GUIDE.md) for a simple explanation, file map, and recommended reading order.

## Midnight Ocean interface

Midnight Ocean is the default theme for new visitors. Use the moon/sun button in the header or sign-in screen to switch to Ocean Light. The preference is saved in this browser and applies without a reload; an existing saved light preference is preserved. The toggle supports keyboard focus and Enter/Space.

The theme tokens and motion rules live in `src/midnight-ocean.css`, layered over the existing page layouts. Entrance, card stagger, hover, focus, match-progress, and brief loading-skeleton animations respect reduced-motion preferences. Backend data and page routes are unchanged.

The Chromium verification passed 68 page/theme/viewport checks and real student/admin flows against a temporary database. See [redesign verification](docs/MIDNIGHT_OCEAN.md). To repeat it while the localhost servers are running:

```powershell
npx playwright install chromium
npm run test:ui
```

The test uses port 8001 temporarily, never changes the main database, and writes screenshots to `.local-logs/ui/`.

## Features

- Student registration and sign-in; admin accounts created through backend setup.
- Validated student profiles with optional name and required branch, CGPA, skills, interests, and preferred location.
- Internship search, filters, details, comparison, saved opportunities, and personalized recommendations.
- Interactive graph visualization and FastAPI/NetworkX analytics.
- Application tracker with stages, notes, and personal deadlines.
- Admin internship publishing, editing, and removal.
- Admin account settings for name, email, and password.
- Responsive interface with light and dark themes.

The original 40 demo internships are included. No live internship API is used.

## Technology

| Area | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Lucide icons |
| Backend | Python, FastAPI, Pydantic |
| Graph analytics | NetworkX |
| Account and catalog storage | SQLite locally; PostgreSQL in production |
| Optional graph demonstration | Neo4j and Cypher |
| Tests | Vitest, pytest, FastAPI TestClient |

## Setup

Use Python **3.12** and Node.js **22.12 or newer** (your Node 24 is supported), with npm. Python 3.14 is incompatible with this project's pinned Pydantic build and declared Python range. Docker is required only for the optional Neo4j demonstration.

**Run these commands from the project root**, which contains `package.json` and the `backend` folder. If you are inside `backend`, run `cd ..` first.

### Backend

In PowerShell:

```powershell
py install 3.12
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
```

If you already have a virtual environment, activate it instead of creating another. For an existing environment inside `backend`, activate it from the root with:

```powershell
.\backend\.venv\Scripts\Activate.ps1
```

Create the first admin:

```powershell
.\.venv\Scripts\python.exe -m backend.create_admin
```

The command prompts for a name, email, and password of at least 10 characters. There are no default admin credentials. Public registration creates students only; this command does not convert an existing student into an admin.

Start FastAPI with the virtual environment active:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

- API: http://localhost:8000
- API documentation: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

### Frontend

Open a second terminal at the project root:

```powershell
npm install
npm run dev
```

Open **http://localhost:3000**. Keep both servers running and use `localhost` consistently for the frontend and backend.

After the one-time dependency installation, start both servers from the VS Code PowerShell terminal with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-local.ps1
```

The script checks Python, Node, dependencies, and available ports; starts both servers; waits for HTTP readiness; and prints the URLs. It never reinstalls packages. Keep its terminal open and press Ctrl+C to stop both servers. Logs are in `.local-logs/`. In VS Code, choose **Python: Select Interpreter** and select `.venv\Scripts\python.exe`. Activation is optional because these commands use the interpreter explicitly.

FastAPI is required for sign-in and the shared catalog. Connection errors include a retry option. Local graph visualization remains available if an analytics request fails after the catalog has loaded.

## Student workflow

1. Choose **Student registration**, create an account, and sign in.
2. Open **My profile** and enter branch, CGPA between 0 and 10, at least one skill, at least one interest, and preferred location. The profile name is optional.
3. Save the profile, browse **Internships**, or open **For you**.
4. View details, compare internships, save opportunities, and track applications.
5. Open **Graph view** to inspect profile connections and analytics.

Recommendations check branch and minimum CGPA before ranking eligible roles. Base score weights are:

| Factor | Weight |
|---|---:|
| Skills | 50% |
| Interests | 20% |
| Location | 15% |
| Academics | 15% |

Matching supports aliases, related skills, and a capped graph bonus. **For you** shows eligible roles with at least one matching skill or interest.

## Admin workflow

Sign in using the account created through backend setup to open **Manage internships**.

- Publish role, company, sector, location, work mode, duration, stipend, deadline, minimum CGPA, eligible branches, skills, interests, openings, and description.
- Edit listings or confirm their removal.
- Use **Admin account** to change name, email, or password. Enter the current password to confirm changes. Leave the new password blank to keep it, or enter and confirm a new password of at least 10 characters.

Duplicate email addresses are rejected. Saving account changes keeps this browser signed in and revokes other sessions. Use the updated credentials for future sign-ins.

Catalog changes are visible to students. The catalog refreshes on window focus and every 30 seconds; admins can also refresh manually.

## Data and persistence

| Data | Storage |
|---|---|
| Accounts, profiles, sessions, internships | Backend database (SQLite locally; PostgreSQL when DATABASE_URL is set) |
| Profile cache | Account-specific localStorage |
| Saved internships and application tracker | Account-specific localStorage in this browser |
| Theme preferences | localStorage |

The default database is `backend/data/app.sqlite3`. Back it up to preserve platform data. The 40 demo internships in `data/internships.json` are seeded only on first initialization. Restarts do not overwrite edits or restore deleted listings.

Editing seed JSON does not update an existing database; use the admin form for catalog changes. Saved internships and tracker entries do not sync across devices or submit applications to employers. Profiles and the shared catalog persist through the backend. Internal storage and cookie names are retained for compatibility.

## Configuration

Optional frontend configuration belongs in root `.env.local`; see [.env.example](.env.example):

```dotenv
VITE_API_URL=
```

Optional backend configuration belongs in `backend/.env`; see [backend/.env.example](backend/.env.example):

```dotenv
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
COOKIE_SECURE=false
# APP_DATABASE_PATH=backend/data/app.sqlite3
```

Use the same database path and working directory for admin setup and the server. Restart the relevant server after environment changes.

An empty or absent `VITE_API_URL` uses the Vite `/api` proxy to `127.0.0.1:8000`, keeping cookies on the frontend origin. An explicit backend URL remains supported with the CORS settings above. Vite development and preview bind to loopback. No deployment is needed. SQLite initialization creates missing tables and seeds the catalog once; there is no versioned migration framework.

Passwords use scrypt hashing. Sessions use an HttpOnly, SameSite=Lax cookie with an eight-hour lifetime. Account and catalog mutations require CSRF protection; catalog management also requires the admin role. Authentication attempts are rate limited.

## NetworkX and Neo4j

NetworkX builds a heterogeneous graph using the current profile and catalog. Analytics include Jaccard similarity, path proximity, degree centrality, skill co-occurrence, modularity communities, and readable graph paths. The analytics endpoint is stateless and does not expose stored account records.

Neo4j is an optional, separate graph demonstration. Its schema, seed fixtures, and queries remain in `neo4j/`.

```powershell
docker compose up -d neo4j
```

Open http://localhost:7474 using `neo4j` / `sih25034demo`. SQLite remains the application database. Admin catalog edits are not automatically synchronized into the Neo4j demonstration.

Regenerate the Cypher seed from the JSON fixtures with:

```powershell
python scripts/export_neo4j_seed.py
```

Read [Neo4j instructions](neo4j/README.md) before importing the seed.

## Tests and production build

From the project root, with the Python virtual environment active:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest backend/tests
npm test
npm run typecheck
npm run build
```

Local verification passed **29 backend tests**, **33 frontend tests**, TypeScript checking, and the production build. Coverage includes authentication, admin account updates, permissions, persistence, isolated profiles, analytics, matching, API requests, routes, and static page rendering. Static rendering does not prove interactive browser flows; see [local verification report](docs/LOCAL_VERIFICATION.md) for the exact verification scope.

The build output is `dist/`. Preview it with:

```powershell
npm run preview
```

Open http://localhost:4173. FastAPI must remain running. If using the example above, add `http://localhost:4173` to `ALLOWED_ORIGINS` and restart FastAPI before testing the preview.

## Project structure

```text
src/                     Frontend pages, components, matching, and graph visualization
backend/app/             FastAPI accounts, catalog, database, and NetworkX analytics
backend/tests/           Backend regression tests
backend/create_admin.py  Admin setup command
data/                    Original demonstration fixtures
neo4j/                   Graph schema, seed, and Cypher queries
scripts/                 Neo4j seed exporter
docs/                    Architecture and viva notes
public/                  Branding assets and route metadata
```

Further reading: [architecture](docs/ARCHITECTURE.md), [demonstration steps](DEMO_SCRIPT.md), and [viva notes](docs/VIVA_NOTES.md).

## Troubleshooting

- **Cannot find backend/requirements.txt:** run `cd ..` if inside `backend`, then repeat the command from the project root.
- **No module named pytest:** activate the correct virtual environment and install `backend/requirements-dev.txt`.
- **Sign-in or catalog connection error:** start FastAPI, check `VITE_API_URL`, and include the frontend origin in `ALLOWED_ORIGINS`.
- **Port 3000 is busy:** stop the other process using that port; Vite requires port 3000.

## Deployment

The Vercel configuration builds the Vite frontend with `npm ci` and `npm run build`, serves SPA routes, and forwards `/api` to the existing FastAPI Python Function. Leave `VITE_API_URL` empty for same-origin requests. Production requires persistent PostgreSQL, exact HTTPS `ALLOWED_ORIGINS`, and secure session cookies. Local development retains SQLite and the Vite API proxy.

See [deployment instructions](docs/DEPLOYMENT.md) for exact GitHub/Vercel steps, Neon configuration, admin setup, costs, and live acceptance checks. GitHub Actions checks both database implementations without deploying. Configuration is prepared; PostgreSQL integration and the live Vercel build must be verified before treating the application as deployed. No hosted resources have been provisioned.

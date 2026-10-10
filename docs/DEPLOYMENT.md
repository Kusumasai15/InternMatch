# InternMatch production deployment

Configuration prepared and locally checked on 2026-10-10. **Nothing has been deployed, no hosted database has been provisioned, and live serverless routing has not been tested.** Complete the PostgreSQL check below before deployment.

## Hosting decision

Use one Vercel project: Vite builds `dist`; `api/index.py` exports the existing FastAPI ASGI app. API requests stay on the frontend origin. Vercel explicitly supports [existing Python functions under /api](https://vercel.com/docs/functions/runtimes/python/api-directory). The API rewrite runs before the SPA fallback. Keep the framework preset **Vite**, not FastAPI, so the frontend is built too.

The backend's request-scoped NetworkX calculations, database sessions, and catalog are compatible with functions when backed by external PostgreSQL. SQLite cannot be production storage: [function filesystems are read-only with temporary scratch space](https://vercel.com/docs/functions/runtimes). The code refuses SQLite on Vercel or APP_ENV=production. Existing local SQLite files are neither uploaded nor changed. No separate backend host is required for this workload, subject to the staging checks below.

This is not an always-on process: cold starts and Neon compute wake-up add latency. The configured function duration is 60 seconds. Large graph workloads, persistent background jobs, or requirements beyond function limits should move the API to a managed container host. If that becomes necessary, keep a same-origin Vercel `/api` reverse proxy to the HTTPS backend; do not casually switch cookie authentication to an unrelated browser origin. Neo4j remains an optional separate demonstration, not a deployment dependency.

## 1. Verify and publish the code to GitHub

From the project root in PowerShell:

```powershell
npm ci
npm run typecheck
npm test
npm run build
.\.venv\Scripts\python.exe -m pytest backend/tests -q --basetemp .local-logs/pytest-predeploy
git diff --check
git status --short
git ls-files '*.env' '*.env.*' '*.db' '*.sqlite' '*.sqlite3' '*venv*'
```

Only `.env.example` and `backend/.env.example` should appear in the last command. Review the changes, including the earlier Midnight Ocean work, before staging. `.gitignore` protects local settings, database files, keys and virtual environments; `.vercelignore` also excludes them from CLI uploads. Ignore rules do not remove anything previously committed from Git history: if real credentials were committed earlier, rotate them and arrange a separate history cleanup. No history rewrite has been performed.

The existing origin is `https://github.com/Kusumasai15/InternMatch.git`. Use a preparation branch so existing Vercel Git integrations do not trigger a production deployment:

```powershell
git switch -c prepare-vercel
git add .
git diff --cached --stat
git diff --cached
git commit -m "Prepare InternMatch production deployment"
git push -u origin prepare-vercel
```

Inspect the staged diff before committing; never paste secrets into it. If this repository is already connected to Vercel, disable automatic deployments for this branch until verification is complete. Open a GitHub pull request. In Actions, wait for **InternMatch checks**: frontend build/tests, SQLite tests, and the account/catalog suite against disposable PostgreSQL 17 must all pass. The workflow does not deploy. Production branch protection requiring these checks must be configured manually if desired.

Local PostgreSQL alternative: point `TEST_DATABASE_URL` at a **disposable direct PostgreSQL URL** with permission to create schemas, then run:

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_accounts.py -q --basetemp .local-logs/pytest-postgres
```

The test creates a unique `internmatch_test_*` schema for each case and removes only that schema afterward. It does not read DATABASE_URL for test storage. Never use a production database for this test. Docker's daemon was unavailable during preparation, so this real PostgreSQL suite has not been run locally.

## 2. Provision persistent PostgreSQL

Recommended provider: **Neon PostgreSQL**, available through the [Vercel Marketplace](https://vercel.com/marketplace/neon), or directly from Neon. Choose a region near the Vercel function region. Create a production database and a separate preview database/branch. Do not give preview deployments production credentials or a production data copy containing personal information.

In the Neon Connect dialog choose PostgreSQL/Python and **connection pooling**. Copy the complete URL, retaining TLS options such as `sslmode=require` and any provider-supplied channel binding settings. The host normally contains `-pooler`. Psycopg prepared statements are disabled in this repository for transaction-pooler compatibility. See [Neon's connection guidance](https://github.com/neondatabase/website/blob/main/content/docs/get-started/connect-neon.md).

No credentials are included in source. Startup creates missing tables and seeds the bundled 40 internships only once, under a PostgreSQL transaction advisory lock. Existing tables/data are not dropped or overwritten. This initializes a new production catalog; it **does not migrate local accounts, profiles, sessions or catalog edits**. Keep local data intact. If those records need migration, take a SQLite backup and prepare a separately verified migration before admitting production users. Future schema changes require explicit migrations; CREATE TABLE IF NOT EXISTS is not a schema upgrade system.

## 3. Vercel settings and environment

Only after the GitHub PostgreSQL check passes, merge the preparation PR as appropriate. In Vercel choose **Add New → Project**, authorize GitHub access and select `Kusumasai15/InternMatch`. Before clicking Deploy configure:

| Setting | Value |
|---|---|
| Root directory | Repository root, not src or backend |
| Framework preset | Vite |
| Node.js version | 24.x |
| Install command | npm ci |
| Build command | npm run build |
| Output directory | dist |
| Python version | 3.12, already declared in .python-version and pyproject.toml |
| Function duration | 60 seconds, already set in vercel.json |

Do not select pnpm. `package-lock.json` is the installation lockfile; the historical pnpm lockfile is excluded from Vercel CLI uploads. Build overrides must agree with vercel.json.

In project **Settings → Environment Variables** (or the import screen), configure:

| Variable | Production | Preview |
|---|---|---|
| DATABASE_URL | Secret production pooled PostgreSQL URL | Secret separate preview URL |
| ALLOWED_ORIGINS | Exact stable HTTPS domain, e.g. https://internmatch.vercel.app; comma-separated custom domains if used | Exact stable preview aliases if used |
| COOKIE_SECURE | true | true |
| VITE_API_URL | Leave unset or empty | Leave unset or empty |

Vercel supplies `VERCEL=1` and `VERCEL_URL`; do not override these. The generated deployment hostname is automatically added as an exact allowed HTTPS origin. Stable project aliases and custom domains still need ALLOWED_ORIGINS. No wildcard `*.vercel.app`, URL paths, HTTP origins or trailing `/api`. Cookie sessions are HttpOnly, Secure, SameSite=Lax; mutation requests retain CSRF and origin checks.

**DATABASE_URL must never have a VITE_ prefix.** Vite exposes those variables publicly. No signing key/API key is needed by the existing opaque database-backed session design. Do not set APP_DATABASE_PATH or Neo4j demonstration credentials on Vercel. Marketplace integrations may add POSTGRES_URL instead: explicitly map the desired pooled value into DATABASE_URL, which is the name this code reads.

Select production/preview scopes separately. Environment changes require a new build/deployment. Keep local DATABASE_URL unset and VITE_API_URL empty: Vite still proxies `/api` to FastAPI at 127.0.0.1:8000. Do not run `vercel env pull` into the normal local backend environment.

## 4. Initialize and create the first production admin

Use the existing command with a temporary process-only database URL. The following prompt avoids writing the connection string to shell history or backend/.env; it restores the previous setting even on failure:

```powershell
$previousDatabaseUrl = $env:DATABASE_URL
$databaseSecret = Read-Host 'Neon production DATABASE_URL' -AsSecureString
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($databaseSecret)
try {
    $env:DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
    .\.venv\Scripts\python.exe -m backend.create_admin
    if ($LASTEXITCODE -ne 0) { throw 'Admin creation failed; inspect the error locally' }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
    $env:DATABASE_URL = $previousDatabaseUrl
    $databaseSecret.Dispose()
}
```

This intentionally writes a new admin to the selected hosted database after interactive name/email/password confirmation. It does not change the local SQLite file or promote a student. The password prompt is hidden; there is no default account. A direct provider URL can be used for setup if your pooler disallows schema operations. Keep connection strings and database-driver diagnostic logs private.

## 5. First deployment and live acceptance checks

Deployment has **not** been performed here. Once code checks, PostgreSQL checks, credentials, and settings are verified, use the Vercel Deploy button. Inspect the build logs for both the Vite build and Python function creation. Runtime logs must show successful startup/database initialization. If the Python bundle/build fails, fix it before promoting a preview or treating the site as usable.

1. Open `https://YOUR-DOMAIN/api/health`: require HTTP 200 and JSON status ok. It now queries the database and returns a sanitized HTTP 503 when storage fails.
2. Open `/api/docs` and `/api/openapi.json` on the deployment. Locally `/docs` remains unchanged. API errors must return JSON, not index.html.
3. Open and refresh `/profile`, `/internships`, `/recommendations`, `/applications`, `/graph`, `/admin`, and an existing `/internships/ID` directly. These must reach the SPA rather than 404.
4. Register a test student; verify login, profile save/reload, search/filter, recommendations, graph analytics, comparison, saved internships, application tracker, and logout. Confirm a 401 after logout and forbidden catalog writes for students. Inspect the browser console/network for unexpected errors.
5. Login as admin; publish/edit/remove a temporary test listing, update admin settings, and verify student visibility. Clean up only the listing you created for this check.
6. Verify both themes, persisted toggle preference, reduced motion, keyboard access, and mobile/tablet widths. The Midnight Ocean frontend code and animations are preserved.
7. Rebuild/redeploy the same database configuration. Confirm the test account/profile and a deliberately retained test listing survive. Check cold-start latency and graph response time. Inspect cookies for Secure/HttpOnly/SameSite=Lax and API responses for Cache-Control: no-store.
8. Add any custom domain, update exact allowed origins, redeploy and repeat authentication on that domain. Test deployment protection separately: protected previews may require your Vercel login.

Saved opportunities, application notes/stages, and theme preference are browser-local by existing design; account/profile/catalog/session data is PostgreSQL-backed. No fake replacement data or cross-device synchronization was introduced.

Use preview staging first where possible. Do not declare production deployment successful until the live checks pass. Configure backups/restore retention and budget alerts in the provider dashboards before storing real student data. Code rollback in Vercel does not roll back database changes.

## Costs and required access

You need GitHub repository push access, a Vercel account/team authorized for the repository, a Neon account and database credentials, the final HTTPS origin, and your chosen admin credentials. A custom domain additionally requires DNS access and domain registration fees. These were not supplied or provisioned during preparation.

[Vercel pricing](https://vercel.com/pricing) currently lists Hobby at $0 for eligible personal projects and Pro from $20/month, plus applicable usage/team charges and taxes. Check commercial-use eligibility rather than assuming Hobby is appropriate. Neon offers a free tier and usage-based paid plans; review the [current plan documentation](https://github.com/neondatabase/website/blob/main/content/docs/introduction/plans.md) and console quotation for compute/storage, backup retention and any Marketplace billing. Free tiers have quotas and idle wake-up latency; reliable production capacity/backups may cost extra. Optional Neo4j/separate backend hosting would add separate costs.

## Verification record and changed files

- Passed locally: TypeScript check, frontend production build, 33 frontend tests, and 37 backend tests with disposable SQLite. One upstream Starlette/AnyIO deprecation warning remains.
- Passed after these changes: real localhost HTTP registration/login/logout, profile persistence, catalog, analytics, admin CRUD, validation and CORS. Frontend localhost:3000, backend localhost:8000, local API docs and Vite API proxy all responded successfully.
- Chromium verification passed again: 68 page/theme/viewport checks, keyboard theme toggle/persistence, student/admin flows, reduced motion, and no unexpected console/runtime errors. Both localhost servers remain running.
- Dependency consistency (`pip check`), Git whitespace checks, and ignore checks for local secrets/database/virtual-environment paths passed. Tracked matching environment files were examples only.
- Backend tests initially encountered Windows temp-directory permission errors; rerunning with a workspace-local --basetemp passed. No application failure was hidden.
- PostgreSQL integration: configured in GitHub Actions and locally opt-in; not yet run because Docker's daemon was unavailable and no disposable hosted credentials were supplied.
- Vercel cloud bundle/build, live rewrites, production HTTPS authentication, hosted database persistence, and live costs: require the above manual checks. No cloud build/deployment success is claimed.
- Deployment files: vercel.json, .gitignore, .vercelignore, .env.example, backend/.env.example, .github/workflows/checks.yml, README.md, and this guide.
- Backend settings/storage/auth/health: backend/app/config.py, database.py, accounts.py, main.py. Tests: backend/tests/conftest.py, test_accounts.py, test_production.py.
- Local smoke/browser scripts now explicitly select development mode for their disposable servers: scripts/smoke_local.py and scripts/verify-ocean.mjs.
- Previous Midnight Ocean files remain in the working tree; this deployment preparation does not redesign or replace them.

Additional references: [Vite SPA deployment](https://vercel.com/docs/frameworks/frontend/vite), [FastAPI lifecycle on Vercel](https://vercel.com/docs/frameworks/backend/fastapi), [Python version and bundle rules](https://vercel.com/docs/functions/runtimes/python).

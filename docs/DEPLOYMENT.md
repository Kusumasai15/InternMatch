# Deploy InternMatch on Vercel

The repository now contains the Vite frontend and a FastAPI Vercel Function. API requests use the same domain, so login cookies work without an external API proxy. PostgreSQL stores production accounts and internships; SQLite remains the local default.

## 1. Create a PostgreSQL database

Create a hosted PostgreSQL database with your provider. Use its pooled connection URL when available and require TLS (usually sslmode=require). Copy the connection string into Vercel environment settings, never into source files or GitHub. No FastAPI API key is needed.

## 2. Configure Vercel

Import Kusumasai15/InternMatch with the repository root, Vite framework, pnpm build, and dist output directory. The committed vercel.json routes /api requests to api/index.py before the page fallback.

Set these production environment variables:

| Variable | Value |
|---|---|
| DATABASE_URL | Your private PostgreSQL connection string |
| VITE_API_URL | Your exact Vercel production origin, without a trailing slash, or an empty string |
| ALLOWED_ORIGINS | Your exact Vercel production origin, without a trailing slash |
| COOKIE_SECURE | true |

Do not put DATABASE_URL in a variable beginning with VITE_: those variables are visible to browsers. Do not set VITE_API_URL to /api, because the frontend already adds /api.

If you do not yet know the production URL, create the Vercel project first, copy its production domain, then set the variables and redeploy. Preview deployments need their own explicitly allowed origins and API URL. Use a separate preview database to avoid changing production data during testing.

## 3. Create the production admin

From the project root, activate your Python environment and install backend/requirements.txt. Add DATABASE_URL to your ignored backend/.env locally using the same production connection string. Run:

    python -m backend.create_admin

This creates tables, seeds the original 40 internships once, and prompts for admin credentials. It does not upload your local SQLite database. Existing local profiles, accounts, and catalog edits are not migrated. Remove the production connection string from the local environment afterward to return to SQLite development.

## 4. Deploy and verify

Deploy or redeploy through Vercel. Check /api/health, student registration and login, profile persistence, listings, recommendations, comparison, graph analytics, tracker, admin publishing, account settings, and logout. Refresh /profile directly to check routing.

Check that accounts and catalog edits survive redeployment. Saved roles and tracker notes remain browser-local. Neo4j is still an optional separate demonstration.

## Local development

Leave DATABASE_URL unset to use SQLite. Set VITE_API_URL=http://localhost:8000 locally. Start FastAPI and Vite using the README commands. For PostgreSQL integration testing, use a disposable database rather than production.

## References

- Python Functions: https://vercel.com/docs/functions/runtimes/python
- Vite deployment: https://vercel.com/docs/frameworks/frontend/vite
- PostgreSQL transactions: https://www.psycopg.org/psycopg3/docs/basic/transactions.html

# Deploy InternMatch with Vercel

Vercel hosts the React frontend. The current FastAPI backend needs a separate server with a persistent disk for SQLite. Deploying only the frontend will show the sign-in page, but accounts and internships require a working backend.

## 1. Host FastAPI

Choose a Python hosting service that provides persistent writable storage. Use the repository root as the working directory so the original data fixtures remain accessible.

- Install: python -m pip install -r backend/requirements.txt
- Start: python -m uvicorn backend.app.main:app --host 0.0.0.0 --port PORT
- Replace PORT with the port provided by the hosting service.
- APP_DATABASE_PATH: an absolute file path on the mounted persistent disk.
- COOKIE_SECURE: true
- ALLOWED_ORIGINS: your exact Vercel production URL, without a trailing slash.

In the backend host's terminal, run python -m backend.create_admin with the same database environment settings. Local accounts are not included in GitHub; create the production admin separately. Back up the database.

## 2. Import the frontend

1. Sign in to Vercel and choose Add New → Project.
2. Import Kusumasai15/InternMatch from GitHub.
3. Keep the root directory at the repository root.
4. Select Vite, build command pnpm build, and output directory dist.

The included vercel.json handles direct visits and refreshes on pages such as /profile and /admin.

## 3. Connect the API through the frontend origin

For reliable cookie-based login, proxy API requests through Vercel. Once you have the backend HTTPS URL, insert this rewrite BEFORE the existing page fallback in vercel.json:

    { "source": "/api/:path*", "destination": "https://YOUR-BACKEND-HOST/api/:path*" }

Set VITE_API_URL to an empty string in Vercel's environment variables. This makes requests use /api on the frontend origin. Do not set it to /api, because the code already adds that prefix. If the dashboard does not accept an empty value, set it to the exact production frontend origin, such as https://your-project.vercel.app.

Keep the backend URL out of the page fallback. Do not deploy with the placeholder hostname. A direct request to an unrelated backend domain can prevent SameSite=Lax session cookies from working.

Add the production frontend URL to the backend's ALLOWED_ORIGINS, then restart the backend. Preview domains also need explicit allowed origins if you want to use accounts there.

## 4. Deploy and verify

Deploy in Vercel after configuring the backend and API rewrite. Changing VITE_API_URL requires a frontend redeployment.

Check student registration, sign-in, profile saving, listings, recommendations, comparison, graph analytics, tracker, admin publishing, account settings, and sign-out. Refresh /profile directly to confirm page routing. Restart the backend and confirm accounts and catalog changes remain saved.

## References

- Vite on Vercel: https://vercel.com/docs/frameworks/frontend/vite
- External rewrites: https://vercel.com/docs/routing/rewrites
- SQLite limitation: https://vercel.com/kb/guide/is-sqlite-supported-in-vercel

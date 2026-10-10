# Authentication fix and private resume recommendations

Implemented in the existing workspace; the production deployment has not been updated by this session.

## Confirmed login root cause

Vercel production logs showed `psycopg.errors.AmbiguousColumn: column reference "attempts" is ambiguous` in the authentication rate-limit UPSERT. PostgreSQL distinguishes the existing row and proposed `excluded` row. The increment now uses `auth_attempts.attempts+1`, which also works in SQLite. Password hashing, session rotation, CSRF, origin checks and Secure/HttpOnly cookies are retained. Authentication counters are serialized using SQLite's immediate transaction or PostgreSQL transaction advisory locks acquired in a consistent order.

Other SQL was reviewed: parameter placeholders are adapted to psycopg, SQLite rowid ordering has a PostgreSQL equivalent, admin credential updates take a PostgreSQL row lock, and upserts for structured resume results use explicit `excluded.details`. New tables are additive; no existing users, sessions, catalog rows or SQLite files are dropped. `/api/readiness` now verifies required tables and the existing database-aware health check.

Local and Neon users are separate. A healthy database does not imply a local account exists in production. After redeployment, wrong/missing production credentials should return 401, not 500. Register a production student or explicitly create a production admin using the existing setup command; there is no default admin password.

## Student workflow

Open **My profile → Upload Resume**. Choose a PDF or DOCX up to **5 MiB (5 × 1024 × 1024 bytes)**. Upload status/progress and validation errors appear inline. Existing saved profiles receive detected technical skills and recommendations automatically refresh. Without a saved profile, complete the remaining fields and save it; reviewed resume skills are applied on that first save.

Review every skill, remove incorrect matches, add corrections and select **Save reviewed skills**. Suggested education field and career interests are advisory; students confirm them in their existing profile controls. Branch and CGPA eligibility are never fabricated from a resume. Use **Delete resume-derived data** to remove the analysis, pending upload, and skills introduced by it; skills saved manually before analysis are retained. If no skills remain, complete the profile again. The normal profile editor and resume review remain available.

Extraction uses a small explicit vocabulary with word-boundary matching and common aliases. Project sections provide technical-skill evidence, not extra points for repeating a keyword. Education specialization and the presence of education, project, experience and certification sections are detected. Names, contact details, institution/employer names, project titles, certification identifiers, dates, sensitive personal attributes and raw sentences are not retained or ranked. This is deterministic local parsing, not a paid LLM or a claim to understand every resume.

Recommendations use the existing authenticated internship catalog. The original seeded listings are demonstrations, not verified live openings. Recommendation cards explicitly show **estimated compatibility**, matched skills, missing skills and the scoring explanation; scores are not hiring probabilities.

## Document validation and privacy

- Only authenticated students can read their results or upload; mutations require the existing CSRF token and allowed origin.
- PDF/DOCX extension, signatures and document structure are checked server-side. Corrupt/encrypted documents are rejected. Textless/scanned PDFs receive an OCR/export hint; OCR is not included.
- PDFs are limited to 50 pages and 200,000 extracted characters. DOCX archives are limited to 500 members and 20 MiB expanded content; encrypted/macro archives, DTD/entity declarations and invalid structures are rejected.
- Vercel functions have a [4.5 MB request-body limit](https://vercel.com/docs/functions/limitations). The browser therefore sends sequential 2 MiB chunks, base64 encoded into requests under 3 MB, supporting the full 5 MiB file cap. Upload IDs, ordering, cumulative size and expiry are checked. Upload starts are limited to five per student per 15 minutes, independently of login limits.
- No original document is written to a permanent filesystem or exposed through a URL. An interrupted upload temporarily occupies one private database staging row per student. It expires after ten minutes; expired rows are physically cleaned during resume upload/read activity or API startup. Cleanup is lazy, not a guaranteed background timer. The staged document is deleted before parsing the final request, including parser failures.
- Structured results retain only technical skills, project skill evidence, suggested field/interests, section flags, applied-skill provenance and analysis time. Original content is never logged by application code. Provider database backups may retain previous staging/results until their own retention period ends; configure retention appropriate to your privacy requirements. A dedicated scheduled cleanup job is an option if time-bound physical deletion is required while the API is idle.

## Documented compatibility formula

The existing tested formula is reused, so resume skills and manually entered skills are treated equally. Eligible branch and minimum CGPA are hard gates. For eligible listings:

`score = round(0.50 × skillFit + 0.20 × interestFit + 0.15 × locationFit + 0.15 × academicFit)`

Required skills are deduplicated. Exact/alias matches earn full credit; predefined related skills earn half credit. Skill coverage is converted to 0–100, with at most eight additional skill points from co-occurring skills in other catalog listings, capped at 100. Project skills are included once, not double-counted. Interest fit is the fraction of listing interests selected by the student. Remote/exact-location fit is 100, other hybrid fit 48 and other on-site fit 15. Academic fit is `min(100, round(70 + max(0, CGPA − minimum) × 20))`. Ineligible listings score zero and remain visible in the general catalog. No TF-IDF or heavy ML model was necessary for this structured catalog.

## Verification and deployment

Run from the project root:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
npm run typecheck
npm test
npm run build
.\.venv\Scripts\python.exe -m pytest backend/tests -q --basetemp .local-logs/pytest-resume
npm run test:ui
```

The browser test uses a temporary database and now includes genuine DOCX upload, correction, reload persistence and deletion. Existing student/admin flows and both themes still run across 68 page/theme/viewport checks. PDF/DOCX parser tests include a complete 5 MiB upload, malformed/encrypted/textless files, ZIP/XML safety, authorization, CSRF, rate limits, ownership, preservation of manual skills, first-profile application and expiry cleanup.

For real PostgreSQL verification, set **TEST_DATABASE_URL** to a dedicated disposable direct database with schema-creation permission, then run `python -m pytest backend/tests/test_accounts.py backend/tests/test_resumes.py -q`. Each test gets a private disposable schema. Do not point this test at production. The GitHub workflow includes both suites, but GitHub integration is not required for deployment.

Production logs were successfully inspected. Downloading the entire production environment was rejected by automatic approval review because that would copy production secrets to a local file without specific authorization. It was not bypassed. Real Neon tests and live deployment verification require a dedicated test database credential; they have not been claimed as passed.

The parsers are lazy-imported for document requests, avoiding PDF parser import work during login. Installed Windows parser directories measured approximately 53 MiB (PyMuPDF), 2 MiB (python-docx) and 9 MiB (lxml); Linux bundle size, actual memory and Vercel cold-start latency still require the cloud build/runtime check. Vercel's Python bundle rules are documented [here](https://vercel.com/docs/functions/runtimes/python). No heavy model, paid API, external embeddings or original-file storage service is introduced. PyMuPDF is [AGPL or commercially licensed](https://pymupdf.io/licensing); review suitability for your distribution. If its native bundle or license is unsuitable, a separately tested pypdf implementation is a lighter alternative with different extraction behavior.

After local/disposable-PostgreSQL checks pass, deploy through the existing Vercel CLI link using the [deployment guide](DEPLOYMENT.md). Before production promotion, check `/api/health`, `/api/readiness`, anonymous `/api/auth/me` (401), wrong login (401), real student/admin login, HTTPS cookies, profile persistence, a test PDF/DOCX upload, review/deletion, and catalog CRUD. Verify the new tables are initialized on cold start, and repeat persistence checks after redeployment. Do not use local credentials as proof of a production login.

Local verification: TypeScript and production build passed, 33 frontend tests passed, and 52 backend tests passed (one upstream Starlette/AnyIO deprecation warning). Chromium passed resume upload/review/persistence/deletion plus 68 theme/responsive checks without unexpected console/runtime errors. The smoke test initially passed its HTTP checks but failed Windows cleanup because a child process held the temporary log; its cleanup now terminates only its own server process tree, and the same correction is applied to the browser test.

Changed files: backend/app/accounts.py, database.py, main.py, new resumes.py, backend/requirements.txt, new backend/tests/test_resumes.py, src/components/ResumeUpload.tsx, src/pages/Profile.tsx, src/pages/Recommendations.tsx, src/midnight-ocean.css, scripts/smoke_local.py, scripts/verify-ocean.mjs, .github/workflows/checks.yml, README.md, and this guide. Existing themes, navigation, SQLite defaults and catalog remain in place.

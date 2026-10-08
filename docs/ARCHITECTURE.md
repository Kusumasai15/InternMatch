# InternMatch architecture

The browser shows the interface. FastAPI checks requests and saves shared data. NetworkX explains graph connections. Read the [student guide](STUDENT_GUIDE.md) first if these tools are new to you.

## Layers

1. React + TypeScript + Vite renders sign-in, student registration, role-aware navigation, student profiles, internship listings/details, recommendations, comparisons, application tracking, admin publishing, and graph exploration.
2. FastAPI handles account sessions, authorization, profile persistence, and the shared internship catalog.
3. SQLite stores users, hashed passwords, per-account profiles, hashed session tokens, CSRF tokens, internship details, seed metadata, and sign-in attempt limits.
4. Account-scoped localStorage caches profiles and stores saved roles and application notes/stages. The server profile is authoritative on sign-in. Authentication secrets are not placed in localStorage.
5. NetworkX calculates graph evidence from the current profile and internship catalog. Neo4j remains an optional independent demonstration layer.

## Authentication and publishing

Public registration creates students only. Admin accounts are created using `python -m backend.create_admin`. Both roles use the same sign-in form. Session cookies are HttpOnly and SameSite=Lax, with Secure enabled for HTTPS deployments. Catalog writes and profile saves require the session CSRF token. Catalog mutations additionally require the admin role.

The backend reads the original 40 internship records from `data/internships.json` on first database initialization. A metadata marker prevents reseeding on later startup, preserving additions, edits, and removals. The frontend fetches the shared catalog after authentication, on window focus, and every 30 seconds.

## APIs

| Endpoint | Access |
|---|---|
| POST /api/auth/register | Public student registration |
| POST /api/auth/login | Public sign-in |
| GET /api/auth/me | Signed-in account |
| POST /api/auth/logout | Signed-in account + CSRF |
| PUT /api/admin/account | Admin + CSRF + current password; changes own name, email, or password |
| PUT /api/profile | Own account + CSRF |
| GET /api/internships | Signed-in account |
| POST /api/internships | Admin + CSRF |
| PUT /api/internships/{id} | Admin + CSRF |
| DELETE /api/internships/{id} | Admin + CSRF |
| POST /api/analytics | Stateless calculation on supplied profile/catalog; no account records exposed |
| GET /api/health | Public service health |

## Recommendation model

Branch and minimum CGPA gate eligibility. The frontend ranks eligible internships with skills (50%), interests (20%), location (15%), and academics (15%). Skill matching includes aliases, related-skill half credit, and a capped co-occurrence graph bonus. For you includes eligible roles with at least one matching skill or interest.

## Graph model

A node is one item, such as a student or skill. An edge says how two items are connected. For example, a student has Python as a skill and an internship requires Python. The shared skill links the student to that internship.


Student → HAS_SKILL → Skill; Student → INTERESTED_IN → Interest; Company → OFFERS → Internship; Internship → REQUIRES_SKILL → Skill; Internship → BELONGS_TO → Domain; Internship → TAGGED_WITH → Interest.

NetworkX provides Jaccard similarity, path proximity, degree centrality on the skill co-occurrence projection, modularity communities, and readable shortest paths. Frontend SVG exploration remains available if the analytics calculation cannot connect after the catalog has loaded.

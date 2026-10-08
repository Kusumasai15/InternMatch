# Student guide to InternMatch

Start here if you are learning this project for the first time. You do not need to understand every file before running the app.

## Read in this order

1. [README](../README.md): install dependencies and start both servers.
2. [Demo steps](../DEMO_SCRIPT.md): try the student and admin features.
3. [Architecture](ARCHITECTURE.md): learn how the browser and server work together.
4. [Viva notes](VIVA_NOTES.md): prepare answers for a project presentation.

## What happens when you use the app?

1. A student signs in. FastAPI checks the password and gives the browser a session cookie.
2. The browser requests the internship catalog from FastAPI.
3. The student saves a profile. FastAPI validates it and stores it in SQLite.
4. React compares that profile with internship requirements to produce recommendations.
5. The graph page draws connections and sends the current profile and catalog to NetworkX for extra analytics.
6. An admin can change the catalog. Students receive the updated catalog when it refreshes.

## Important files

| File | What to learn from it |
|---|---|
| src/main.tsx | Starts React and loads styles |
| src/App.tsx | Chooses which page to show |
| src/pages/Login.tsx | Sign-in and student registration forms |
| src/pages/Profile.tsx | Profile fields and validation |
| src/pages/ManageInternships.tsx | Admin internship form and catalog table |
| src/components/AdminAccountSettings.tsx | Admin name, email, and password form |
| src/lib/auth.tsx | Keeps track of the signed-in account |
| src/lib/api.ts | Sends requests to FastAPI |
| src/lib/catalog.tsx | Loads and updates the shared catalog |
| src/lib/matching.ts | Checks eligibility and calculates match scores |
| src/components/GraphCanvas.tsx | Draws the interactive graph |
| src/lib/graphApi.ts | Requests NetworkX analytics |
| src/lib/storage.ts | Stores browser-only saved items and tracker entries |
| backend/app/main.py | Starts FastAPI and registers API routes |
| backend/app/accounts.py | Registration, login, sessions, and account changes |
| backend/app/catalog.py | Reads and changes internship records |
| backend/app/models.py | Defines valid profile and analytics data |
| backend/app/database.py | Creates SQLite tables and seeds demo internships |
| backend/app/analytics.py | Builds the graph and calculates analytics |
| data/internships.json | Original demo internship records |
| neo4j/ | Optional graph database demonstration |

## Words used in the code

| Word | Simple meaning |
|---|---|
| Frontend | The pages and controls in your browser |
| Backend | The server that checks requests and saves shared data |
| API | The way the frontend asks the backend for data |
| Component | A reusable piece of a React page |
| State | Data React remembers while the app is running |
| Validation | Checking that entered data follows the rules |
| Session | A temporary record that keeps an account signed in |
| CSRF token | A value the server checks on requests that change data |
| Node | An item in a graph, such as a skill or internship |
| Edge | A connection between two graph nodes |
| localStorage | Data kept by this browser on this device |

## Try a small learning exercise

Create a student profile, note the recommended internships, then change one skill and save again. Compare the results and read src/lib/matching.ts to understand why they changed. Next, add an internship as admin and check how its branch, CGPA, skills, and interests affect the student results.

Keep real account data out of examples. Run the frontend and backend tests after changing behavior. Tests are useful project files, not temporary leftovers.

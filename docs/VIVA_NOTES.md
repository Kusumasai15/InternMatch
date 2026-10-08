# Viva notes

### Why a graph?
A graph shows connections. For example, a student knows Python and an internship needs Python. We can show that connection and explain why the internship is relevant.

### Why a heterogeneous graph?
The network contains multiple node types with different meanings: Student, Skill, Internship, Company, Domain and Interest.

### Why NetworkX?
NetworkX provides transparent graph algorithms that are easy to inspect and demonstrate in a micro-project.

### Why Neo4j?
Neo4j is an optional graph database demonstration using the JSON fixtures. Cypher queries let us explore connections. The running app uses SQLite for accounts and internships, and NetworkX for analytics; admin edits do not automatically update Neo4j.

### Is this a trained AI model?
No. The current prototype is an explainable graph-based recommender, not a trained ML model. A learning-to-rank model is a future enhancement.

### Why is eligibility a hard gate?
Branch and minimum CGPA are explicit internship constraints. They are checked before relevance ranking so an ineligible role cannot appear as a misleading high-scoring match.

### What is the graph score?
The Python analytics service combines Jaccard skill similarity, shortest-path proximity and community coverage into an interpretable graph score.

### Where is data saved?
Accounts, profiles, and internships are saved in SQLite on the server. Saved roles and tracker notes stay in this browser, separately for each account.

### Can students become admins through registration?
No. Registration creates student accounts. The first admin is created through the backend setup command. The backend checks admin permission before changing internships.

### Does the app apply to internships automatically?
No. The application tracker records personal progress; it does not send applications to employers.

# Neo4j layer

The project models six node types:

- `Student`
- `Skill`
- `Internship`
- `Company`
- `Domain`
- `Interest`

Core relationships:

- `HAS_SKILL`
- `REQUIRES_SKILL`
- `OFFERS`
- `BELONGS_TO`
- `INTERESTED_IN`
- `TAGGED_WITH`

## Quick start

1. Start Neo4j Desktop or Neo4j in Docker.
2. Run `schema.cypher` once.
3. Run `seed.cypher`.
4. Use `queries.cypher` with parameters such as `$student` and `$internshipId`.

The seed file is generated from the project's JSON seed data. After editing the data, run:

```bash
python scripts/export_neo4j_seed.py
```

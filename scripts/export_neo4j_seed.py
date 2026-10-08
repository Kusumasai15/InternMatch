import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data/internships.json").read_text())
STUDENTS = json.loads((ROOT / "data/students.json").read_text())

def q(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)

lines = ["// Generated from data/internships.json and data/students.json. Re-run scripts/export_neo4j_seed.py after changing seed data.", "MATCH (n) DETACH DELETE n;", ""]
for student in STUDENTS:
    lines.append(f"CREATE (:Student {{name:{q(student['name'])}, branch:{q(student['branch'])}, cgpa:{student['cgpa']}, location:{q(student['location'])}}});")
for job in DATA:
    lines.append(f"CREATE (:Internship {{id:{q(job['id'])}, role:{q(job['role'])}, company:{q(job['company'])}, location:{q(job['location'])}, workMode:{q(job['workMode'])}, minCgpa:{job['minCgpa']}}});")
    lines.append(f"MERGE (:Company {{name:{q(job['company'])}}});")
    lines.append(f"MERGE (:Domain {{name:{q(job['sector'])}}});")
    for skill in job['requiredSkills']:
        lines.append(f"MERGE (:Skill {{name:{q(skill)}}});")
    for interest in job['interests']:
        lines.append(f"MERGE (:Interest {{name:{q(interest)}}});")
for student in STUDENTS:
    for skill in student['skills']:
        lines.append(f"MATCH (s:Student {{name:{q(student['name'])}}}), (k:Skill {{name:{q(skill)}}}) MERGE (s)-[:HAS_SKILL]->(k);")
    for interest in student['interests']:
        lines.append(f"MATCH (s:Student {{name:{q(student['name'])}}}), (i:Interest {{name:{q(interest)}}}) MERGE (s)-[:INTERESTED_IN]->(i);")
for job in DATA:
    for skill in job['requiredSkills']:
        lines.append(f"MATCH (i:Internship {{id:{q(job['id'])}}}), (k:Skill {{name:{q(skill)}}}) MERGE (i)-[:REQUIRES_SKILL]->(k);")
    lines.append(f"MATCH (c:Company {{name:{q(job['company'])}}}), (i:Internship {{id:{q(job['id'])}}}) MERGE (c)-[:OFFERS]->(i);")
    lines.append(f"MATCH (i:Internship {{id:{q(job['id'])}}}), (d:Domain {{name:{q(job['sector'])}}}) MERGE (i)-[:BELONGS_TO]->(d);")
    for interest in job['interests']:
        lines.append(f"MATCH (i:Internship {{id:{q(job['id'])}}}), (x:Interest {{name:{q(interest)}}}) MERGE (i)-[:TAGGED_WITH]->(x);")

out = ROOT / "neo4j/seed.cypher"
out.write_text("\n".join(lines) + "\n")
print(out, len(lines), "lines")

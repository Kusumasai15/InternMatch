// 1. Internship recommendations from direct skill overlap
MATCH (s:Student {name: $student})-[:HAS_SKILL]->(skill:Skill)<-[:REQUIRES_SKILL]-(i:Internship)
WITH i, COUNT(DISTINCT skill) AS matchingSkills
RETURN i.role AS internship, i.company AS company, matchingSkills
ORDER BY matchingSkills DESC, internship
LIMIT 10;

// 2. Explain why an internship is connected to a student
MATCH (s:Student {name: $student})-[:HAS_SKILL]->(skill:Skill)<-[:REQUIRES_SKILL]-(i:Internship {id: $internshipId})
RETURN s.name AS student, i.role AS internship, COLLECT(skill.name) AS matchingSkills;

// 3. Shortest graph path from a student to an internship
MATCH (s:Student {name: $student}), (i:Internship {id: $internshipId})
MATCH p = shortestPath((s)-[*..4]-(i))
RETURN [node IN nodes(p) | COALESCE(node.name, node.role, node.id)] AS path;

// 4. Most central skills by number of connected internships
MATCH (skill:Skill)<-[:REQUIRES_SKILL]-(i:Internship)
RETURN skill.name AS skill, COUNT(DISTINCT i) AS internshipConnections
ORDER BY internshipConnections DESC
LIMIT 10;

// 5. Skill co-occurrence network
MATCH (i:Internship)-[:REQUIRES_SKILL]->(a:Skill),
      (i)-[:REQUIRES_SKILL]->(b:Skill)
WHERE a.name < b.name
RETURN a.name AS skillA, b.name AS skillB, COUNT(i) AS coOccurrences
ORDER BY coOccurrences DESC, skillA, skillB;

// 6. Domains with the most opportunities
MATCH (i:Internship)-[:BELONGS_TO]->(d:Domain)
RETURN d.name AS domain, COUNT(i) AS opportunities
ORDER BY opportunities DESC;

// 7. Companies offering the most internships
MATCH (c:Company)-[:OFFERS]->(i:Internship)
RETURN c.name AS company, COUNT(i) AS internships
ORDER BY internships DESC;

// 8. Skill-gap query for a student
MATCH (s:Student {name: $student}), (i:Internship {id: $internshipId})-[:REQUIRES_SKILL]->(required:Skill)
WHERE NOT (s)-[:HAS_SKILL]->(required)
RETURN i.role AS internship, COLLECT(required.name) AS missingSkills;

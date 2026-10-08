# Graph calculations: connect the supplied profile to internships and explain those connections.
from collections import Counter
import re
import networkx as nx
from .models import AnalyticsRequest, AnalyticsResponse, SkillMetric, RecommendationMetric, CommunityMetric

ALIASES = {
    "js": "javascript", "javascript": "javascript", "react.js": "react", "reactjs": "react",
    "ts": "typescript", "nodejs": "node.js", "node js": "node.js", "nextjs": "next.js",
    "ml": "machine learning", "py": "python", "amazon web services": "aws",
}
RELATED = {
    "react": {"javascript", "next.js", "typescript"},
    "next.js": {"react", "javascript", "typescript"},
    "javascript": {"react", "typescript", "next.js"},
    "typescript": {"javascript", "react"},
    "python": {"machine learning", "statistics", "pandas", "numpy"},
    "machine learning": {"python", "statistics", "nlp"},
    "statistics": {"machine learning", "python", "sql"},
    "aws": {"cloud computing", "linux", "networking"},
    "linux": {"aws", "networking", "cybersecurity"},
}

def norm(value: str) -> str:
    value = re.sub(r"\s+", " ", value.strip().lower())
    return ALIASES.get(value, value)

def canonical(values: list[str]) -> set[str]:
    return {norm(v) for v in values}

def build_graph(request: AnalyticsRequest):
    g = nx.DiGraph()
    p = request.profile
    g.add_node(f"student:{p.name}", kind="student", label=p.name or "Student")
    for skill in p.skills:
        g.add_node(f"skill:{norm(skill)}", kind="skill", label=skill)
        g.add_edge(f"student:{p.name}", f"skill:{norm(skill)}", relation="HAS_SKILL")
    for interest in p.interests:
        key = norm(interest)
        g.add_node(f"interest:{key}", kind="interest", label=interest)
        g.add_edge(f"student:{p.name}", f"interest:{key}", relation="INTERESTED_IN")
    for internship in request.internships:
        iid = f"internship:{internship.id}"
        cid = f"company:{internship.company}"
        did = f"domain:{internship.sector}"
        g.add_node(iid, kind="internship", label=internship.role)
        g.add_node(cid, kind="company", label=internship.company)
        g.add_node(did, kind="domain", label=internship.sector)
        g.add_edge(cid, iid, relation="OFFERS")
        g.add_edge(iid, did, relation="BELONGS_TO")
        for skill in internship.requiredSkills:
            sid = f"skill:{norm(skill)}"
            g.add_node(sid, kind="skill", label=skill)
            g.add_edge(iid, sid, relation="REQUIRES_SKILL")
        for interest in internship.interests:
            key = norm(interest)
            g.add_node(f"interest:{key}", kind="interest", label=interest)
            g.add_edge(iid, f"interest:{key}", relation="TAGGED_WITH")
    return g

def skill_projection(g: nx.DiGraph):
    h = nx.Graph()
    skill_nodes = [n for n, d in g.nodes(data=True) if d.get("kind") == "skill"]
    h.add_nodes_from(skill_nodes)
    for internship in [n for n, d in g.nodes(data=True) if d.get("kind") == "internship"]:
        skills = [v for v in g.successors(internship) if g.nodes[v].get("kind") == "skill"]
        for i, left in enumerate(skills):
            for right in skills[i + 1:]:
                weight = h.get_edge_data(left, right, {}).get("weight", 0) + 1
                h.add_edge(left, right, weight=weight)
    return h

def analytics(request: AnalyticsRequest) -> AnalyticsResponse:
    g = build_graph(request)
    projection = skill_projection(g)
    centrality = nx.degree_centrality(projection) if len(projection) > 1 else {n: 0.0 for n in projection}
    communities_raw = list(nx.community.greedy_modularity_communities(projection)) if projection.number_of_edges() else [{n} for n in projection.nodes]
    community_id = {node: i + 1 for i, group in enumerate(communities_raw) for node in group}
    profile_skills = canonical(request.profile.skills)
    demand = Counter(norm(s) for j in request.internships for s in j.requiredSkills)
    supply = Counter(profile_skills)

    top_skills = []
    for node, value in sorted(centrality.items(), key=lambda x: x[1], reverse=True)[:10]:
        label = g.nodes[node].get("label", node.removeprefix("skill:"))
        d = demand[norm(label)]
        s = 1 if norm(label) in profile_skills else 0
        gap = round((d / max(1, len(request.internships)) - s) * 100, 1)
        top_skills.append(SkillMetric(skill=label, centrality=round(value, 4), demand=d, supply=s, gap=gap, community=community_id.get(node, 0)))

    recommendations = []
    student_node = f"student:{request.profile.name}"
    for internship in request.internships:
        iid = f"internship:{internship.id}"
        required = canonical(internship.requiredSkills)
        matched = sorted(profile_skills & required)
        missing = sorted(required - profile_skills)
        union = profile_skills | required
        jaccard = len(matched) / len(union) if union else 1.0
        try:
            shortest = nx.shortest_path_length(g, student_node, iid)
            proximity = 1 / shortest
        except nx.NetworkXNoPath:
            shortest = None
            proximity = 0.0
        req_communities = {community_id.get(f"skill:{s}") for s in required if community_id.get(f"skill:{s}")}
        student_communities = {community_id.get(f"skill:{s}") for s in profile_skills if community_id.get(f"skill:{s}")}
        coverage = len(req_communities & student_communities) / len(req_communities) if req_communities else 1.0
        graph_score = round((jaccard * 0.55 + min(1, proximity) * 0.2 + coverage * 0.25) * 100, 1)
        recommendations.append(RecommendationMetric(
            internshipId=internship.id, role=internship.role, company=internship.company,
            jaccard=round(jaccard, 4), proximity=round(proximity, 4), communityCoverage=round(coverage, 4),
            graphScore=graph_score, shortestPath=shortest, matchingSkills=matched, missingSkills=missing,
        ))

    recommendations.sort(key=lambda x: x.graphScore, reverse=True)
    communities = [CommunityMetric(id=i + 1, label=_community_label(group, g), skills=sorted(g.nodes[n].get("label", n) for n in group), size=len(group)) for i, group in enumerate(communities_raw)]
    communities.sort(key=lambda c: c.size, reverse=True)
    paths = []
    for rec in recommendations[:5]:
        try:
            path = nx.shortest_path(g.to_undirected(), student_node, f"internship:{rec.internshipId}")
            paths.append({"internshipId": rec.internshipId, "path": [g.nodes[n].get("label", n) for n in path]})
        except nx.NetworkXNoPath:
            pass
    counts = Counter(d.get("kind") for _, d in g.nodes(data=True))
    node_counts = {k: counts.get(k, 0) for k in ["student", "skill", "interest", "company", "domain", "internship"]}
    avg_degree = round(sum(dict(g.degree()).values()) / max(1, g.number_of_nodes()), 2)
    return AnalyticsResponse(nodeCounts=node_counts, edgeCount=g.number_of_edges(), averageDegree=avg_degree, topSkills=top_skills, recommendations=recommendations, communities=communities[:8], paths=paths)

def _community_label(group, g):
    labels = [g.nodes[n].get("label", "") for n in group]
    joined = " ".join(labels).lower()
    if any(x in joined for x in ["python", "machine learning", "statistics", "sql", "nlp"]): return "Data & AI"
    if any(x in joined for x in ["react", "javascript", "typescript", "css", "html"]): return "Web Development"
    if any(x in joined for x in ["aws", "azure", "linux", "networking", "cloud"]): return "Cloud & Infrastructure"
    if any(x in joined for x in ["cybersecurity", "security"]): return "Cybersecurity"
    return "Related Skills"

from backend.app.analytics import analytics
from backend.app.models import AnalyticsRequest

def test_graph_analytics_returns_metrics():
    payload = AnalyticsRequest.model_validate({
        "profile": {"name": "Test", "branch": "Computer Science & Engineering", "cgpa": 8.0, "location": "Bengaluru", "skills": ["Python", "SQL"], "interests": ["Research"]},
        "internships": [{"id": "a", "role": "Data Intern", "company": "Demo", "sector": "Data & analytics", "location": "Bengaluru", "workMode": "Hybrid", "minCgpa": 7.0, "branches": ["Computer Science & Engineering"], "requiredSkills": ["Python", "SQL", "Statistics"], "interests": ["Research"]}],
    })
    result = analytics(payload)
    assert result.nodeCounts["domain"] == 1
    assert result.recommendations[0].jaccard > 0
    assert result.recommendations[0].shortestPath == 2
    assert result.recommendations[0].proximity == 0.5
    assert result.paths

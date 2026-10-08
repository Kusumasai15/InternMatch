import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def payload():
    return {
        "profile": {"branch": "Computer Science & Engineering", "cgpa": 8, "location": "Pune", "skills": ["Python"], "interests": ["Research"]},
        "internships": [{"id": "a", "role": "Data Intern", "company": "Demo", "sector": "Data", "location": "Pune", "workMode": "Hybrid", "minCgpa": 7, "branches": ["Computer Science & Engineering"], "requiredSkills": ["Python", "SQL"], "interests": ["Research"]}],
    }

def test_optional_name_and_profile_driven_analytics():
    data = payload()
    response = client.post("/api/analytics", json=data)
    assert response.status_code == 200
    result = response.json()
    assert result["recommendations"][0]["matchingSkills"] == ["python"]
    assert result["paths"][0]["path"][0] == "Student"
    data["profile"]["skills"] = ["React"]
    changed = client.post("/api/analytics", json=data).json()
    assert changed["recommendations"][0]["matchingSkills"] == []
    assert changed["recommendations"][0]["graphScore"] != result["recommendations"][0]["graphScore"]

@pytest.mark.parametrize("field,value", [("branch", ""), ("branch", "unknown"), ("cgpa", -1), ("cgpa", 11), ("location", " "), ("skills", []), ("skills", [" "]), ("interests", [])])
def test_required_fields_rejected(field, value):
    data = payload()
    data["profile"][field] = value
    assert client.post("/api/analytics", json=data).status_code == 422

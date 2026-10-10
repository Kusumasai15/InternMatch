import json
import time
import uuid
import os
import psycopg
from psycopg import sql
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import connection, initialize
from backend.app.accounts import password_hash, COOKIE

PASSWORD = "Student-password-123"
PROFILE = {"name": "", "branch": "Computer Science & Engineering", "cgpa": 8, "location": "Pune", "skills": ["Python"], "interests": ["Research"]}
INTERNSHIP = {"role": "Python Intern", "company": "Test Company", "sector": "Data", "location": "Pune", "workMode": "Hybrid", "stipend": 20000, "duration": "3 months", "closing": "2027-01-15", "minCgpa": 7, "branches": ["Computer Science & Engineering"], "requiredSkills": ["Python"], "interests": ["Research"], "openings": 2, "summary": "Build data tools with the team."}

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("APP_DATABASE_PATH", str(tmp_path / "platform.sqlite3"))
    # Opt in using a disposable PostgreSQL database, never DATABASE_URL.
    test_url = os.getenv("TEST_DATABASE_URL", "").strip()
    if not test_url:
        with TestClient(app) as client:
            yield client
        return
    schema = "internmatch_test_" + uuid.uuid4().hex
    original_connect = psycopg.connect
    with original_connect(test_url, autocommit=True) as setup:
        setup.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
    def isolated_connect(*args, **kwargs):
        return original_connect(*args, **kwargs, options="-c search_path=" + schema)
    monkeypatch.setattr(psycopg, "connect", isolated_connect)
    monkeypatch.setenv("DATABASE_URL", test_url)
    try:
        with TestClient(app) as client:
            yield client
    finally:
        with original_connect(test_url, autocommit=True) as cleanup:
            cleanup.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))

def register(client, email="student@example.com"):
    response = client.post("/api/auth/register", json={"name": "Student", "email": email, "password": PASSWORD})
    assert response.status_code == 201
    return {"X-CSRF-Token": response.json()["csrfToken"]}

def admin_login(client):
    with connection() as db:
        db.execute("INSERT INTO users(id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)", (uuid.uuid4().hex, "admin@example.com", "Admin", password_hash(PASSWORD), "admin", int(time.time())))
    response = client.post("/api/auth/login", json={"email": "admin@example.com", "password": PASSWORD})
    assert response.status_code == 200
    return {"X-CSRF-Token": response.json()["csrfToken"]}

def test_registration_session_and_logout(client):
    headers = register(client)
    response = client.get("/api/auth/me")
    assert response.json()["user"]["role"] == "student"
    assert "password" not in response.text
    assert "HttpOnly" in client.post("/api/auth/login", json={"email": "student@example.com", "password": PASSWORD}).headers["set-cookie"]
    # Logging in rotates the session and CSRF token.
    headers = {"X-CSRF-Token": client.get("/api/auth/me").json()["csrfToken"]}
    assert client.post("/api/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/auth/me").status_code == 401

def test_signup_cannot_create_admin(client):
    response = client.post("/api/auth/register", json={"name": "Student", "email": "student@example.com", "password": PASSWORD, "role": "admin"})
    assert response.status_code == 422

def test_duplicate_email_and_wrong_password(client):
    register(client)
    assert client.post("/api/auth/register", json={"name": "Other", "email": "STUDENT@example.com", "password": PASSWORD}).status_code == 409
    assert client.post("/api/auth/login", json={"email": "student@example.com", "password": "incorrect-password"}).status_code == 401

@pytest.mark.parametrize("path,method", [("/api/internships", "get"), ("/api/internships", "post"), ("/api/profile", "put")])
def test_login_required(client, path, method):
    kwargs = {"json": PROFILE if path.endswith("profile") else INTERNSHIP} if method != "get" else {}
    assert getattr(client, method)(path, **kwargs).status_code == 401

def test_students_cannot_manage_catalog(client):
    headers = register(client)
    jobs = client.get("/api/internships").json()
    assert len(jobs) == 40
    assert client.post("/api/internships", json=INTERNSHIP, headers=headers).status_code == 403
    assert client.put("/api/internships/" + jobs[0]["id"], json=INTERNSHIP, headers=headers).status_code == 403
    assert client.delete("/api/internships/" + jobs[0]["id"], headers=headers).status_code == 403

def test_admin_publish_edit_remove_and_student_visibility(client):
    admin_headers = admin_login(client)
    added = client.post("/api/internships", json=INTERNSHIP, headers=admin_headers)
    assert added.status_code == 201
    iid = added.json()["id"]
    assert client.put("/api/internships/" + iid, json={**INTERNSHIP, "role": "Data Intern"}, headers=admin_headers).status_code == 200
    with TestClient(app) as student:
        register(student)
        jobs = student.get("/api/internships").json()
        assert next(j for j in jobs if j["id"] == iid)["role"] == "Data Intern"
    assert client.delete("/api/internships/" + iid, headers=admin_headers).status_code == 204
    assert all(j["id"] != iid for j in client.get("/api/internships").json())

def test_profile_persistence_and_account_isolation(client):
    headers = register(client)
    assert client.put("/api/profile", json=PROFILE, headers=headers).status_code == 200
    assert client.get("/api/auth/me").json()["user"]["profile"] == PROFILE
    register(client, "other@example.com")
    assert client.get("/api/auth/me").json()["user"]["profile"] is None
    assert client.post("/api/auth/login", json={"email": "student@example.com", "password": PASSWORD}).status_code == 200
    assert client.get("/api/auth/me").json()["user"]["profile"] == PROFILE

def test_mutations_require_csrf_and_allowed_origin(client):
    headers = admin_login(client)
    assert client.post("/api/internships", json=INTERNSHIP).status_code == 403
    assert client.post("/api/internships", json=INTERNSHIP, headers={**headers, "Origin": "https://untrusted.example"}).status_code == 403
    assert client.post("/api/internships", json=INTERNSHIP, headers={**headers, "Origin": "http://localhost:3000"}).status_code == 201

def test_expired_sessions_rejected(client):
    register(client)
    with connection() as db:
        db.execute("UPDATE sessions SET expires_at=0")
    assert client.get("/api/auth/me").status_code == 401

def test_passwords_are_hashed_and_sessions_are_not_stored_as_cookie_values(client):
    register(client)
    with connection() as db:
        row = db.execute("SELECT password_hash FROM users").fetchone()
        assert row["password_hash"].startswith("scrypt$")
        assert PASSWORD not in row["password_hash"]
        assert db.execute("SELECT token_hash FROM sessions").fetchone()["token_hash"] != client.cookies.get(COOKIE)

def test_deleted_demo_internships_do_not_return_after_restart(client):
    headers = admin_login(client)
    iid = client.get("/api/internships").json()[0]["id"]
    assert client.delete("/api/internships/" + iid, headers=headers).status_code == 204
    initialize()
    assert len(client.get("/api/internships").json()) == 39

def test_invalid_internship_details_rejected(client):
    headers = admin_login(client)
    for patch in [{"closing": "not-a-date"}, {"branches": ["invalid"]}, {"requiredSkills": []}, {"minCgpa": 11}, {"openings": 0}]:
        assert client.post("/api/internships", json={**INTERNSHIP, **patch}, headers=headers).status_code == 422

def test_login_rate_limit(client):
    for _ in range(20):
        assert client.post("/api/auth/login", json={"email": "missing@example.com", "password": PASSWORD}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "missing@example.com", "password": PASSWORD}).status_code == 429

def test_admin_account_update_and_session_rotation(client):
    headers = admin_login(client)
    old_cookie = client.cookies.get(COOKIE)
    payload = {"name": " Updated Admin ", "email": " NEW@example.com ", "currentPassword": PASSWORD, "password": "New-admin-password-456"}
    result = client.put("/api/admin/account", json=payload, headers=headers)
    assert result.status_code == 200
    assert result.json()["user"]["name"] == "Updated Admin"
    assert result.json()["user"]["email"] == "new@example.com"
    assert "password" not in result.json()["user"]
    assert client.cookies.get(COOKIE) != old_cookie
    with TestClient(app) as old:
        old.cookies.set(COOKIE, old_cookie)
        assert old.get("/api/auth/me").status_code == 401
    assert client.post("/api/auth/login", json={"email": "admin@example.com", "password": PASSWORD}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "new@example.com", "password": PASSWORD}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "new@example.com", "password": payload["password"]}).status_code == 200

def test_admin_account_update_rejections_and_unchanged_password(client):
    register(client)
    headers = admin_login(client)
    payload = {"name": "Admin", "email": "admin@example.com", "currentPassword": PASSWORD}
    assert client.put("/api/admin/account", json=payload).status_code == 403
    assert client.put("/api/admin/account", json={**payload,"currentPassword":"incorrect-password"}, headers=headers).status_code == 400
    assert client.put("/api/admin/account", json={**payload,"email":"student@example.com"}, headers=headers).status_code == 409
    for patch in [{"name":" "},{"email":"invalid"},{"password":"short"},{"role":"student"}]:
        assert client.put("/api/admin/account", json={**payload,**patch}, headers=headers).status_code == 422
    assert client.get("/api/auth/me").json()["user"]["email"] == "admin@example.com"
    assert client.put("/api/admin/account", json={**payload,"name":"Renamed"}, headers=headers).status_code == 200
    assert client.post("/api/auth/login", json={"email":"admin@example.com","password":PASSWORD}).status_code == 200
    student_headers = register(client, "second@example.com")
    assert client.put("/api/admin/account", json=payload, headers=student_headers).status_code == 403

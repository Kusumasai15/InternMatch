"""Real HTTP smoke tests with disposable SQLite data; never touches user accounts."""
import os
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import time
import uuid

import httpx

ROOT = Path(__file__).resolve().parents[1]


def main():
    with httpx.Client(trust_env=False, timeout=10) as local:
        for url in ("http://localhost:3000", "http://localhost:8000/docs", "http://localhost:8000/api/health", "http://localhost:3000/api/health"):
            assert local.get(url).status_code == 200, url
        assert local.get("http://localhost:3000/api/auth/me").status_code == 401
        print("Local frontend, docs, backend health, and Vite proxy: PASS")

    with tempfile.TemporaryDirectory(prefix="internmatch-smoke-") as temporary:
        env = {**os.environ, "APP_DATABASE_PATH": str(Path(temporary) / "smoke.sqlite3"), "DATABASE_URL": "", "VERCEL": "", "APP_ENV": "development", "COOKIE_SECURE": "false"}
        password = secrets.token_urlsafe(24)
        setup = "from backend.app.database import initialize,connection; from backend.app.accounts import password_hash; import os,time,uuid; initialize(); db_context=connection(); db=db_context.__enter__(); db.execute('INSERT INTO users(id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)',(uuid.uuid4().hex,'admin@example.test','Smoke Admin',password_hash(os.environ['SMOKE_PASSWORD']),'admin',int(time.time()))); db_context.__exit__(None,None,None)"
        subprocess.run([sys.executable, "-c", setup], cwd=ROOT, env={**env, "SMOKE_PASSWORD": password}, check=True)
        with open(Path(temporary) / "server.log", "w") as log:
            server = subprocess.Popen([sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8001", "--loop", "asyncio", "--http", "h11"], cwd=ROOT, env=env, stdout=log, stderr=log)
            try:
                with httpx.Client(base_url="http://127.0.0.1:8001", trust_env=False, timeout=10) as client:
                    for _ in range(50):
                        try:
                            if client.get("/api/health").status_code == 200:
                                break
                        except httpx.ConnectError:
                            time.sleep(0.1)
                    else:
                        raise RuntimeError("Isolated smoke server did not start")
                    result = client.post("/api/auth/register", json={"name": "Smoke Student", "email": f"{uuid.uuid4().hex}@example.test", "password": password})
                    assert result.status_code == 201, result.text
                    email = result.json()["user"]["email"]
                    csrf = {"X-CSRF-Token": result.json()["csrfToken"]}
                    profile = {"name": "Smoke Student", "branch": "Computer Science & Engineering", "cgpa": 8, "location": "Pune", "skills": ["Python", "SQL"], "interests": ["Research"]}
                    assert client.put("/api/profile", json=profile, headers=csrf).status_code == 200
                    assert client.get("/api/auth/me").json()["user"]["profile"] == profile
                    jobs = client.get("/api/internships").json()
                    assert len(jobs) == 40
                    graph = client.post("/api/analytics", json={"profile": profile, "internships": jobs})
                    assert graph.status_code == 200 and any(item["proximity"] > 0 for item in graph.json()["recommendations"])
                    assert client.post("/api/auth/logout", headers=csrf).status_code == 204
                    assert client.get("/api/auth/me").status_code == 401
                    assert client.post("/api/auth/login", json={"email": email, "password": password}).status_code == 200
                    admin = client.post("/api/auth/login", json={"email": "admin@example.test", "password": password})
                    assert admin.status_code == 200
                    csrf = {"X-CSRF-Token": admin.json()["csrfToken"]}
                    fixture = {key: value for key, value in jobs[0].items() if key != "id"}
                    fixture.update(role="Disposable smoke fixture", company="Test fixture only")
                    added = client.post("/api/internships", json=fixture, headers=csrf)
                    assert added.status_code == 201, added.text
                    path = "/api/internships/" + added.json()["id"]
                    assert client.put(path, json={**fixture, "role": "Updated test fixture"}, headers=csrf).status_code == 200
                    assert client.delete(path, headers=csrf).status_code == 204
                    assert client.delete(path, headers=csrf).status_code == 404
                    assert client.put("/api/profile", json={**profile, "cgpa": 11}, headers=csrf).status_code == 422
                    preflight = client.options("/api/profile", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type,x-csrf-token"})
                    assert preflight.status_code == 200
                    print("Real HTTP student registration/login/logout, profile, catalog, analytics, admin CRUD, validation, CORS: PASS")
            finally:
                server.terminate()
                server.wait(timeout=10)


if __name__ == "__main__":
    main()

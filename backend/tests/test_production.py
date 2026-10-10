import pytest
from backend.app.config import allowed_origins, secure_cookie, validate_production
from backend.app.database import connection


def test_production_refuses_sqlite(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    with pytest.raises(RuntimeError, match="PostgreSQL"):
        validate_production()
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        with connection():
            pass


def test_hosted_cookie_is_always_secure(monkeypatch):
    assert not secure_cookie()
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("COOKIE_SECURE", "false")
    assert secure_cookie()


@pytest.mark.parametrize("origin", ["*", "https://*.vercel.app", "http://example.com", "https://example.com/profile"])
def test_production_rejects_unsafe_origins(monkeypatch, origin):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("DATABASE_URL", "postgresql://unused/test")
    monkeypatch.setenv("ALLOWED_ORIGINS", origin)
    with pytest.raises(RuntimeError, match="HTTPS"):
        validate_production()


def test_vercel_origin_and_custom_domain(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("DATABASE_URL", "postgresql://unused/test")
    monkeypatch.setenv("VERCEL_URL", "internmatch-preview.vercel.app")
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://internmatch.example/")
    assert allowed_origins() == ["https://internmatch.example", "https://internmatch-preview.vercel.app"]
    validate_production()


def test_database_failure_health_does_not_expose_credentials(monkeypatch):
    from fastapi.testclient import TestClient
    from backend.app.main import app
    monkeypatch.setenv("DATABASE_URL", "invalid-secret-url")
    # No lifespan: exercise the unavailable-database response directly.
    response = TestClient(app).get("/api/health")
    assert response.status_code == 503
    assert "secret" not in response.text

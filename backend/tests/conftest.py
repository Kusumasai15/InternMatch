"""Tests never inherit a developer's production database configuration."""
import pytest


@pytest.fixture(autouse=True)
def isolated_environment(monkeypatch):
    for name in ("DATABASE_URL", "VERCEL", "APP_ENV", "COOKIE_SECURE"):
        monkeypatch.delenv(name, raising=False)

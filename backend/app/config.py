"""Environment settings shared by local and hosted API deployments."""
import os
from urllib.parse import urlsplit


def production():
    return os.getenv("VERCEL") == "1" or os.getenv("APP_ENV") == "production"


def secure_cookie():
    # A forgotten local COOKIE_SECURE=false must never weaken hosted sessions.
    return production() or os.getenv("COOKIE_SECURE", "false").lower() == "true"


def allowed_origins():
    default = "" if production() else "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"
    origins = [value.strip().rstrip("/") for value in os.getenv("ALLOWED_ORIGINS", default).split(",") if value.strip()]
    # Vercel supplies this deployment's hostname, never a user-supplied wildcard.
    hostname = os.getenv("VERCEL_URL", "").strip()
    if os.getenv("VERCEL") == "1" and hostname:
        origins.append("https://" + hostname)
    return list(dict.fromkeys(origins))


def validate_production():
    if not production():
        return
    url = os.getenv("DATABASE_URL", "").strip()
    if not url.startswith(("postgres://", "postgresql://")):
        raise RuntimeError("Production requires a PostgreSQL DATABASE_URL; SQLite is local-only")
    origins = allowed_origins()
    if not origins:
        raise RuntimeError("Set ALLOWED_ORIGINS to the exact HTTPS frontend origin")
    for origin in origins:
        parsed = urlsplit(origin)
        if parsed.scheme != "https" or not parsed.netloc or parsed.path or parsed.query or parsed.fragment or "*" in origin or parsed.username:
            raise RuntimeError("Production ALLOWED_ORIGINS must contain exact HTTPS origins without paths or wildcards")

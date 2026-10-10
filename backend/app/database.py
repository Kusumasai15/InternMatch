# Shared storage: SQLite holds accounts and internships; demo data is seeded only once.
"""SQLite locally; durable PostgreSQL storage for hosted deployments."""
import json
import os
import sqlite3
import time
import psycopg
from psycopg.rows import dict_row
from contextlib import contextmanager
from pathlib import Path
from dotenv import load_dotenv
from .config import production

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

INTEGRITY_ERRORS = (sqlite3.IntegrityError, psycopg.IntegrityError)

class PostgresConnection:
    """Keep the small shared SQL interface used by the SQLite implementation."""
    def __init__(self, db):
        self.db = db

    def execute(self, sql, params=()):
        if sql == "BEGIN IMMEDIATE":
            sql = "SELECT 1"  # psycopg already starts a transaction.
        sql = sql.replace("?", "%s").replace("ORDER BY created_at DESC, rowid", "ORDER BY created_at DESC, id")
        return self.db.execute(sql, params)

    def executescript(self, script):
        for statement in script.split(";"):
            if statement.strip():
                self.db.execute(statement)

def database_path():
    return Path(os.environ.get("APP_DATABASE_PATH", ROOT / "data" / "app.sqlite3")).resolve()

@contextmanager
def connection():
    url = os.getenv("DATABASE_URL", "").strip()
    if url:
        if not url.startswith(("postgres://", "postgresql://")):
            raise ValueError("DATABASE_URL must be a PostgreSQL connection URL")
        # Transaction poolers may switch underlying sessions between requests.
        with psycopg.connect(url, row_factory=dict_row, connect_timeout=10, prepare_threshold=None) as db:
            yield PostgresConnection(db)
        return
    if production():
        raise RuntimeError("Set DATABASE_URL before deploying; production cannot use SQLite")
    target = database_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(target, timeout=15)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def initialize():
    with connection() as db:
        if os.getenv("DATABASE_URL", "").strip():
            db.execute("SELECT pg_advisory_xact_lock(25034)")
        db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL, password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('student','admin')),
            profile TEXT, created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            csrf TEXT NOT NULL, expires_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS internships (
            id TEXT PRIMARY KEY, details TEXT NOT NULL, created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, started_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS resume_results (
            user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            details TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS resume_uploads (
            user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            upload_id TEXT NOT NULL, extension TEXT NOT NULL, chunks TEXT NOT NULL,
            size INTEGER NOT NULL, expires_at INTEGER NOT NULL
        );
        """)
        db.execute("DELETE FROM resume_uploads WHERE expires_at<?", (int(time.time()),))
        if not db.execute("SELECT 1 FROM metadata WHERE key='catalog_seeded'").fetchone():
            for item in json.loads((ROOT.parent / "data" / "internships.json").read_text(encoding="utf-8")):
                db.execute("INSERT INTO internships VALUES (?, ?, 0) ON CONFLICT(id) DO NOTHING", (item["id"], json.dumps(item)))
            db.execute("INSERT INTO metadata VALUES ('catalog_seeded', '1')")

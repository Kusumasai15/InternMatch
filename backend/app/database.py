# Shared storage: SQLite holds accounts and internships; demo data is seeded only once.
"""SQLite storage for accounts, sessions, and the shared internship catalog."""
import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

def database_path():
    return Path(os.environ.get("APP_DATABASE_PATH", ROOT / "data" / "app.sqlite3")).resolve()

@contextmanager
def connection():
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
        """)
        if not db.execute("SELECT 1 FROM metadata WHERE key='catalog_seeded'").fetchone():
            for item in json.loads((ROOT.parent / "data" / "internships.json").read_text(encoding="utf-8")):
                db.execute("INSERT OR IGNORE INTO internships VALUES (?, ?, 0)", (item["id"], json.dumps(item)))
            db.execute("INSERT INTO metadata VALUES ('catalog_seeded', '1')")

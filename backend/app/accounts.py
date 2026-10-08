# Account API: validate credentials, manage sessions, and protect account changes.
import hashlib
import hmac
import json
import os
import re
import secrets
import time
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator
from .database import connection, INTEGRITY_ERRORS
from .models import Profile

router = APIRouter(prefix="/api")
COOKIE = "sihmatch_session"
SESSION_SECONDS = 8 * 60 * 60
Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]

class Login(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(max_length=254)
    password: str = Field(min_length=10, max_length=128)

    @field_validator("email")
    @classmethod
    def email_format(cls, value):
        value = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid email address")
        return value

class Register(Login):
    name: Text

def password_hash(password):
    salt = secrets.token_bytes(16)
    result = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1, dklen=32)
    return "scrypt$" + salt.hex() + "$" + result.hex()

def password_matches(password, encoded):
    try:
        _, salt, expected = encoded.split("$")
        result = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1, dklen=32)
        return hmac.compare_digest(result.hex(), expected)
    except (ValueError, TypeError):
        return False

# Perform the same expensive hash work for nonexistent users.
DUMMY_HASH = password_hash(secrets.token_urlsafe(32))

def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()

def public_user(row):
    return {"id": row["id"], "email": row["email"], "name": row["name"], "role": row["role"], "profile": json.loads(row["profile"]) if row["profile"] else None}

def current_session(request: Request):
    token = request.cookies.get(COOKIE, "")
    with connection() as db:
        session = db.execute("SELECT users.*, sessions.csrf, sessions.token_hash FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?", (token_hash(token), int(time.time()))).fetchone()
    if session is None:
        raise HTTPException(401, "Sign in to continue")
    return dict(session)

def mutation_session(session=Depends(current_session), x_csrf_token: str = Header(default="")):
    if not hmac.compare_digest(session["csrf"], x_csrf_token):
        raise HTTPException(403, "Invalid session request. Refresh and try again.")
    return session

def admin_session(session=Depends(mutation_session)):
    if session["role"] != "admin":
        raise HTTPException(403, "Only admins can manage internships")
    return session

def limit_auth(request, email):
    now = int(time.time())
    address = request.client.host if request.client else "unknown"
    # Limit by address as well as email to prevent cycling through accounts.
    keys = [token_hash("ip:" + address), token_hash("email:" + email)]
    with connection() as db:
        db.execute("DELETE FROM auth_attempts WHERE started_at<?", (now - 900,))
        for key in keys:
            row = db.execute("SELECT attempts FROM auth_attempts WHERE key=?", (key,)).fetchone()
            if row and row["attempts"] >= 20:
                raise HTTPException(429, "Too many sign-in attempts. Try again in 15 minutes.")
        for key in keys:
            db.execute("INSERT INTO auth_attempts VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1", (key, now))

def create_session(user, response, request):
    token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    now = int(time.time())
    with connection() as db:
        db.execute("DELETE FROM sessions WHERE expires_at<=?", (now,))
        old = request.cookies.get(COOKIE)
        if old:
            db.execute("DELETE FROM sessions WHERE token_hash=?", (token_hash(old),))
        db.execute("INSERT INTO sessions VALUES (?,?,?,?)", (token_hash(token), user["id"], csrf, now + SESSION_SECONDS))
    response.set_cookie(COOKIE, token, httponly=True, secure=os.getenv("COOKIE_SECURE", "false").lower() == "true", samesite="lax", max_age=SESSION_SECONDS, path="/")
    response.headers["Cache-Control"] = "no-store"
    return {"user": public_user(user), "csrfToken": csrf}

@router.post("/auth/register", status_code=201)
def register(payload: Register, request: Request, response: Response):
    limit_auth(request, payload.email)
    uid = uuid.uuid4().hex
    try:
        with connection() as db:
            db.execute("INSERT INTO users(id,email,name,password_hash,role,created_at) VALUES (?,?,?,?, 'student', ?)", (uid, payload.email, payload.name, password_hash(payload.password), int(time.time())))
            user = dict(db.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone())
    except INTEGRITY_ERRORS:
        raise HTTPException(409, "An account with this email already exists")
    return create_session(user, response, request)

@router.post("/auth/login")
def login(payload: Login, request: Request, response: Response):
    limit_auth(request, payload.email)
    with connection() as db:
        user = db.execute("SELECT * FROM users WHERE email=?", (payload.email,)).fetchone()
    valid = password_matches(payload.password, user["password_hash"] if user else DUMMY_HASH)
    if not user or not valid:
        raise HTTPException(401, "Email or password is incorrect")
    return create_session(dict(user), response, request)

@router.get("/auth/me")
def me(response: Response, session=Depends(current_session)):
    response.headers["Cache-Control"] = "no-store"
    return {"user": public_user(session), "csrfToken": session["csrf"]}

@router.post("/auth/logout", status_code=204)
def logout(response: Response, session=Depends(mutation_session)):
    with connection() as db:
        db.execute("DELETE FROM sessions WHERE token_hash=?", (session["token_hash"],))
    response.delete_cookie(COOKIE, path="/")

@router.put("/profile")
def update_profile(payload: Profile, session=Depends(mutation_session)):
    with connection() as db:
        db.execute("UPDATE users SET profile=? WHERE id=?", (payload.model_dump_json(), session["id"]))
    return payload

class AdminAccountUpdate(Login):
    name: Text
    currentPassword: str = Field(min_length=10, max_length=128)
    password: str | None = Field(default=None, min_length=10, max_length=128)

@router.put("/admin/account")
def update_admin_account(payload: AdminAccountUpdate, request: Request, response: Response, session=Depends(admin_session)):
    limit_auth(request, session["email"])
    try:
        with connection() as db:
            db.execute("BEGIN IMMEDIATE")
            user = db.execute("SELECT * FROM users WHERE id=?", (session["id"],)).fetchone()
            if not password_matches(payload.currentPassword, user["password_hash"]):
                raise HTTPException(400, "Current password is incorrect")
            encoded = password_hash(payload.password) if payload.password else user["password_hash"]
            db.execute("UPDATE users SET name=?,email=?,password_hash=? WHERE id=?", (payload.name, payload.email, encoded, session["id"]))
            # Revoke all existing sessions after changing account credentials.
            db.execute("DELETE FROM sessions WHERE user_id=?", (session["id"],))
            updated = dict(db.execute("SELECT * FROM users WHERE id=?", (session["id"],)).fetchone())
    except INTEGRITY_ERRORS:
        raise HTTPException(409, "An account with this email already exists")
    return create_session(updated, response, request)

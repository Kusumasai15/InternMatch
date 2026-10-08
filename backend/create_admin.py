"""Run from the project root: python -m backend.create_admin"""
import getpass
import sqlite3
import time
import uuid
from .app.database import initialize, connection
from .app.accounts import Register, password_hash

def main():
    email = input("Admin email: ").strip()
    name = input("Admin name: ").strip()
    password = getpass.getpass("Admin password (at least 10 characters): ")
    if password != getpass.getpass("Confirm password: "):
        raise SystemExit("Passwords do not match")
    account = Register(email=email, name=name, password=password)
    initialize()
    try:
        with connection() as db:
            db.execute("INSERT INTO users(id,email,name,password_hash,role,created_at) VALUES (?,?,?,?, 'admin', ?)", (uuid.uuid4().hex, account.email, account.name, password_hash(account.password), int(time.time())))
    except sqlite3.IntegrityError:
        raise SystemExit("This email already has an account. No role was changed.")
    print("Admin account created. Sign in through the app.")

if __name__ == "__main__":
    main()

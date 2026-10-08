from backend.app.database import PostgresConnection

class FakeConnection:
    def __init__(self):
        self.calls = []
    def execute(self, sql, params=()):
        self.calls.append((sql, params))
        return self

def test_postgres_query_adaptation():
    raw = FakeConnection()
    db = PostgresConnection(raw)
    db.execute("SELECT * FROM users WHERE email=?", ("student@example.com",))
    assert raw.calls[-1] == ("SELECT * FROM users WHERE email=%s", ("student@example.com",))
    db.execute("BEGIN IMMEDIATE")
    assert raw.calls[-1][0] == "SELECT 1"
    db.execute("SELECT details FROM internships ORDER BY created_at DESC, rowid")
    assert raw.calls[-1][0].endswith("ORDER BY created_at DESC, id")

def test_postgres_schema_executes_separate_statements():
    raw = FakeConnection()
    PostgresConnection(raw).executescript("CREATE TABLE first(id TEXT); CREATE TABLE second(id TEXT);")
    assert len(raw.calls) == 2

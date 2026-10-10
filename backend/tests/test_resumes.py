import base64
import io
import json
import time
import uuid
import pytest
import pymupdf
from docx import Document
from backend.tests.test_accounts import client, register, admin_login, PROFILE
from backend.app.database import connection
from backend.app.resumes import analyze, extract_text

TEXT = "Skills: Python, SQL, Pandas, Machine Learning, Data Analysis.\nEducation: B.Tech in AI & Data Science\nProjects\nPredictive analytics using Python and Pandas\nCertifications\nCertified Python training"


def pdf(text=TEXT):
    with pymupdf.open() as document:
        page = document.new_page()
        page.insert_text((40, 40), text)
        return document.tobytes()


def docx():
    document = Document()
    for line in TEXT.splitlines():
        document.add_paragraph(line)
    output = io.BytesIO()
    document.save(output)
    return output.getvalue()


def upload(client, headers, data=None, extension="pdf", **kwargs):
    payload = {"uploadId": str(uuid.uuid4()), "extension": extension, "index": 0,
               "data": base64.b64encode(data or pdf()).decode(), "final": True, **kwargs}
    return client.post("/api/resume/upload", json=payload, headers=headers)


@pytest.mark.parametrize("extension,make", [("pdf", pdf), ("docx", docx)])
def test_parsing_minimal_explainable_information(extension, make):
    result = analyze(make(), extension)
    assert {"Python", "SQL", "Pandas", "Machine Learning", "Data Analysis"}.issubset(result["skills"])
    assert "Python" in result["projectSkills"]
    assert result["suggestedBranch"] == "Artificial Intelligence & Data Science"
    assert result["sectionsDetected"]["certifications"]
    assert "Predictive" not in json.dumps(result)
    assert "Skills:" not in json.dumps(result)


def test_upload_review_refresh_and_delete_preserves_manual_skills(client):
    headers = register(client)
    assert client.put("/api/profile", headers=headers, json=PROFILE).status_code == 200
    response = upload(client, headers)
    assert response.status_code == 200
    assert "Pandas" in client.get("/api/auth/me").json()["user"]["profile"]["skills"]
    response = client.put("/api/resume", headers=headers, json={"skills": ["SQL", "Docker"]})
    assert response.status_code == 200
    assert set(response.json()["profile"]["skills"]) == {"Python", "SQL", "Docker"}
    assert client.delete("/api/resume", headers=headers).status_code == 200
    assert client.get("/api/resume").json()["analysis"] is None
    assert client.get("/api/auth/me").json()["user"]["profile"]["skills"] == ["Python"]
    with connection() as db:
        assert not db.execute("SELECT 1 FROM resume_uploads").fetchone()


def test_access_and_csrf(client):
    assert upload(client, {}).status_code == 401
    headers = register(client)
    assert upload(client, {}).status_code == 403
    assert upload(client, headers).status_code == 200
    client.post("/api/auth/logout", headers=headers)
    headers = register(client, "another@example.com")
    assert client.get("/api/resume").json()["analysis"] is None
    assert client.put("/api/resume", headers=headers, json={"skills": ["Python"]}).status_code == 404


def test_admin_cannot_upload(client):
    assert upload(client, admin_login(client)).status_code == 403


@pytest.mark.parametrize("extension,data", [("pdf", b"not a pdf"), ("docx", b"PKbroken"), ("pdf", b"%PDF-1.7 broken %%EOF")])
def test_corrupt_signature_rejected(client, extension, data):
    assert upload(client, register(client), data, extension).status_code == 422


def test_encrypted_and_image_only_pdf_rejected():
    with pymupdf.open() as document:
        document.new_page()
        encrypted = document.tobytes(encryption=pymupdf.PDF_ENCRYPT_AES_256, user_pw="test-only", owner_pw="test-only")
    with pytest.raises(ValueError, match="Password-protected"):
        extract_text(encrypted, "pdf")
    with pytest.raises(ValueError, match="Scanned"):
        extract_text(pdf(""), "pdf")


def test_zip_bomb_and_xml_entities_rejected():
    import zipfile
    for content in [b"a" * (21 * 1024 * 1024), b'<!DOCTYPE x [<!ENTITY y "bad">]><x/>']:
        output = io.BytesIO()
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("[Content_Types].xml", "<x/>")
            archive.writestr("word/document.xml", content)
        with pytest.raises(ValueError):
            extract_text(output.getvalue(), "docx")


def test_full_five_mb_chunked_pdf(client):
    headers = register(client)
    raw = pdf()
    # Keep startxref near EOF; placing megabytes after it would corrupt the PDF.
    data = raw.replace(b"startxref", b"%" + b"x" * (5*1024*1024-len(raw)-2) + b"\nstartxref")
    assert len(data) == 5*1024*1024
    upload_id = str(uuid.uuid4())
    for index, offset in enumerate(range(0, len(data), 2*1024*1024)):
        response = upload(client, headers, data[offset:offset+2*1024*1024], uploadId=upload_id, index=index, final=offset+2*1024*1024>=len(data))
        assert response.status_code == 200, response.text
    assert "Python" in response.json()["analysis"]["skills"]
    with connection() as db:
        assert not db.execute("SELECT 1 FROM resume_uploads").fetchone()


def test_order_size_and_rate_limits(client):
    headers = register(client)
    assert upload(client, headers, index=1).status_code == 409
    assert upload(client, headers, b"x"*(2*1024*1024+1)).status_code in (413, 422)
    for _ in range(5):
        assert upload(client, headers).status_code == 200
    assert upload(client, headers).status_code == 429


def test_expired_staging_and_last_derived_skill_deletion(client):
    headers = register(client)
    client.put("/api/profile", headers=headers, json={**PROFILE, "skills": ["Docker"]})
    upload(client, headers, pdf("Skills: Python SQL. A student project uses Python for research."))
    # A student can remove their old manual skill, then delete all derived data.
    client.put("/api/profile", headers=headers, json={**PROFILE, "skills": ["Python", "SQL"]})
    assert client.delete("/api/resume", headers=headers).status_code == 200
    assert client.get("/api/auth/me").json()["user"]["profile"]["skills"] == []


def test_first_profile_applies_resume_and_can_delete_it(client):
    headers = register(client)
    assert upload(client, headers).status_code == 200
    assert client.get("/api/auth/me").json()["user"]["profile"] is None
    response = client.put("/api/profile", headers=headers, json={**PROFILE, "skills": ["Docker"]})
    assert response.status_code == 200
    assert "Pandas" in response.json()["skills"]
    assert client.delete("/api/resume", headers=headers).status_code == 200
    assert client.get("/api/auth/me").json()["user"]["profile"]["skills"] == ["Docker"]


def test_expired_upload_cleanup_and_readiness(client):
    headers = register(client)
    assert upload(client, headers, final=False).status_code == 200
    with connection() as db:
        db.execute("UPDATE resume_uploads SET expires_at=?", (int(time.time())-1,))
    assert client.get("/api/resume").status_code == 200
    with connection() as db:
        assert not db.execute("SELECT 1 FROM resume_uploads").fetchone()
    assert client.get("/api/readiness").status_code == 200

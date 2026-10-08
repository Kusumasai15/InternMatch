# Internship API: signed-in users can read records; only admins can change them.
import json
import time
import uuid
from datetime import date, datetime
from typing import Annotated, Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator
from .accounts import current_session, admin_session
from .database import connection
from .models import WorkMode

router = APIRouter(prefix="/api/internships")
Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]
BRANCHES = {"Computer Science & Engineering", "Information Technology", "Artificial Intelligence & Data Science", "Electronics & Communication", "Electrical Engineering", "Mechanical Engineering"}

class InternshipInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Text
    company: Text
    sector: Text
    location: Text
    workMode: WorkMode
    stipend: float = Field(ge=0, le=10000000, allow_inf_nan=False)
    duration: Literal["3 months", "4 months", "5 months", "6 months"]
    closing: str
    minCgpa: float = Field(ge=0, le=10, allow_inf_nan=False)
    branches: list[Text] = Field(min_length=1, max_length=6)
    requiredSkills: list[Text] = Field(min_length=1, max_length=100)
    interests: list[Text] = Field(min_length=1, max_length=100)
    openings: int = Field(ge=1, le=100000)
    applicants: int = Field(default=0, ge=0, le=10000000)
    summary: Text
    logo: Text = "I"
    logoTone: Literal["green", "rose", "orange", "violet", "multi", "slate", "blue", "amber"] = "green"

    @field_validator("closing")
    @classmethod
    def valid_date(cls, value):
        try:
            return date.fromisoformat(value).isoformat()
        except ValueError:
            try:
                return datetime.strptime(value, "%b %d, %Y").date().isoformat()
            except ValueError:
                raise ValueError("Enter a valid closing date")

    @field_validator("branches")
    @classmethod
    def supported_branches(cls, values):
        if not all(branch in BRANCHES for branch in values):
            raise ValueError("Choose supported branches")
        return list(dict.fromkeys(values))

    @field_validator("requiredSkills", "interests")
    @classmethod
    def unique_tags(cls, values):
        return list({value.lower(): value for value in values}.values())

@router.get("")
def list_internships(session=Depends(current_session)):
    with connection() as db:
        return [json.loads(row["details"]) for row in db.execute("SELECT details FROM internships ORDER BY created_at DESC, rowid")]

@router.post("", status_code=201)
def add_internship(payload: InternshipInput, session=Depends(admin_session)):
    item = {"id": uuid.uuid4().hex, **payload.model_dump()}
    with connection() as db:
        db.execute("INSERT INTO internships VALUES (?,?,?)", (item["id"], json.dumps(item), int(time.time())))
    return item

@router.put("/{internship_id}")
def edit_internship(internship_id: str, payload: InternshipInput, session=Depends(admin_session)):
    item = {"id": internship_id, **payload.model_dump()}
    with connection() as db:
        changed = db.execute("UPDATE internships SET details=? WHERE id=?", (json.dumps(item), internship_id)).rowcount
        if not changed:
            raise HTTPException(404, "Internship not found")
    return item

@router.delete("/{internship_id}", status_code=204)
def delete_internship(internship_id: str, session=Depends(admin_session)):
    with connection() as db:
        if not db.execute("DELETE FROM internships WHERE id=?", (internship_id,)).rowcount:
            raise HTTPException(404, "Internship not found")

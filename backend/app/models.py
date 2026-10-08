# Data rules: Pydantic checks incoming profile and analytics fields before processing.
from typing import Annotated, Literal
from pydantic import BaseModel, Field, StringConstraints, field_validator

WorkMode = Literal["Remote", "Hybrid", "On-site"]

ProfileText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]

class Profile(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)] = ""
    branch: ProfileText
    cgpa: float = Field(ge=0, le=10, allow_inf_nan=False)
    location: ProfileText
    skills: list[ProfileText] = Field(min_length=1, max_length=100)
    interests: list[ProfileText] = Field(min_length=1, max_length=100)

    @field_validator("branch")
    @classmethod
    def supported_branch(cls, value):
        if value not in ["Computer Science & Engineering","Information Technology","Artificial Intelligence & Data Science","Electronics & Communication","Electrical Engineering","Mechanical Engineering"]:
            raise ValueError("Choose a supported engineering branch")
        return value

    @field_validator("skills", "interests")
    @classmethod
    def unique_tags(cls, values):
        return list({value.lower(): value for value in values}.values())

class Internship(BaseModel):
    id: str
    role: str
    company: str
    sector: str
    location: str
    workMode: WorkMode
    minCgpa: float
    branches: list[str]
    requiredSkills: list[str]
    interests: list[str]

class AnalyticsRequest(BaseModel):
    profile: Profile
    internships: list[Internship]

class SkillMetric(BaseModel):
    skill: str
    centrality: float
    demand: int
    supply: int
    gap: float
    community: int

class RecommendationMetric(BaseModel):
    internshipId: str
    role: str
    company: str
    jaccard: float
    proximity: float
    communityCoverage: float
    graphScore: float
    shortestPath: int | None
    matchingSkills: list[str]
    missingSkills: list[str]

class CommunityMetric(BaseModel):
    id: int
    label: str
    skills: list[str]
    size: int

class AnalyticsResponse(BaseModel):
    nodeCounts: dict[str, int]
    edgeCount: int
    averageDegree: float
    topSkills: list[SkillMetric]
    recommendations: list[RecommendationMetric]
    communities: list[CommunityMetric]
    paths: list[dict[str, object]]

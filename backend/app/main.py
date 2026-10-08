# API entry point: starts the database and connects account, catalog, and graph routes.
import os
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .models import AnalyticsRequest, AnalyticsResponse
from .analytics import analytics
from .database import initialize
from .accounts import router as accounts_router
from .catalog import router as catalog_router

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()]

@asynccontextmanager
async def lifespan(app):
    initialize()
    yield

app = FastAPI(title="InternMatch API", version="2.0.0", description="Accounts, internship management, and NetworkX analytics.", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=True, allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["Content-Type", "X-CSRF-Token"])

@app.middleware("http")
async def protect_browser_requests(request: Request, call_next):
    if request.method in {"POST", "PUT", "DELETE", "PATCH"}:
        origin = request.headers.get("origin")
        if (origin and origin not in ALLOWED_ORIGINS) or (request.headers.get("sec-fetch-site") == "cross-site" and origin not in ALLOWED_ORIGINS):
            return JSONResponse(status_code=403, content={"detail": "Request origin is not allowed"})
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response

app.include_router(accounts_router)
app.include_router(catalog_router)

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "internship-platform", "engine": "NetworkX"}

@app.post("/api/analytics", response_model=AnalyticsResponse)
def graph_analytics(payload: AnalyticsRequest):
    return analytics(payload)

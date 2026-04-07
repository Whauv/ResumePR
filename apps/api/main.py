import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from routers.analysis import router as analysis_router
from routers.jobs import router as jobs_router
from routers.resume import router as resume_router
from routers.versions import router as versions_router
from services.auth import verify_bearer_token
from services.db import get_connection

load_dotenv(Path(__file__).resolve().parent / ".env")

logger = logging.getLogger("resumepr.api")
app = FastAPI(title="ResumePR API", version="0.1.0")


def allowed_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


class FirebaseAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS" or request.url.path in {"/health"}:
            return await call_next(request)

        authorization = request.headers.get("Authorization", "")
        if not authorization.startswith("Bearer "):
            return JSONResponse(status_code=401, content={"detail": "Missing bearer token."})

        token = authorization.replace("Bearer ", "", 1).strip()
        try:
            decoded = verify_bearer_token(token)
        except Exception:
            logger.warning("Firebase token verification failed for path %s", request.url.path)
            return JSONResponse(status_code=401, content={"detail": "Invalid Firebase token."})

        request.state.user_id = decoded["uid"]
        return await call_next(request)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(FirebaseAuthMiddleware)

app.include_router(resume_router)
app.include_router(jobs_router)
app.include_router(analysis_router)
app.include_router(versions_router)


@app.on_event("startup")
def initialize_database() -> None:
    connection = get_connection()
    connection.close()


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}

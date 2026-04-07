import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware

from routers.analysis import router as analysis_router
from routers.jobs import router as jobs_router
from routers.resume import router as resume_router
from routers.versions import router as versions_router
from services.auth import verify_bearer_token
from services.db import get_connection

load_dotenv(Path(__file__).resolve().parent / ".env")


def configure_logging() -> None:
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=getattr(logging, level_name, logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


configure_logging()
logger = logging.getLogger("resumepr.api")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    connection = get_connection()
    connection.close()
    logger.info("ResumePR API started")
    yield


app = FastAPI(title="ResumePR API", version="0.1.0", lifespan=lifespan)


def allowed_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


class FirebaseAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request.state.request_id = str(uuid4())
        started_at = time.perf_counter()
        if request.method == "OPTIONS" or request.url.path in {"/health"}:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request.state.request_id
            return response

        authorization = request.headers.get("Authorization", "")
        if not authorization.startswith("Bearer "):
            response = JSONResponse(
                status_code=401,
                content={"detail": "Missing bearer token.", "request_id": request.state.request_id},
            )
            response.headers["X-Request-ID"] = request.state.request_id
            return response

        token = authorization.replace("Bearer ", "", 1).strip()
        try:
            decoded = verify_bearer_token(token)
        except Exception:
            logger.warning(
                "firebase_auth_failed request_id=%s path=%s",
                request.state.request_id,
                request.url.path,
            )
            response = JSONResponse(
                status_code=401,
                content={"detail": "Invalid Firebase token.", "request_id": request.state.request_id},
            )
            response.headers["X-Request-ID"] = request.state.request_id
            return response

        request.state.user_id = decoded["uid"]
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - started_at) * 1000, 2)
        response.headers["X-Request-ID"] = request.state.request_id
        logger.info(
            "request_complete request_id=%s method=%s path=%s status=%s duration_ms=%s user_id=%s",
            request.state.request_id,
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
            request.state.user_id,
        )
        return response


def current_request_id(request: Request) -> str:
    return getattr(request.state, "request_id", str(uuid4()))


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    request_id = current_request_id(request)
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed."
    logger.warning(
        "http_error request_id=%s method=%s path=%s status=%s detail=%s",
        request_id,
        request.method,
        request.url.path,
        exc.status_code,
        detail,
    )
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": detail, "request_id": request_id},
    )
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = current_request_id(request)
    logger.warning(
        "validation_error request_id=%s method=%s path=%s errors=%s",
        request_id,
        request.method,
        request.url.path,
        exc.errors(),
    )
    response = JSONResponse(
        status_code=422,
        content={"detail": "Request validation failed.", "errors": exc.errors(), "request_id": request_id},
    )
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = current_request_id(request)
    logger.exception(
        "unhandled_error request_id=%s method=%s path=%s",
        request_id,
        request.method,
        request.url.path,
        exc_info=exc,
    )
    response = JSONResponse(
        status_code=500,
        content={"detail": "Internal server error.", "request_id": request_id},
    )
    response.headers["X-Request-ID"] = request_id
    return response

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


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}

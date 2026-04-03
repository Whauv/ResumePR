from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from routers.analysis import router as analysis_router
from routers.jobs import router as jobs_router
from routers.resume import router as resume_router
from routers.versions import router as versions_router
from services.auth import verify_bearer_token

app = FastAPI(title="ResumePR API", version="0.1.0")


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
        except Exception as exc:
            return JSONResponse(status_code=401, content={"detail": "Invalid Firebase token."})

        request.state.user_id = decoded["uid"]
        return await call_next(request)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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

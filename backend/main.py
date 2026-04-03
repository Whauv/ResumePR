from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.analysis import router as analysis_router
from routers.jobs import router as jobs_router
from routers.resume import router as resume_router

app = FastAPI(title="ResumePR API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume_router)
app.include_router(jobs_router)
app.include_router(analysis_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}

# ResumePR Agent Guide

## Setup

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn resumepr_api.main:app --reload --app-dir src
```

```bash
cd apps/web
npm install
npm run dev
```

## Folder Map

- `apps/api/src/resumepr_api`: backend package with models, routers, and services
- `apps/api/tests`: backend tests
- `apps/web/src`: React app source
- `apps/web/tests/e2e`: Playwright browser smoke tests
- `apps/extension/src`: extension scripts
- `apps/extension/public`: extension HTML assets
- `docs`: project-level supporting documentation

## Code Style

- Preserve existing business logic during refactors unless explicitly asked to change behavior.
- Keep backend imports package-based from `resumepr_api`.
- Prefer colocated tests for frontend units and `apps/api/tests` for backend integration/service tests.

## Test Commands

```bash
python -m pytest apps/api/tests -o cache_dir=apps/api/.pytest_cache
python -m compileall apps/api/src apps/api/tests
```

```bash
cd apps/web
npm run test
npm run test:e2e
```

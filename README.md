# ResumePR

ResumePR is an AI-assisted resume tailoring platform built as a monorepo. It combines a React web app, a FastAPI API, and a Chrome extension to turn job descriptions into targeted, reviewable resume improvements.

## Repo Structure

```text
ResumePR/
|-- apps/
|   |-- api/          FastAPI backend, AI services, parsing, analysis, export
|   |-- web/          React + Vite + Tailwind web app
|   `-- extension/    Chrome extension for job description capture
|-- .env.example      Shared environment variable reference
|-- package.json      Root helper scripts for local development
|-- README.md
`-- vercel.json       Repo-root Vercel rewrite config
```

## How It Works

```mermaid
flowchart LR
    A["User uploads resume in web app"] --> B["API parses PDF/DOCX into structured resume JSON"]
    C["User pastes job URL/text or uses Chrome extension"] --> D["API fetches/extracts job description"]
    D --> E["spaCy + keyword extraction builds job requirement model"]
    B --> F["Gap analyzer compares resume vs job"]
    E --> F
    F --> G["Skills gap report by section<br/>Skills / Experience / Summary"]
    G --> H["Gemini suggests targeted bullet rewrites"]
    H --> I["Accept / Reject diff editor"]
    I --> J["Accepted edits create a new resume version"]
    J --> K["Version history, compare, restore, export PDF/DOCX"]
    C --> L["Extension sends JD to backend and opens analysis view"]
    L --> F
```

## Core Product Flow

1. The user uploads a resume in PDF or DOCX format.
2. The API parses the file into structured resume JSON.
3. A job description is ingested from a pasted URL, raw text, or the Chrome extension.
4. The backend extracts requirements, skills, title, company, and qualification signals.
5. The gap analysis engine scores the resume by section and identifies missing keywords.
6. Gemini generates safe, targeted rewrite suggestions for existing bullets only.
7. The user accepts or rejects each change independently in a PR-style diff editor.
8. Accepted edits are saved as a new version with metadata and can be compared or exported.

## Apps

### `apps/api`

Owns:

- Resume upload and parsing
- Job description ingestion and keyword extraction
- Skills gap analysis
- Gemini suggestion generation
- Version history, restore, and export
- Firebase token verification and user-scoped data access
- Versioned SQLite migrations and indexed schema bootstrapping

### `apps/web`

Owns:

- Resume upload UI
- Job input and analysis screens
- Gap analysis center panel
- Accept/reject diff editor
- Version history, export modal, and auth flows

### `apps/extension`

Owns:

- Active job page extraction
- Popup-based handoff to the backend
- Browser-side sync into the web app flow

## Local Development

### 1. Clone and enter the repo

```bash
git clone https://github.com/Whauv/ResumePR.git
cd ResumePR
```

### 2. Configure environment variables

Copy these templates and fill them in:

- `.env.example`
- `apps/api/.env.example`
- `apps/web/.env.example`

### 3. Start the API

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn main:app --reload
```

API default URL: `http://127.0.0.1:8000`

The API automatically runs versioned SQLite migrations on startup. To point the app at a different database for testing, set `RESUMEPR_DB_PATH`.

### 4. Start the web app

```bash
cd apps/web
npm install
npm run dev
```

Web default URL: `http://127.0.0.1:5173`

### 4.5. Run backend checks

```bash
python -m pytest apps/api/tests -o cache_dir=apps/api/.pytest_cache
python -m compileall apps/api/main.py apps/api/routers apps/api/services apps/api/tests
```

### 4.6. Run web tests

```bash
cd apps/web
npm install
npm run test
npm run test:e2e
```

The web test suite uses:

- Vitest + Testing Library for component and utility coverage
- Playwright for browser-level smoke coverage against a deterministic seeded UI mode

Browser smoke tests can be run locally against:

```text
http://127.0.0.1:4173/?e2e=1&page=resume
http://127.0.0.1:4173/?e2e=1&page=diff
```

### 5. Load the Chrome extension

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select `apps/extension`

## Root Scripts

The root `package.json` includes convenience commands:

```bash
npm run install:web
npm run dev:web
npm run build:web
npm run preview:web
npm run dev:api
```

## Environment Variables

### Shared

- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `PORT`
- `VITE_API_URL`
- `VITE_FIREBASE_CONFIG`

### API

- `GROQ_API_KEY`
- `GROQ_MODEL`
- `GEMINI_API_KEY`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `PORT`

### Web

- `VITE_API_URL`
- `VITE_FIREBASE_CONFIG`

`VITE_FIREBASE_CONFIG` should be a JSON string containing your Firebase web config.

## Firebase Setup

1. Create a Firebase project.
2. Enable Authentication.
3. Turn on Email/Password.
4. Turn on Google sign-in.
5. Create a web app and copy the config into `VITE_FIREBASE_CONFIG`.
6. Generate a service account key.
7. Put the full JSON into `FIREBASE_SERVICE_ACCOUNT_JSON`.

## LLM Setup

ResumePR prefers Groq for AI suggestions and falls back to Gemini if Groq is unavailable.

1. Create a Groq API key and set it as `GROQ_API_KEY`.
2. Optionally set `GROQ_MODEL` or keep the default `llama-3.3-70b-versatile`.
3. Create a Gemini API key in Google AI Studio if you want a backup provider.
4. Set the backup key as `GEMINI_API_KEY`.

## Deployment

### Frontend on Vercel

Two deployment options are supported:

- Deploy the repo root using the root `vercel.json`
- Deploy `apps/web` directly using `apps/web/vercel.json`

Set:

- `VITE_API_URL`
- `VITE_FIREBASE_CONFIG`

### Backend on Railway or Render

Use:

- `apps/api/Dockerfile`
- `apps/api/Procfile`

Set:

- `GROQ_API_KEY`
- `GROQ_MODEL`
- `GEMINI_API_KEY`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

## Architecture Diagram

```text
apps/extension
    |
    | DOM extraction + popup sync
    v
apps/web ---------------------------> apps/api -------------------------> SQLite
    |                                     |                                |
    | upload, review, history, export     | parsing, NLP, Gemini, auth     | resumes, jobs,
    |                                     |                                | analyses, versions
    +------------------------- authenticated API requests -----------------+
```

## Key Features

- Resume upload and structured parsing for PDF and DOCX
- Job description ingestion from URL, raw text, or extension capture
- Section-level skills gap analysis instead of a single ATS score only
- PR-style accept/reject AI diff editor for bullet rewrites
- Resume version history with compare, restore, and export
- Firebase-authenticated, user-scoped data model
- Indexed SQLite schema bootstrapping shared across routers
- Backend regression tests for parsing, scoring, and schema initialization
- Frontend shared API client helpers with consistent JSON/blob error handling
- Frontend test harness for component and utility verification
- Browser-level smoke coverage with Playwright and CI automation via GitHub Actions

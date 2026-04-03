# ResumePR

ResumePR is a monorepo for a resume tailoring product with a FastAPI backend, React frontend, and Chrome extension shell.

## Structure

```text
ResumePR/
|-- backend/
|-- frontend/
`-- extension/
```

## Backend setup

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
cd backend
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

The first time Phase 3 runs, `sentence-transformers` will load `all-MiniLM-L6-v2` for semantic gap analysis.

3. Start the API server:

```bash
uvicorn main:app --reload
```

The backend runs on `http://127.0.0.1:8000` and stores uploaded resume payloads in `backend/resumes.db`.

## Frontend setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start the Vite dev server:

```bash
npm run dev
```

The frontend runs on `http://127.0.0.1:5173` and proxies upload requests to the FastAPI server.

## Chrome extension

Load the `extension/` folder as an unpacked extension in Chrome Developer Mode.

## Phase 1, 2, and 3 features

- Upload PDF or DOCX resumes
- Parse resumes into structured JSON
- Persist parsed payloads in SQLite with UUID identifiers
- Review parsed sections in a read-only web preview
- Analyze job descriptions from URLs or raw pasted text
- Extract job title, company name, required/preferred skills, experience, and education requirements
- Sync job postings from the Chrome extension into the web app workflow
- Run per-section skills gap analysis across Skills, Experience, and Summary
- Score ATS alignment with matched keywords, missing terms, and red-flag warnings
- Stage a Phase 4 handoff target for the future accept/reject diff editor

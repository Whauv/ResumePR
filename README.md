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
```

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

## Phase 1 features

- Upload PDF or DOCX resumes
- Parse resumes into structured JSON
- Persist parsed payloads in SQLite with UUID identifiers
- Review parsed sections in a read-only web preview
- Bootstrap Chrome extension shell for future JD extraction and sync

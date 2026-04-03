# ResumePR

ResumePR is a monorepo for an AI-assisted resume tailoring product with a React web app, FastAPI backend, and Chrome extension.

## Architecture

```text
Chrome Extension
    |
    | extracts job descriptions and syncs authenticated payloads
    v
React + Vite + Firebase Auth  --->  FastAPI + Gemini + Firebase Admin  --->  SQLite
    |                                        |
    | upload, diff review, history           | parsing, analysis, export
    v                                        v
Resume UX                               PDF/DOCX + versioning
```

## Monorepo

```text
ResumePR/
|-- backend/
|-- frontend/
|-- extension/
`-- vercel.json
```

## Local setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn main:app --reload
```

Backend default URL: `http://127.0.0.1:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend default URL: `http://127.0.0.1:5173`

### Chrome extension

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select the `extension/` folder

## Environment variables

### Frontend

- `VITE_API_URL`
- `VITE_FIREBASE_CONFIG`

`VITE_FIREBASE_CONFIG` should be a JSON string containing your Firebase web config.

### Backend

- `GEMINI_API_KEY`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `PORT`

## Gemini API key

1. Open Google AI Studio
2. Create a Gemini API key on the free tier
3. Set the key as `GEMINI_API_KEY`

## Firebase project setup

1. Create a Firebase project
2. Enable Authentication
3. Turn on Email/Password
4. Turn on Google OAuth
5. Create a Firebase web app and copy its config into `VITE_FIREBASE_CONFIG`
6. Create a service account key
7. Put the full service account JSON into `FIREBASE_SERVICE_ACCOUNT_JSON`

## Deployment

### Frontend on Vercel

Use the included `vercel.json` and set:

- `VITE_API_URL`
- `VITE_FIREBASE_CONFIG`

### Backend on Railway or Render

Use the included `backend/Dockerfile` and `backend/Procfile` and set:

- `GEMINI_API_KEY`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

## Features

- Resume upload and parsing for PDF and DOCX
- Job description ingestion from URL, raw text, or extension DOM extraction
- Firebase-authenticated, user-scoped backend data
- Per-section skills gap analysis and ATS scoring
- Gemini-powered accept/reject diff review
- Resume version history, compare, restore, and export
- Command palette, skeleton loaders, empty states, and extension handoff

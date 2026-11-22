FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
# Keyword extraction uses this spaCy model; without it the service silently
# falls back to a blank pipeline (no real NER). See services/keyword_extractor.py.
RUN python -m spacy download en_core_web_sm

COPY . /app

CMD ["sh", "-c", "uvicorn resumepr_api.main:app --app-dir /app/src --host 0.0.0.0 --port ${PORT:-8000}"]

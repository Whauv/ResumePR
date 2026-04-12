FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

CMD ["sh", "-c", "uvicorn resumepr_api.main:app --app-dir /app/src --host 0.0.0.0 --port ${PORT:-8000}"]

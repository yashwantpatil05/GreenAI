FROM python:3.11-slim
WORKDIR /code
COPY backend/requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend /code/backend
COPY migrations /code/migrations
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]

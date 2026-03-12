FROM python:3.11-slim
WORKDIR /code
ENV PYTHONPATH=/code
COPY backend/requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend /code/backend
COPY migrations /code/migrations
COPY alembic.ini /code/alembic.ini
CMD ["alembic", "upgrade", "head"]

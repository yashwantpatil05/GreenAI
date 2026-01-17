FROM python:3.11-slim
WORKDIR /code
COPY backend/requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend /code/backend
COPY backend/app/workers/worker.py /code/worker.py
CMD ["python", "worker.py"]

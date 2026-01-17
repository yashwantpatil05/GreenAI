FROM python:3.11-slim
WORKDIR /code
COPY sdk /code/sdk
RUN pip install /code/sdk
CMD ["python", "-c", "import greenai_sdk; print('greenai-sdk ready')"]

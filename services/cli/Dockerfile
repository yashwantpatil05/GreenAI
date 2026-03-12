FROM python:3.11-slim
WORKDIR /code
COPY sdk /code/sdk
RUN pip install /code/sdk
ENTRYPOINT ["greenai-cli"]

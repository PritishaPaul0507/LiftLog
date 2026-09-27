FROM python:3.12-slim

WORKDIR /app

COPY BE/requirements.txt ./BE/requirements.txt

RUN pip install --no-cache-dir -r BE/requirements.txt

COPY BE ./BE

EXPOSE 8001

CMD ["uvicorn", "BE.app.main:app", "--host", "0.0.0.0", "--port", "8001"]
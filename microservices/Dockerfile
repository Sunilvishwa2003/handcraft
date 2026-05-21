FROM python:3.11-slim

WORKDIR /app

COPY microservices/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY microservices /app

ENV PYTHONPATH=/app

CMD ["uvicorn", "api_gateway.app.main:app", "--host", "0.0.0.0", "--port", "8000"]

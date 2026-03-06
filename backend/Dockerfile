FROM python:3.12-slim

# WHY non-root user: security best practice, required by some DO configs
RUN useradd -m appuser

WORKDIR /app

# Install system deps for OCR fallback
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p data/faiss_index data/sample_docs

USER appuser

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000"]
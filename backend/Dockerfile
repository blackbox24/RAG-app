FROM python:3.12-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DEFAULT_TIMEOUT=100

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-eng \
        poppler-utils \
        gcc \
        pkg-config \
        python3-dev \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# WHY upgrade pip first: older pip has worse resolver, causes more conflicts
RUN pip install --upgrade pip

COPY requirements.txt .

# WHY --use-deprecated=legacy-resolver: if pinned versions still conflict,
# the legacy resolver is more lenient and will succeed where the new one loops.
# WHY no-build-isolation: speeds up wheel building for packages like faiss.
RUN pip wheel --no-cache-dir --wheel-dir /app/wheels -r requirements.txt

# Pre-download fastembed model so it's baked into the image
# WHY: avoids ~90MB download on first /ingest request at runtime
RUN pip install --no-cache-dir fastembed==0.4.2 && \
    python -c "from fastembed import TextEmbedding; TextEmbedding('BAAI/bge-small-en-v1.5')"

FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
    
RUN groupadd --system myuser \
    && useradd --system --gid myuser --shell /bin/bash --create-home myuser

WORKDIR /app


COPY --from=builder /app/wheels /app/wheels
COPY --from=builder /app/requirements.txt /app

# Copy pre-downloaded fastembed model cache
COPY --from=builder /root/.cache /root/.cache

RUN pip install --no-cache-dir --no-index --find-links=/app/wheels -r requirements.txt &&\
    rm -rf /app/wheels

COPY . .

RUN mkdir -p data/faiss_index data/sample_docs \
    && chown -R myuser:myuser /app \
    && chown -R myuser:myuser /root/.cache

USER myuser

EXPOSE 9000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000"]
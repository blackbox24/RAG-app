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

RUN pip install --upgrade pip

COPY requirements.txt .

RUN pip wheel --no-cache-dir --wheel-dir /app/wheels -r requirements.txt

# Download fastembed model as root — cache lands in /root/.cache/huggingface
RUN pip install --no-cache-dir fastembed==0.4.2 && \
    python -c "from fastembed import TextEmbedding; TextEmbedding('BAAI/bge-small-en-v1.5')"

# ── Final stage ──────────────────────────────────────────────────────
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

RUN pip install --no-cache-dir --no-index --find-links=/app/wheels -r requirements.txt \
    && rm -rf /app/wheels

# WHY copy to /home/myuser/.cache NOT /root/.cache:
# The app runs as myuser. fastembed looks for cache in the RUNNING user's
# home directory. Copying to /root/.cache is invisible to myuser.
COPY --from=builder /root/.cache/huggingface /home/myuser/.cache/huggingface

COPY . .

RUN mkdir -p data/faiss_index data/sample_docs \
    && chown -R myuser:myuser /app \
    && chown -R myuser:myuser /home/myuser/.cache

USER myuser

# Set HF cache dir explicitly so fastembed never tries to download
ENV HF_HOME=/home/myuser/.cache/huggingface \
    FASTEMBED_CACHE_PATH=/home/myuser/.cache/huggingface

EXPOSE 9000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000"]
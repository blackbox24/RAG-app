FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DEFAULT_TIMEOUT=100 \
    # Tell fastembed and HuggingFace exactly where to store/find the model
    # WHY explicit path: avoids any ambiguity about which user's home is used
    HF_HOME=/app/.cache/huggingface \
    FASTEMBED_CACHE_PATH=/app/.cache/fastembed \
    TRANSFORMERS_CACHE=/app/.cache/huggingface

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-eng \
        poppler-utils \
        gcc \
        pkg-config \
        python3-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# WHY download here AFTER pip install, using the same ENV vars set above:
# The model downloads into /app/.cache/fastembed which is defined by
# FASTEMBED_CACHE_PATH. At runtime the same env var tells fastembed
# to look there — guaranteed cache hit, zero download at startup.
RUN python -c "\
import os; \
from fastembed import TextEmbedding; \
print('Cache path:', os.getenv('FASTEMBED_CACHE_PATH')); \
model = TextEmbedding('BAAI/bge-small-en-v1.5'); \
print('Model loaded successfully'); \
# Trigger actual download by running one embedding \
list(model.embed(['test'])); \
print('Model ready and cached') \
"

COPY . .

RUN mkdir -p data/faiss_index data/sample_docs

EXPOSE 9000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000"]
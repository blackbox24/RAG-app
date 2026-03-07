# ============================================================
# STAGE 1: builder
# WHY multi-stage: the builder installs compilers, headers, and
# build tools (gcc, pkg-config etc.) that are needed to compile
# Python wheels but are NOT needed at runtime.
# The final image copies only the compiled wheels — no compilers,
# no build cache, no APT lists. Result: ~40% smaller image.
# ============================================================
FROM python:3.12-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# WHY these system packages:
# - tesseract-ocr + tesseract-ocr-eng: OCR for scanned contracts
# - poppler-utils: pdf2image needs pdfinfo/pdftoppm binaries
# - gcc + python3-dev: compile C extensions (faiss-cpu, numpy)
# - pkg-config: helps gcc find library headers
# NOTE: default-libmysqlclient-dev removed — not needed for this project.
# Keeping unused build deps bloats the image and increases attack surface.
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

COPY requirements.txt .

# WHY pip wheel: pre-compiles all packages into .whl files.
# The final stage installs from these wheels with --no-index
# (no network needed) — faster, reproducible, and offline-safe.
RUN pip wheel --no-cache-dir --wheel-dir /app/wheels -r requirements.txt

# Pre-download the sentence-transformers embedding model into the image.
# WHY at build time: downloading at runtime adds ~10s cold start to every
# fresh container. Baking it in means instant startup.
# The model is ~90MB and cached in the builder layer.
RUN pip install --no-cache-dir --no-index --find-links=/app/wheels \
        sentence-transformers torch \
    && python -c "from sentence_transformers import SentenceTransformer; \
                  SentenceTransformer('all-MiniLM-L6-v2')"

# ============================================================
# STAGE 2: final runtime image
# Only copies wheels + app code — no compilers, no APT lists.
# ============================================================
FROM python:3.12-slim

# WHY install runtime system libs in final stage too:
# tesseract and poppler are RUNTIME binaries (called by pytesseract
# and pdf2image at request time). They must exist in the final image.
# gcc/pkg-config are NOT needed here — only needed to build wheels.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-eng \
        poppler-utils \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# WHY non-root user: running as root inside a container means a container
# escape gives the attacker root on the host. Non-root limits blast radius.
RUN groupadd --system myuser \
    && useradd --system --gid myuser --shell /bin/bash --create-home myuser

WORKDIR /app

# Copy pre-built wheels and install — no network, no compiler needed
COPY --from=builder /app/wheels /app/wheels
COPY --from=builder /app/requirements.txt .

RUN pip install --no-cache-dir --no-index --find-links=/app/wheels -r requirements.txt \
    && rm -rf /app/wheels

# Copy the cached Hugging Face model from builder
# WHY: avoids re-downloading the 90MB embedding model in the final stage
COPY --from=builder /root/.cache/huggingface /root/.cache/huggingface

COPY . .

# Create data dirs before chown so myuser owns them from the start
# WHY: FAISS index and sample docs are written at runtime by myuser.
# If root owns these dirs, myuser can't write to them → 500 errors.
RUN mkdir -p data/faiss_index data/sample_docs \
    && chown -R myuser:myuser /app \
    && chown -R myuser:myuser /root/.cache/huggingface

USER myuser

# WHY 9000: your choice — just make sure docker-compose.yml and
# DO App spec both map to 9000, not 8000.
EXPOSE 9000

# WHY app.main:app not main:app:
# Your project structure is app/main.py, so uvicorn needs the
# module path app.main. If main.py is at the repo root, use main:app.
# Adjust this to match your actual file layout.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9000"]
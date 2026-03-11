# ⚖️ LexAI — Architecture Deep-Dive

This document explains every architectural decision, data flow, and component interaction in the LexAI system.

---

## System Overview

LexAI is a **Retrieval-Augmented Generation (RAG)** agent purpose-built for legal contract analysis. It combines:

- **Document ingestion** — PDF parsing, section-aware chunking, risky clause detection
- **Semantic retrieval** — FAISS vector search with cosine similarity
- **Grounded generation** — LLM answers constrained to retrieved document excerpts
- **Safe actions** — Lawyer escalation tickets, PII redaction, legal disclaimers

```
User uploads PDF
       │
       ▼
┌─────────────────┐     ┌───────────────────┐     ┌────────────────────┐
│  React Frontend │────▶│  FastAPI Backend   │────▶│  DO Spaces (S3)    │
│  (Vite + TW)    │◀────│  (port 9000)       │     │  (PDF storage)     │
└─────────────────┘     └────────┬──────────┘     └────────────────────┘
                                 │
                    ┌────────────┤
                    ▼            ▼
            ┌──────────┐  ┌──────────────┐
            │ LangGraph │  │ Ingest       │
            │ Agent     │  │ Pipeline     │
            │           │  │              │
            │ retrieve──│  │ PDF→text     │
            │ generate  │  │ chunk        │
            └─────┬────┘  │ embed        │
                  │       │ FAISS.add()  │
                  ▼       └──────────────┘
            ┌──────────┐
            │ FAISS    │
            │ Vector   │◀── shared index
            │ Store    │
            └─────┬────┘
                  │
                  ▼
            ┌──────────────────┐
            │ DO GenAI / LLM   │
            │ llama3-8b-instruct│
            │ via ChatOpenAI   │
            └──────────────────┘
```

---

## Data Flow: Ingestion Pipeline

When a user uploads a PDF, this end-to-end pipeline executes:

```
PDF bytes
  │
  ├─1─▶ Upload to DO Spaces (raw backup via boto3)
  │
  ├─2─▶ Extract text
  │     ├── pdfplumber (text-based PDFs)
  │     └── pytesseract OCR (scanned/image PDFs — fallback)
  │
  ├─3─▶ Detect language (langdetect)
  │
  ├─4─▶ Section-aware chunking
  │     ├── Split on SECTION / CLAUSE / ARTICLE / SCHEDULE patterns
  │     └── If section > chunk_size×2 → sub-split with overlap (100 char)
  │
  ├─5─▶ Risky clause detection (9 regex patterns)
  │     ├── automatic renewal, termination without cause
  │     ├── sole discretion, indemnification, rights waiver
  │     ├── non-compete, unlimited liability
  │     ├── liquidated damages, force majeure
  │     └── Returns list of warning flags
  │
  ├─6─▶ Embed chunks
  │     └── FastEmbed (BAAI/bge-small-en-v1.5), local, 384-dim
  │
  └─7─▶ FAISS IndexFlatIP.add() + save to disk
        └── Metadata stored in parallel pickle file
```

**Key design decisions:**

| Decision | Why |
|----------|-----|
| Section-aware chunking | Legal docs are structured; splitting mid-clause destroys context and causes hallucinations |
| `chunk_size=600` | Legal clauses average 400–800 chars; 600 is the sweet spot |
| `chunk_overlap=100` | Prevents splitting mid-sentence at chunk boundaries |
| OCR fallback | Many African contracts are scanned documents — OCR is essential |
| Local FastEmbed | No API call needed for embeddings = faster, cheaper, offline-capable |

---

## Data Flow: Chat (RAG Query)

When a user asks a question:

```
User question
  │
  ├─1─▶ PII redaction (guardrails.py)
  │     └── Strips IDs, emails, phones, passports, TINs
  │
  ├─2─▶ LangGraph Agent invoked
  │     │
  │     ├── Node 1: RETRIEVE
  │     │   ├── Embed query (same FastEmbed model)
  │     │   ├── FAISS.search(top_k=6, doc_id filter)
  │     │   └── Return ranked chunks with relevance scores
  │     │
  │     └── Node 2: GENERATE
  │         ├── Build prompt (system + style + excerpts + question)
  │         ├── Call ChatOpenAI → DO inference endpoint
  │         ├── Extract top-3 citations with scores
  │         └── Append legal disclaimer
  │
  └─3─▶ Return ChatResponse (answer, citations, risky_flags, disclaimer)
```

**Why LangGraph (not a plain function)?**
- Each node is traced independently — judges see "retrieve took 120ms, returned 6 chunks" in DO console
- Makes the RAG pipeline visible and verifiable
- Easy to extend with more nodes (e.g., re-ranking, multi-hop retrieval)

---

## Component Details

### Backend: FastAPI (`main.py`)

Three main endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /ingest` | Upload PDF | Parse → chunk → embed → FAISS → risky clause scan |
| `POST /chat` | Ask question | PII redaction → LangGraph agent → grounded answer |
| `POST /ticket` | Lawyer request | Create tracked support ticket |
| `GET /health` | Health check | Returns status + version |

Additional features:
- **CORS middleware** — allows frontend access from any origin
- **10MB file size limit** — prevents abuse
- **Global exception handler** — never exposes stack traces to users
- **CLI mode** — `python main.py "prompt"` for quick testing

### Agent: LangGraph (`agent.py`)

| Component | Detail |
|-----------|--------|
| **State** | `AgentState` TypedDict with query, doc_id, mode, chunks, answer, citations |
| **Graph** | `retrieve → generate → END` (two-node linear workflow) |
| **LLM** | `ChatOpenAI` pointed at DO inference (`https://inference.do-ai.run/v1`) |
| **Entry** | `@entrypoint` for Gradient ADK compatibility |
| **Modes** | `plain` (simple English for SMEs) or `formal` (legal terminology) |

### Vector Store: FAISS (`retrieval.py`)

| Property | Value | Reason |
|----------|-------|--------|
| **Index type** | `IndexFlatIP` | Cosine similarity via inner product — better than L2 for text |
| **Dimension** | 384 | BGE-small-en-v1.5 embedding dimension |
| **Normalization** | L2-normalized before add/search | Required for cosine similarity |
| **Persistence** | `index.faiss` + `metadata.pkl` | FAISS is in-memory; we flush to disk |
| **Doc filtering** | Post-retrieval `doc_id` filter | Scopes search to the uploaded document |
| **Over-fetch** | `top_k × 3` → filter → return `top_k` | Ensures enough results after filtering |

### Guardrails (`guardrails.py`)

PII patterns redacted before any data reaches the LLM:

| Pattern | Description | Replacement |
|---------|-------------|-------------|
| `\b\d{9,10}\b` | Ghana Card numbers | `[ID-REDACTED]` |
| `\b[A-Z]{2}\d{6,8}\b` | Passport numbers | `[PASSPORT-REDACTED]` |
| `[\w.+-]+@[\w-]+\.[\w.]+` | Email addresses | `[EMAIL-REDACTED]` |
| `[\d\s\-\(\)]{10,15}` | Phone numbers | `[PHONE-REDACTED]` |
| `(?:GH-\|GHA-)?\d{9}` | Tax ID numbers | `[TAX-ID-REDACTED]` |

Every response appends a legal disclaimer.

### Risky Clause Detection (`ingest.py`)

| Pattern | Flag |
|---------|------|
| `automatic.{0,20}renew` | Automatic renewal clause |
| `terminat.{0,30}without cause` | Termination without cause |
| `sole discretion` | Unilateral decision-making |
| `indemnif` | Indemnification clause |
| `waive.{0,20}right` | Rights waiver |
| `non.?compete` | Non-compete clause |
| `unlimited liability` | Unlimited liability exposure |
| `liquidated damages` | Liquidated damages clause |
| `force majeure` | Force majeure clause |

---

## Frontend Architecture

Built with **React 19 + Vite + Tailwind CSS + Framer Motion**.

### Component Tree

```
App
├── DocumentUpload          (initial state: upload PDF)
│   └── react-dropzone     (drag & drop)
│
├── ChatPanel              (after upload: main workspace)
│   ├── Message list       (animated, user/assistant)
│   │   └── ClauseCard     (cited clause with score bar)
│   ├── Loading indicator  (pulsing dots)
│   └── InputBar           (textarea + suggested prompts)
│
├── Sidebar                (document context metadata)
│   ├── File name
│   ├── Detected language
│   ├── Chunks indexed
│   └── Risk factors
│
└── TicketModal            (lawyer review request form)
    ├── Email input
    ├── Concern textarea
    └── Success confirmation
```

### UI State Flow

```
Upload PDF ──▶ Analyzing... ──▶ Workspace
                                  ├── Chat (ask questions)
                                  ├── Sidebar (metadata)
                                  └── Ticket (lawyer review)
```

---

## Deployment Architecture

### Docker Compose (local dev)

```yaml
services:
  backend:   # Python 3.12 + FastAPI on port 9000
  frontend:  # Node 20 + Vite on port 5173
```

### DigitalOcean App Platform (production)

| Service | Type | URL |
|---------|------|-----|
| Backend | Docker (App) | `lexai-backend-*.ondigitalocean.app` |
| Frontend | Static Site | `lexai-frontend-43cn4.ondigitalocean.app` |

### Docker Build Strategy

Multi-stage build:
1. **Builder stage** — install system deps (tesseract, poppler, gcc), build Python wheels, pre-cache FastEmbed model
2. **Runtime stage** — copy only wheels + cached model, run as non-root user

This avoids a 90MB model download on every container restart.

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| PII in prompts | Regex-based redaction before LLM call |
| Stack trace leaks | Global exception handler returns generic error |
| File size DOS | 10MB upload limit |
| File type validation | PDF-only check on upload |
| Secrets management | `.env` file, never committed (`.gitignore`) |
| non-root container | Docker `USER myuser` directive |
| Legal liability | Disclaimer appended to every response |

---

## Technology Choices Summary

| Choice | Alternatives Considered | Why This One |
|--------|------------------------|--------------|
| FAISS | OpenSearch, Pinecone, Chroma | Free, fast, no external service, hackathon-friendly |
| FastEmbed | Gradient API embeddings | Local = no API cost, offline-capable, faster |
| LangGraph | Plain function chain | Node-level tracing for judges, easy to extend |
| ChatOpenAI (DO) | Direct Gradient SDK | LangChain ecosystem compatibility, proven |
| pdfplumber + pytesseract | PyPDF2, tika | Best text extraction + OCR fallback for scanned docs |
| React + Vite | Next.js, Vue | Lightweight, fast HMR, hackathon speed |
| Tailwind CSS | styled-components, CSS modules | Rapid prototyping, consistent dark theme |
| Framer Motion | CSS animations | Polished transitions with minimal code |

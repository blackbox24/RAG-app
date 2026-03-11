# ⚖️ LexAI — AI Legal Assistant for African SMEs

> **Small business owners across Africa sign contracts they don't fully understand. Lawyers are expensive. LexAI changes that.**

LexAI is a RAG-powered AI agent that reads legal contracts (PDF), identifies risky clauses, answers natural-language questions with cited sources, and lets users escalate concerns to a qualified lawyer — all in one chat interface.

---

## 🚀 Live Demo

| | |
|---|---|
| **URL** | https://lexai-frontend-43cn4.ondigitalocean.app/ |
| **Credentials** | None required — public access |
| **Demo Video** | [Watch on YouTube](#) *(≤ 3 min)* |

---

## ⚡ Quick Start (2 commands)

```bash
cp .env.example .env   # fill in your API keys
docker-compose up       # starts backend + frontend
```

Then open **http://localhost:5173** in your browser.

See [docs/SETUP.md](docs/SETUP.md) for detailed local development instructions.

---

## 📋 Demo Script (for Judges)

1. **Upload** any PDF contract (or use the sample in `data/sample_docs/`)
2. **Ask:** *"Can the landlord terminate without notice?"*
3. **Ask:** *"What are my payment obligations?"*
4. **Ask:** *"Are there any automatic renewals?"*
5. **Click** "Request Lawyer Review" → see a support ticket created instantly

See [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) for the full walkthrough with expected outputs.

---

## 🏗️ Architecture

```
┌────────────────┐       ┌──────────────────────────────────────────┐
│  React + Vite  │──────▶│  FastAPI Backend (port 9000)             │
│  Tailwind CSS  │◀──────│                                          │
│  (port 5173)   │       │  ┌───────────┐   ┌───────────────────┐  │
└────────────────┘       │  │ LangGraph  │──▶│ FAISS Vector Store│  │
                         │  │ Agent      │   │ (local, persisted)│  │
                         │  └─────┬─────┘   └───────────────────┘  │
                         │        │                                  │
                         │        ▼                                  │
                         │  ┌───────────────────────────────────┐   │
                         │  │ DigitalOcean GenAI Platform       │   │
                         │  │ • LLM: llama3-8b-instruct         │   │
                         │  │ • Embeddings: BGE-small-en-v1.5   │   │
                         │  └───────────────────────────────────┘   │
                         │                                          │
                         │  ┌──────────────┐  ┌─────────────────┐  │
                         │  │ DO Spaces    │  │ Guardrails      │  │
                         │  │ (S3 storage) │  │ (PII redaction) │  │
                         │  └──────────────┘  └─────────────────┘  │
                         └──────────────────────────────────────────┘
```

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, Vite, Tailwind CSS, Framer Motion | Chat UI, PDF upload, ticket creation |
| **Backend API** | FastAPI, Pydantic, LangGraph | REST endpoints, agent orchestration |
| **LLM** | DigitalOcean GenAI (llama3-8b-instruct) via LangChain | Answer generation with citations |
| **Embeddings** | FastEmbed (BAAI/bge-small-en-v1.5), local | Chunk & query vectorization |
| **Vector Store** | FAISS (IndexFlatIP, cosine similarity) | Semantic retrieval |
| **Storage** | DigitalOcean Spaces (S3-compatible) | Persistent PDF storage |
| **Deployment** | Docker, Docker Compose, DO App Platform | Container orchestration |
| **CI/CD** | GitHub Actions | Test, lint, build, deploy |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full deep-dive.

---

## ✅ Key Features

| Feature | Description |
|---------|-------------|
| **PDF Ingestion** | Upload any PDF — text extraction with OCR fallback (pdfplumber + pytesseract) |
| **Section-Aware Chunking** | Splits by legal sections (SECTION / CLAUSE / ARTICLE), not arbitrary character limits |
| **Risky Clause Detection** | 9-pattern regex scanner flags auto-renewals, waivers, indemnification, etc. |
| **RAG Chat** | Natural-language Q&A grounded in the uploaded document with inline `[Section X]` citations |
| **Plain / Formal Modes** | Toggle between simple English for SME owners or formal legal analysis |
| **PII Redaction** | Strips ID numbers, emails, phones, passport numbers before sending to LLM |
| **Lawyer Escalation** | One-click "Request Lawyer Review" creates a tracked support ticket |
| **Language Detection** | Auto-detects document language for better prompt context |

---

## 🤖 DigitalOcean GenAI / Gradient AI Integration

| API | Usage | File |
|-----|-------|------|
| **Chat Completions** | `ChatOpenAI` via DO inference endpoint (`llama3-8b-instruct`) | `backend/agent.py` |
| **Embeddings** | FastEmbed `BAAI/bge-small-en-v1.5` (local, compatible with Gradient) | `backend/tools/ingest.py` |
| **Object Storage** | DigitalOcean Spaces for raw PDF persistence via `boto3` | `backend/main.py` |
| **ADK Agent** | `@entrypoint` decorator for Gradient ADK deployment | `backend/agent.py` |

---

## 📂 Project Structure

```
RAG-app/
├── README.md                      # This file
├── LICENSE                        # MIT License
├── .env.example                   # Environment variable template
├── docker-compose.yml             # Full-stack container setup
│
├── backend/
│   ├── main.py                    # FastAPI app + endpoints
│   ├── agent.py                   # LangGraph RAG agent + ADK entrypoint
│   ├── Dockerfile                 # Multi-stage build with OCR support
│   ├── requirements.txt           # Python dependencies
│   ├── pytest.ini                 # Test configuration
│   ├── config/
│   │   └── config.py              # Pydantic Settings (all env vars)
│   ├── models/
│   │   └── schemas.py             # Request/response Pydantic models
│   ├── tools/
│   │   ├── ingest.py              # PDF → text → chunks → embeddings
│   │   ├── retrieval.py           # FAISS vector store + search
│   │   ├── models.py              # Prompt templates + model calls
│   │   ├── functions.py           # Ticket creation + clause flagging
│   │   ├── guardrails.py          # PII redaction + disclaimers
│   │   └── model_list.json        # Available model registry
│   └── tests/
│       └── test_api.py            # API endpoint tests
│
├── frontend/
│   ├── package.json               # React 19 + Vite + Tailwind
│   ├── vite.config.js             # Vite configuration
│   ├── tailwind.config.js         # Custom theme (glass, dark mode)
│   └── src/
│       ├── App.jsx                # Root: upload → workspace routing
│       ├── api/
│       │   └── client.js          # Axios API client
│       └── components/
│           ├── ChatPanel.jsx      # Message list + citations
│           ├── InputBar.jsx       # Input + suggested prompts
│           ├── DocumentUpload.jsx # Drag & drop PDF upload
│           ├── ClauseCard.jsx     # Citation card with score
│           └── TicketModal.jsx    # Lawyer review request form
│
└── docs/
    ├── ARCHITECTURE.md            # System design deep-dive
    ├── DEMO_SCRIPT.md             # Step-by-step judge walkthrough
    ├── SETUP.md                   # Local development guide
    ├── DOCS.md                    # API reference
    └── JOURNEY.md                 # Learning path & resources
```

---

## 🧪 Testing

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

---

## 📜 License

[MIT License](LICENSE) — Copyright (c) 2026 Hope Decardi-Nelson

---

## 👥 Team

| Name | Role |
|------|------|
| Hope Decardi-Nelson | Full-Stack Developer |

---

## 📖 Additional Documentation

- [Architecture Deep-Dive](docs/ARCHITECTURE.md)
- [Demo Script for Judges](docs/DEMO_SCRIPT.md)
- [Local Setup Guide](docs/SETUP.md)
- [API Reference](docs/DOCS.md)
- [Learning Journey](docs/JOURNEY.md)
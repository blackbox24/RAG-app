
# ⚖️ LexAI — API Reference

> Complete reference for all backend API endpoints, request/response schemas, and integration details.

**Base URL (local):** `http://localhost:9000`
**Base URL (production):** `https://lexai-backend-*.ondigitalocean.app`

---

## Endpoints

### `GET /` — Root

Returns a welcome message and link to docs.

**Response:**
```json
{
  "message": "Welcome to the LexAI Support Agent API!",
  "docs": "/docs"
}
```

---

### `GET /health` — Health Check

Returns service status and version.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "service": "LexAI"
}
```

---

### `POST /ingest` — Upload & Analyze Document

Accepts a PDF file, extracts text (with OCR fallback), chunks by legal section, generates embeddings, indexes in FAISS, uploads raw PDF to DO Spaces, and scans for risky clauses.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (PDF, max 10MB)

```bash
curl -X POST http://localhost:9000/ingest \
  -F "file=@contract.pdf"
```

**Response (200):**
```json
{
  "doc_id": "a1b2c3d4",
  "filename": "contract.pdf",
  "chunks_indexed": 24,
  "detected_language": "en",
  "risky_clauses_found": [
    "⚠️ Automatic renewal clause",
    "⚠️ Termination without cause",
    "⚠️ Indemnification clause — review carefully"
  ]
}
```

**Errors:**

| Code | Condition |
|------|-----------|
| 400 | Non-PDF file uploaded |
| 400 | File exceeds 10MB |
| 422 | No text could be extracted |
| 500 | DO Spaces upload failure |

---

### `POST /chat` — Ask a Question

Sends a natural-language question to the LangGraph RAG agent. The agent retrieves relevant document chunks, generates a grounded answer with citations, and appends a legal disclaimer.

**Request:**
```json
{
  "message": "Can the landlord terminate without notice?",
  "session_id": "uuid-session-123",
  "doc_id": "a1b2c3d4",
  "mode": "plain"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | The user's question |
| `session_id` | string | Yes | Session tracking ID |
| `doc_id` | string | No | Scope retrieval to a specific document |
| `mode` | string | No | `"plain"` (default) or `"formal"` |

**Response (200):**
```json
{
  "answer": "Based on your contract, the landlord **can** terminate the agreement under specific conditions outlined in [Section 4]...\n\n⚠️ *This is not legal advice...*",
  "citations": [
    {
      "source": "Section 4",
      "text": "The Landlord may terminate this agreement by providing...",
      "relevance_score": 0.872
    },
    {
      "source": "Section 7",
      "text": "In the event of breach, either party may...",
      "relevance_score": 0.756
    }
  ],
  "risky_flags": [],
  "disclaimer": "This is not legal advice."
}
```

**Response modes:**
- `"plain"` — Simple English for business owners with no legal background. Uses bullet points.
- `"formal"` — Formal legal analysis with precise clause references and legal terminology.

---

### `POST /ticket` — Request Lawyer Review

Creates a tracked support ticket for lawyer escalation.

**Request:**
```json
{
  "user_email": "owner@mybusiness.com",
  "doc_id": "a1b2c3d4",
  "concern": "I'm worried about the automatic renewal clause",
  "flagged_clauses": [
    "⚠️ Automatic renewal clause",
    "⚠️ Termination without cause"
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_email` | email | Yes | Contact email (validated) |
| `doc_id` | string | Yes | Document ID from ingestion |
| `concern` | string | Yes | User's specific concern |
| `flagged_clauses` | string[] | Yes | Risky clauses to include |

**Response (200):**
```json
{
  "ticket_id": "LEX-A1B2C3",
  "status": "created",
  "message": "Your lawyer review request has been submitted. Ticket LEX-A1B2C3 created at 2026-03-11 14:30. A qualified lawyer will contact owner@mybusiness.com within 24 hours."
}
```

---

## Pydantic Schemas

All request/response types are defined in `backend/models/schemas.py`:

| Schema | Usage |
|--------|-------|
| `ChatRequest` | POST /chat request body |
| `ChatResponse` | POST /chat response |
| `CitedClause` | Citation object in ChatResponse |
| `TicketRequest` | POST /ticket request body |
| `TicketResponse` | POST /ticket response |
| `IngestResponse` | POST /ingest response |

---

## Interactive Docs

FastAPI auto-generates interactive API documentation:

| Tool | URL |
|------|-----|
| **Swagger UI** | http://localhost:9000/docs |
| **ReDoc** | http://localhost:9000/redoc |

---

## Error Handling

All unhandled exceptions return a generic 500 response:

```json
{
  "detail": "An internal error occurred. Please try again."
}
```

Stack traces are **never** exposed to the frontend. Errors are printed server-side for debugging.

---

## Frontend API Client

The React frontend uses Axios with a centralized client (`frontend/src/api/client.js`):

```js
import axios from 'axios';
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const api = axios.create({ baseURL: BASE_URL });

export const uploadDocument = async (file) => { /* POST /ingest */ };
export const sendMessage = async ({ message, sessionId, docId }) => { /* POST /chat */ };
export const createTicket = async ({ email, docId, concern, flaggedClauses }) => { /* POST /ticket */ };
```

Set `VITE_API_URL` in the frontend environment to point to your backend.

---

## Configuration

All configuration is managed via environment variables loaded through Pydantic Settings.

See `.env.example` for the full list of required variables.

| Variable | Description | Default |
|----------|-------------|---------|
| `GRADIENT_MODEL_ACCESS_KEY` | DO GenAI API key | (required) |
| `GRADIENT_WORKSPACE_ID` | DO workspace ID | (required) |
| `SPACES_KEY` | DO Spaces access key | (required) |
| `SPACES_SECRET` | DO Spaces secret key | (required) |
| `SPACES_BUCKET` | S3 bucket name | `lexai-docs` |
| `SPACES_REGION` | Spaces region | `nyc3` |
| `SPACES_ENDPOINT` | Spaces endpoint URL | (required) |

### Demo script and judge checklist (≤3 minutes)

1. **0:00–0:20** Problem statement and what the demo shows.  
2. **0:20–1:20** Live demo: ask 2–3 representative questions that show retrieval and source citations.  
3. **1:20–2:00** Trigger function call: “Create a ticket” and show returned mock ticket id.  
4. **2:00–2:30** Show repo README and highlight `ingest_kb.py`, ADK config, and deployment steps.  
5. **2:30–3:00** Explain why this uses Gradient features and how judges can run the demo (hosted URL or credentials).

**Judge checklist to include in README**  

- How to run ingestion.  
- How to start backend and frontend.  
- Hosted demo URL or credentials.  
- Short script of queries used in the demo.  
- Evidence of Gradient features used (code snippets and config).

---

### Learning path for agents, RAG, and function calling (for a Python ML dev)

- **Week 0** Refresh: LLM basics, tokens, prompt engineering, embeddings. Build a tiny script to call an LLM and embeddings API.  
- **Week 1** RAG fundamentals: chunking strategies, embedding models, vector search. Implement `ingest_kb.py` and a simple retrieval + prompt pipeline.  
- **Week 2** Agents and function calling: learn agent pattern (instruction + tools + state). Implement a simple agent that can call `create_ticket` and return structured responses. Use LangChain or ADK examples for patterns.  
- **Week 3** Guardrails and safety: add PII redaction, content moderation, and test cases.  
- **Week 4** Deployment and evaluation: deploy agent endpoint, add tracing, and create evaluation scripts for correctness and hallucination checks.

---

### Risks and mitigations

- **Hallucinations**: show retrieved sources inline and tune prompt to prefer citations.  
- **PII leakage**: redact PII before sending to model and add guardrails.  
- **Judge access**: host a small public demo or provide short‑lived credentials and clear run instructions.  
- **Time**: scope to a single, well‑tested flow for the demo.

---

If you want, I’ll now generate the **complete `ingest_kb.py` file ready to run**, a minimal `app/main.py` FastAPI server, and a short GitHub Actions workflow for CI. Tell me if you prefer the backend to use a **local FAISS** vector store or a **hosted Gradient/OpenSearch** vector store and I’ll produce the exact files and commands accordingly.
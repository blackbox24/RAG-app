# ⚖️ LexAI — AI Legal Assistant for African SMEs
### Complete Build Guide: Backend → Frontend → Database → Deployment

---

## 📁 COMPLETE REPO STRUCTURE

```
lexai/
├── README.md
├── LICENSE                        # MIT
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── .env.example
├── .gitignore
│
├── app/                           # FastAPI backend
│   ├── __init__.py
│   ├── main.py                    # App entry point, routes
│   ├── config.py                  # All env vars and settings
│   ├── models.py                  # Gradient AI model calls
│   ├── retrieval.py               # FAISS vector store + search
│   ├── ingest.py                  # PDF ingestion pipeline
│   ├── functions.py               # Agent actions (tickets, flags)
│   ├── guardrails.py              # PII redaction, disclaimers
│   └── schemas.py                 # Pydantic request/response models
│
├── data/
│   ├── faiss_index/               # Persisted FAISS index (gitignored)
│   └── sample_docs/               # Sample contracts for demo
│
├── frontend/                      # React + Tailwind
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.js
│       ├── App.jsx
│       ├── api/
│       │   └── client.js          # All API calls to FastAPI
│       ├── components/
│       │   ├── ChatPanel.jsx      # Chat messages UI
│       │   ├── InputBar.jsx       # Message input + send
│       │   ├── DocumentUpload.jsx # Drag & drop PDF upload
│       │   ├── ClauseCard.jsx     # Cited clause display
│       │   ├── RiskyBadge.jsx     # Risky clause warning badge
│       │   └── TicketModal.jsx    # Lawyer request modal
│       └── styles/
│           └── index.css
│
├── infra/
│   ├── adk_agent_config.yaml
│   └── do_app_spec.yaml
│
├── tests/
│   ├── test_ingestion.py
│   ├── test_retrieval.py
│   └── test_api.py
│
└── .github/
    └── workflows/
        └── deploy.yml
```

---

## 1. BACKEND — EVERY FILE, FULLY EXPLAINED

---

### `requirements.txt`
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
python-multipart==0.0.9      # WHY: needed for file uploads in FastAPI
pydantic==2.7.1
pydantic-settings==2.2.1

# PDF parsing
pdfplumber==0.11.0           # WHY: best for text-based PDFs, preserves layout
pytesseract==0.3.10          # WHY: fallback OCR for scanned/image PDFs
Pillow==10.3.0               # WHY: pytesseract dependency for image handling

# Vector store
faiss-cpu==1.8.0             # WHY: local vector search, no external service needed
numpy==1.26.4                # WHY: FAISS requires numpy arrays

# Gradient AI
gradientai==1.6.0            # WHY: official Gradient SDK (hackathon sponsor)

# Utilities
python-dotenv==1.0.1
boto3==1.34.0                # WHY: DigitalOcean Spaces uses S3-compatible API
tiktoken==0.7.0              # WHY: count tokens before sending to model
langdetect==1.0.9            # WHY: detect document language for better prompts
```

---

### `app/config.py`
```python
# WHY this file: centralizes ALL configuration.
# Never scatter os.getenv() calls across files — impossible to debug.
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Gradient AI
    gradient_access_token: str
    gradient_workspace_id: str
    gradient_model_slug: str = "llama3-8b-chat"  # use available Gradient model

    # DigitalOcean Spaces (S3-compatible doc storage)
    spaces_key: str
    spaces_secret: str
    spaces_bucket: str = "lexai-docs"
    spaces_region: str = "nyc3"
    spaces_endpoint: str = "https://nyc3.digitaloceanspaces.com"

    # App
    faiss_index_path: str = "./data/faiss_index"
    chunk_size: int = 600       # WHY 600: legal clauses avg ~400-800 chars
    chunk_overlap: int = 100    # WHY overlap: prevents splitting mid-sentence
    top_k: int = 6              # WHY 6: more context = better legal answers
    max_tokens: int = 1024
    environment: str = "development"

    class Config:
        env_file = ".env"

@lru_cache()  # WHY: instantiate settings once, reuse everywhere
def get_settings():
    return Settings()
```

---

### `app/schemas.py`
```python
# WHY Pydantic schemas: validates all incoming data automatically.
# If frontend sends wrong types, FastAPI returns a clear 422 error.
from pydantic import BaseModel, EmailStr
from typing import Optional, List

class ChatRequest(BaseModel):
    message: str
    session_id: str             # WHY: track conversation per user/doc session
    doc_id: Optional[str] = None  # WHY: scope retrieval to uploaded doc

class CitedClause(BaseModel):
    source: str                 # filename + section
    text: str                   # the actual clause text
    relevance_score: float      # WHY: show judges retrieval is working

class ChatResponse(BaseModel):
    answer: str
    citations: List[CitedClause]
    risky_flags: List[str]      # WHY: proactive agent behavior
    disclaimer: str

class TicketRequest(BaseModel):
    user_email: EmailStr
    doc_id: str
    concern: str
    flagged_clauses: List[str]

class TicketResponse(BaseModel):
    ticket_id: str
    status: str
    message: str

class IngestResponse(BaseModel):
    doc_id: str
    chunks_indexed: int
    detected_language: str
    risky_clauses_found: List[str]
```

---

### `app/ingest.py`
```python
# WHY this is its own file: ingestion is a heavy pipeline.
# Keeping it separate means you can run it as a script OR call it from the API.

import uuid
import re
from pathlib import Path
from typing import List, Tuple
import pdfplumber
import pytesseract
from PIL import Image
import numpy as np
from langdetect import detect
from gradientai import Gradient

from app.config import get_settings
from app.retrieval import VectorStore

settings = get_settings()

# WHY section-aware chunking vs character chunking:
# Legal docs are structured. "Section 4.2 Termination" is one complete thought.
# Splitting mid-clause destroys context and produces hallucinations.
SECTION_PATTERN = re.compile(
    r'(?=\n(?:SECTION|CLAUSE|ARTICLE|SCHEDULE|\d+\.|[A-Z]{2,})\s)',
    re.MULTILINE
)

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Try pdfplumber first (clean text PDFs).
    Fall back to pytesseract OCR (scanned/image PDFs).
    WHY: Many African contracts are scanned — OCR fallback is essential.
    """
    try:
        import io
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            text = "\n\n".join(
                page.extract_text() or "" for page in pdf.pages
            )
        if len(text.strip()) < 100:
            raise ValueError("Insufficient text, trying OCR")
        return text
    except Exception:
        # Fallback: OCR with pytesseract
        import io
        from pdf2image import convert_from_bytes
        images = convert_from_bytes(file_bytes)
        return "\n\n".join(
            pytesseract.image_to_string(img) for img in images
        )

def chunk_by_section(text: str, doc_id: str) -> List[dict]:
    """
    Split by legal sections first, then by size if section is too large.
    WHY: Preserves legal structure. Smaller chunks = more precise retrieval.
    """
    sections = SECTION_PATTERN.split(text)
    chunks = []
    for i, section in enumerate(sections):
        section = section.strip()
        if not section:
            continue
        if len(section) <= settings.chunk_size * 2:
            chunks.append({
                "id": f"{doc_id}::section{i}",
                "text": section,
                "metadata": {
                    "doc_id": doc_id,
                    "section_index": i,
                    "source": f"Section {i+1}"
                }
            })
        else:
            # Large section: split with overlap
            for j in range(0, len(section), settings.chunk_size - settings.chunk_overlap):
                chunk_text = section[j:j + settings.chunk_size]
                chunks.append({
                    "id": f"{doc_id}::section{i}::chunk{j}",
                    "text": chunk_text,
                    "metadata": {
                        "doc_id": doc_id,
                        "section_index": i,
                        "source": f"Section {i+1}, Part {j//settings.chunk_size + 1}"
                    }
                })
    return chunks

RISKY_PATTERNS = [
    (r"automatic.{0,20}renew", "Automatic renewal clause detected"),
    (r"terminat.{0,30}without cause", "Termination without cause"),
    (r"sole discretion", "Unilateral decision-making clause"),
    (r"indemnif", "Indemnification clause — review carefully"),
    (r"waive.{0,20}right", "Rights waiver detected"),
    (r"non.?compete", "Non-compete clause"),
    (r"unlimited liability", "Unlimited liability exposure"),
]

def detect_risky_clauses(chunks: List[dict]) -> List[str]:
    """
    WHY proactive detection: judges need to see the agent doing something
    beyond Q&A. This is the 'agentic' behavior that scores points.
    """
    flags = []
    for chunk in chunks:
        text_lower = chunk["text"].lower()
        for pattern, label in RISKY_PATTERNS:
            if re.search(pattern, text_lower):
                if label not in flags:
                    flags.append(label)
    return flags

def embed_chunks(chunks: List[dict]) -> List[np.ndarray]:
    """
    Use Gradient AI embeddings.
    WHY Gradient: hackathon sponsor, earns judging points.
    WHY batch: reduces API calls, faster ingestion.
    """
    with Gradient(access_token=settings.gradient_access_token) as gradient:
        model = gradient.get_embeddings_model(slug="bge-large")
        texts = [c["text"] for c in chunks]
        # Batch in groups of 32 to avoid rate limits
        embeddings = []
        for i in range(0, len(texts), 32):
            batch = texts[i:i+32]
            result = model.embed(inputs=[{"input": t} for t in batch])
            embeddings.extend([e.embedding for e in result.embeddings])
    return [np.array(e, dtype=np.float32) for e in embeddings]

def ingest_document(file_bytes: bytes, filename: str) -> dict:
    doc_id = str(uuid.uuid4())[:8]
    text = extract_text_from_pdf(file_bytes)
    language = detect(text)
    chunks = chunk_by_section(text, doc_id)
    risky_flags = detect_risky_clauses(chunks)
    embeddings = embed_chunks(chunks)
    store = VectorStore()
    store.add(chunks, embeddings)
    store.save()
    return {
        "doc_id": doc_id,
        "chunks_indexed": len(chunks),
        "detected_language": language,
        "risky_clauses_found": risky_flags
    }
```

---

### `app/retrieval.py`
```python
# WHY FAISS: fast, free, no external service.
# WHY save/load: FAISS lives in memory — if container restarts, index is lost.
# We persist to disk and reload on startup.

import faiss
import numpy as np
import pickle
from pathlib import Path
from typing import List, Tuple, Optional
from gradientai import Gradient

from app.config import get_settings

settings = get_settings()

class VectorStore:
    def __init__(self):
        self.index_path = Path(settings.faiss_index_path)
        self.index_path.mkdir(parents=True, exist_ok=True)
        self.faiss_file = self.index_path / "index.faiss"
        self.meta_file = self.index_path / "metadata.pkl"
        self.dimension = 1024  # BGE-large embedding dimension
        self._load()

    def _load(self):
        if self.faiss_file.exists() and self.meta_file.exists():
            self.index = faiss.read_index(str(self.faiss_file))
            with open(self.meta_file, "rb") as f:
                self.metadata = pickle.load(f)
        else:
            # WHY IndexFlatIP: cosine similarity via inner product.
            # Better than L2 for text embeddings — measures angle, not distance.
            self.index = faiss.IndexFlatIP(self.dimension)
            self.metadata = []  # parallel list to FAISS index

    def save(self):
        faiss.write_index(self.index, str(self.faiss_file))
        with open(self.meta_file, "wb") as f:
            pickle.dump(self.metadata, f)

    def add(self, chunks: List[dict], embeddings: List[np.ndarray]):
        matrix = np.vstack(embeddings)
        # WHY normalize: required for cosine similarity with IndexFlatIP
        faiss.normalize_L2(matrix)
        self.index.add(matrix)
        self.metadata.extend(chunks)

    def search(self, query_embedding: np.ndarray, top_k: int = 6,
               doc_id: Optional[str] = None) -> List[dict]:
        query = query_embedding.reshape(1, -1).astype(np.float32)
        faiss.normalize_L2(query)
        scores, indices = self.index.search(query, top_k * 3)  # fetch more, filter after

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:
                continue
            chunk = self.metadata[idx]
            # WHY doc_id filter: scope search to the uploaded document
            if doc_id and chunk["metadata"]["doc_id"] != doc_id:
                continue
            results.append({
                **chunk,
                "relevance_score": float(score)
            })
            if len(results) == top_k:
                break
        return results

def embed_query(query: str) -> np.ndarray:
    with Gradient(access_token=get_settings().gradient_access_token) as gradient:
        model = gradient.get_embeddings_model(slug="bge-large")
        result = model.embed(inputs=[{"input": query}])
        return np.array(result.embeddings[0].embedding, dtype=np.float32)
```

---

### `app/models.py`
```python
# WHY separate models.py: prompt engineering is its own discipline.
# Keeping prompts here means you can tune them without touching business logic.

from gradientai import Gradient
from typing import List
from app.config import get_settings
from app.retrieval import VectorStore, embed_query

settings = get_settings()

SYSTEM_PROMPT = """You are LexAI, a legal document assistant helping small business 
owners in Africa understand their contracts. You have deep knowledge of common legal 
clauses but always speak in plain, clear language.

Rules:
1. ONLY answer using the provided document excerpts. Never invent information.
2. ALWAYS cite which section/clause your answer comes from.
3. If a clause is risky or one-sided, say so clearly and plainly.
4. If you cannot find the answer in the provided excerpts, say so honestly.
5. End every answer with a disclaimer about seeking qualified legal advice.
6. Keep answers concise but complete."""

PLAIN_ENGLISH_INSTRUCTION = """
Explain this as if speaking to a small business owner with no legal background.
Use simple words. Avoid jargon. Use bullet points for complex clauses."""

FORMAL_INSTRUCTION = """
Provide a formal legal analysis with precise reference to clause numbers and 
standard legal terminology."""

def build_prompt(query: str, contexts: List[dict], mode: str = "plain") -> str:
    """
    WHY structured prompt: legal answers need to be grounded.
    We explicitly list sources so the model knows exactly what to cite.
    """
    ctx_text = "\n\n---\n\n".join([
        f"[{c['metadata']['source']}]\n{c['text']}"
        for c in contexts
    ])
    style = PLAIN_ENGLISH_INSTRUCTION if mode == "plain" else FORMAL_INSTRUCTION
    return f"""{SYSTEM_PROMPT}

{style}

DOCUMENT EXCERPTS:
{ctx_text}

USER QUESTION: {query}

ANSWER (cite sources using [Section X] format):"""

def answer_query(query: str, session_id: str, doc_id: str = None,
                 mode: str = "plain") -> dict:
    store = VectorStore()
    query_emb = embed_query(query)
    hits = store.search(query_emb, top_k=settings.top_k, doc_id=doc_id)

    if not hits:
        return {
            "answer": "I couldn't find relevant clauses in your document for that question.",
            "citations": [],
            "risky_flags": []
        }

    prompt = build_prompt(query, hits, mode)

    with Gradient(access_token=settings.gradient_access_token) as gradient:
        model = gradient.get_base_model(model_slug=settings.gradient_model_slug)
        result = model.complete(
            query=prompt,
            max_generated_token_count=settings.max_tokens
        )
    answer_text = result.generated_output

    citations = [{
        "source": h["metadata"]["source"],
        "text": h["text"][:300],  # truncate for UI
        "relevance_score": h["relevance_score"]
    } for h in hits[:3]]  # top 3 citations

    return {
        "answer": answer_text,
        "citations": citations,
        "risky_flags": []
    }
```

---

### `app/guardrails.py`
```python
# WHY guardrails: legal docs contain PII (names, ID numbers, addresses).
# Sending raw PII to an external model is a GDPR/data risk.
# Shows judges you understand responsible AI deployment.

import re

PII_PATTERNS = [
    (r'\b\d{9,10}\b', '[ID-REDACTED]'),                      # Ghana Card numbers
    (r'\b[A-Z]{2}\d{6,8}\b', '[PASSPORT-REDACTED]'),         # Passport numbers
    (r'\b[\w.+-]+@[\w-]+\.[\w.]+\b', '[EMAIL-REDACTED]'),    # Emails
    (r'\+?[\d\s\-\(\)]{10,15}', '[PHONE-REDACTED]'),         # Phone numbers
    (r'\b(?:GH-|GHA-)?\d{9}\b', '[TAX-ID-REDACTED]'),        # Ghana TIN
]

DISCLAIMER = (
    "\n\n⚠️ *This is not legal advice. LexAI provides information only. "
    "Please consult a qualified lawyer before making decisions based on this analysis.*"
)

def redact_pii(text: str) -> str:
    for pattern, replacement in PII_PATTERNS:
        text = re.sub(pattern, replacement, text)
    return text

def add_disclaimer(text: str) -> str:
    return text + DISCLAIMER
```

---

### `app/functions.py`
```python
# WHY function stubs: the hackathon requires demonstrable agent actions.
# In production these would call real APIs (Zendesk, Freshdesk, email).
# For the demo, mock responses are fine — judges just need to see the flow.

import uuid
from datetime import datetime
from app.schemas import TicketRequest, TicketResponse

def create_lawyer_request(request: TicketRequest) -> TicketResponse:
    """
    Creates a lawyer review request ticket.
    WHY this action: shows the agent doing something safe and real-world useful.
    A small business owner found a risky clause → one click to get a lawyer.
    """
    ticket_id = f"LEX-{str(uuid.uuid4())[:6].upper()}"
    # In production: POST to Zendesk/Freshdesk/email API
    return TicketResponse(
        ticket_id=ticket_id,
        status="created",
        message=(
            f"Your lawyer review request has been submitted. "
            f"Ticket {ticket_id} created at {datetime.now().strftime('%Y-%m-%d %H:%M')}. "
            f"A qualified lawyer will contact {request.user_email} within 24 hours."
        )
    )

def flag_clause(clause_text: str, reason: str) -> dict:
    """Marks a clause for human review."""
    return {
        "flagged": True,
        "clause_preview": clause_text[:200],
        "reason": reason,
        "flag_id": f"FLAG-{str(uuid.uuid4())[:6].upper()}"
    }
```

---

### `app/main.py`
```python
# WHY FastAPI: async-first, auto-generates OpenAPI docs at /docs,
# excellent performance, and Pydantic integration is seamless.

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import boto3
from botocore.exceptions import ClientError

from app.config import get_settings, Settings
from app.schemas import (
    ChatRequest, ChatResponse, TicketRequest,
    TicketResponse, IngestResponse
)
from app.models import answer_query
from app.ingest import ingest_document
from app.guardrails import redact_pii, add_disclaimer
from app.functions import create_lawyer_request

app = FastAPI(
    title="LexAI API",
    description="AI Legal Document Assistant for African SMEs",
    version="1.0.0"
)

# WHY CORS: React frontend runs on a different port during development.
# Without this, browsers block all requests from frontend to backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    """WHY: judges and DO health checks ping this to verify the service is up."""
    return {"status": "ok", "version": "1.0.0", "service": "LexAI"}

@app.post("/ingest", response_model=IngestResponse)
async def ingest(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings)
):
    """
    Upload a contract PDF. Pipeline:
    1. Upload raw file to DO Spaces (persistent storage)
    2. Extract text (pdfplumber → pytesseract fallback)
    3. Chunk by section, embed, store in FAISS
    4. Proactively detect risky clauses
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(400, "File too large. Maximum size is 10MB")

    # Upload to DO Spaces for persistent storage
    try:
        s3 = boto3.client(
            "s3",
            endpoint_url=settings.spaces_endpoint,
            aws_access_key_id=settings.spaces_key,
            aws_secret_access_key=settings.spaces_secret,
            region_name=settings.spaces_region
        )
        s3.put_object(
            Bucket=settings.spaces_bucket,
            Key=f"contracts/{file.filename}",
            Body=file_bytes,
            ACL="private"  # WHY private: contracts are sensitive documents
        )
    except ClientError as e:
        # Don't fail ingestion if Spaces upload fails — continue with local FAISS
        print(f"Spaces upload warning: {e}")

    result = ingest_document(file_bytes, file.filename)
    return IngestResponse(**result)

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint.
    1. Redact PII from query before sending to model
    2. Retrieve relevant clauses from FAISS
    3. Generate answer with Gradient AI
    4. Add legal disclaimer
    """
    clean_query = redact_pii(request.message)
    result = answer_query(
        query=clean_query,
        session_id=request.session_id,
        doc_id=request.doc_id
    )
    answer_with_disclaimer = add_disclaimer(result["answer"])
    return ChatResponse(
        answer=answer_with_disclaimer,
        citations=result["citations"],
        risky_flags=result["risky_flags"],
        disclaimer="This is not legal advice."
    )

@app.post("/ticket", response_model=TicketResponse)
async def create_ticket(request: TicketRequest):
    """
    Creates a lawyer review request.
    WHY separate endpoint: in production this calls external APIs.
    Separating it means you can upgrade without touching chat logic.
    """
    return create_lawyer_request(request)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """WHY: never expose stack traces to frontend in production."""
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again."}
    )
```

---

## 2. FRONTEND — React + Tailwind CSS

---

### `frontend/package.json`
```json
{
  "name": "lexai-frontend",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-dropzone": "^14.2.3",
    "react-markdown": "^9.0.1",
    "uuid": "^9.0.0",
    "axios": "^1.6.8"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "vite": "^5.2.10"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

---

### `frontend/src/api/client.js`
```javascript
// WHY centralise API calls: if the backend URL changes,
// you update ONE file, not 10 components.
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: BASE_URL });

export const uploadDocument = async (file) => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/ingest', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data; // { doc_id, chunks_indexed, risky_clauses_found }
};

export const sendMessage = async ({ message, sessionId, docId }) => {
  const { data } = await api.post('/chat', {
    message,
    session_id: sessionId,
    doc_id: docId
  });
  return data; // { answer, citations, risky_flags }
};

export const createTicket = async ({ email, docId, concern, flaggedClauses }) => {
  const { data } = await api.post('/ticket', {
    user_email: email,
    doc_id: docId,
    concern,
    flagged_clauses: flaggedClauses
  });
  return data;
};
```

---

### `frontend/src/App.jsx`
```jsx
// WHY App.jsx is the state hub: keeps doc state and chat history
// in one place so all child components stay in sync.
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import DocumentUpload from './components/DocumentUpload';
import ChatPanel from './components/ChatPanel';
import TicketModal from './components/TicketModal';

const SESSION_ID = uuidv4(); // one session per browser load

export default function App() {
  const [doc, setDoc] = useState(null);       // { doc_id, filename, risky_clauses_found }
  const [messages, setMessages] = useState([]);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDocUploaded = (result, filename) => {
    setDoc({ ...result, filename });
    setMessages([{
      role: 'assistant',
      content: `✅ **${filename}** uploaded and analysed.\n\n` +
        (result.risky_clauses_found.length
          ? `⚠️ **${result.risky_clauses_found.length} potential issues found:**\n` +
            result.risky_clauses_found.map(f => `• ${f}`).join('\n')
          : '✅ No obvious risky clauses detected on initial scan.') +
        `\n\nAsk me anything about this contract.`,
      citations: []
    }]);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚖️</span>
          <div>
            <h1 className="text-xl font-bold text-white">LexAI</h1>
            <p className="text-xs text-gray-400">Legal Document Assistant for African SMEs</p>
          </div>
        </div>
        {doc && (
          <button
            onClick={() => setTicketOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            🚨 Request Lawyer Review
          </button>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 flex overflow-hidden">
        {!doc ? (
          <div className="flex-1 flex items-center justify-center">
            <DocumentUpload onUploaded={handleDocUploaded} />
          </div>
        ) : (
          <ChatPanel
            doc={doc}
            messages={messages}
            setMessages={setMessages}
            sessionId={SESSION_ID}
            loading={loading}
            setLoading={setLoading}
          />
        )}
      </main>

      {ticketOpen && (
        <TicketModal
          doc={doc}
          onClose={() => setTicketOpen(false)}
        />
      )}
    </div>
  );
}
```

---

### `frontend/src/components/DocumentUpload.jsx`
```jsx
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadDocument } from '../api/client';

export default function DocumentUpload({ onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const onDrop = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadDocument(file);
      onUploaded(result, file.name);
    } catch (e) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [onUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1
  });

  return (
    <div className="max-w-lg w-full mx-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Understand Your Contract</h2>
        <p className="text-gray-400">Upload any contract or legal document. Ask questions in plain English.</p>
      </div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition
          ${isDragActive ? 'border-blue-500 bg-blue-950' : 'border-gray-600 hover:border-gray-400'}`}
      >
        <input {...getInputProps()} />
        <div className="text-5xl mb-4">{uploading ? '⏳' : '📄'}</div>
        <p className="text-lg font-medium">
          {uploading ? 'Analysing document...' :
           isDragActive ? 'Drop your contract here' :
           'Drag & drop your PDF contract'}
        </p>
        <p className="text-sm text-gray-500 mt-2">or click to browse • PDF only • max 10MB</p>
      </div>
      {error && <p className="text-red-400 text-center mt-4">{error}</p>}
    </div>
  );
}
```

---

### `frontend/src/components/ChatPanel.jsx`
```jsx
import { useEffect, useRef } from 'react';
import { sendMessage } from '../api/client';
import ClauseCard from './ClauseCard';
import InputBar from './InputBar';
import ReactMarkdown from 'react-markdown';

export default function ChatPanel({ doc, messages, setMessages, sessionId, loading, setLoading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const data = await sendMessage({ message: text, sessionId, docId: doc.doc_id });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        risky_flags: data.risky_flags
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Something went wrong. Please try again.',
        citations: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl rounded-2xl px-5 py-4 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-100'
            }`}>
              <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                {msg.content}
              </ReactMarkdown>
              {msg.citations?.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                    Sources
                  </p>
                  {msg.citations.map((c, j) => <ClauseCard key={j} citation={c} />)}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl px-5 py-4">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <InputBar onSend={handleSend} disabled={loading} />
    </div>
  );
}
```

---

### `frontend/src/components/InputBar.jsx`
```jsx
import { useState } from 'react';

const SUGGESTED = [
  "Can they terminate without notice?",
  "What are my payment obligations?",
  "Are there any automatic renewals?",
  "What happens if I break this contract?"
];

export default function InputBar({ onSend, disabled }) {
  const [val, setVal] = useState('');

  const submit = () => {
    if (!val.trim() || disabled) return;
    onSend(val.trim());
    setVal('');
  };

  return (
    <div className="border-t border-gray-800 p-4">
      <div className="flex flex-wrap gap-2 mb-3">
        {SUGGESTED.map((s, i) => (
          <button key={i} onClick={() => onSend(s)} disabled={disabled}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-full transition">
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <input
          className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask about your contract..."
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
        <button onClick={submit} disabled={disabled || !val.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-5 rounded-xl transition font-medium">
          Send
        </button>
      </div>
    </div>
  );
}
```

---

### `frontend/src/components/ClauseCard.jsx`
```jsx
// WHY this component: makes citations VISIBLE.
// This is what proves to judges that RAG is actually working.
export default function ClauseCard({ citation }) {
  return (
    <div className="bg-gray-700 rounded-lg p-3 border-l-4 border-blue-500">
      <p className="text-xs font-semibold text-blue-400 mb-1">{citation.source}</p>
      <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">{citation.text}</p>
      <p className="text-xs text-gray-500 mt-1">
        Relevance: {(citation.relevance_score * 100).toFixed(0)}%
      </p>
    </div>
  );
}
```

---

### `frontend/src/components/TicketModal.jsx`
```jsx
import { useState } from 'react';
import { createTicket } from '../api/client';

export default function TicketModal({ doc, onClose }) {
  const [email, setEmail] = useState('');
  const [concern, setConcern] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    const data = await createTicket({
      email, docId: doc.doc_id, concern,
      flaggedClauses: doc.risky_clauses_found || []
    });
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">🚨 Request Lawyer Review</h2>
        {result ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-green-400 font-semibold">{result.ticket_id}</p>
            <p className="text-gray-300 text-sm mt-2">{result.message}</p>
            <button onClick={onClose} className="mt-4 bg-gray-700 text-white px-6 py-2 rounded-lg">
              Close
            </button>
          </div>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-4">
              A qualified lawyer will review your contract and contact you within 24 hours.
            </p>
            <input className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 mb-3 outline-none"
              placeholder="Your email address" value={email}
              onChange={e => setEmail(e.target.value)} />
            <textarea className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 mb-4 outline-none h-24 resize-none"
              placeholder="What's your main concern?" value={concern}
              onChange={e => setConcern(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 bg-gray-700 text-white py-2 rounded-lg">Cancel</button>
              <button onClick={submit} disabled={!email || !concern || loading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white py-2 rounded-lg transition">
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## 3. DATABASE & STORAGE ARCHITECTURE

| What | Where | Why |
|---|---|---|
| Vector embeddings + metadata | FAISS on disk (`/data/faiss_index/`) | Free, fast, no external service |
| Raw contract PDFs | DigitalOcean Spaces | Persistent across container restarts |
| Session/conversation state | React state (frontend) | No DB needed for hackathon scope |
| Ticket records | In-memory / mock | Real impl would use Postgres on DO |

**Why no Postgres for the hackathon:** You have 6 days. Every extra service is a liability. FAISS + Spaces covers 100% of judging requirements. Add Postgres in v2.

---

## 4. DOCKER & LOCAL SETUP

### `Dockerfile`
```dockerfile
FROM python:3.11-slim

# WHY non-root user: security best practice, required by some DO configs
RUN useradd -m appuser

WORKDIR /app

# Install system deps for OCR fallback
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p data/faiss_index data/sample_docs

USER appuser

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### `docker-compose.yml`
```yaml
# WHY docker-compose: run both frontend and backend with ONE command.
# Perfect for local dev and for judges running your repo.
version: '3.9'
services:
  backend:
    build: .
    ports:
      - "8000:8000"
    env_file: .env
    volumes:
      - ./data:/app/data   # WHY volume: FAISS index persists between restarts
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./frontend:/app
    ports:
      - "5173:5173"
    command: sh -c "npm install && npm run dev -- --host"
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - backend
```

### `.env.example`
```bash
GRADIENT_ACCESS_TOKEN=your_token_here
GRADIENT_WORKSPACE_ID=your_workspace_id
GRADIENT_MODEL_SLUG=llama3-8b-chat
SPACES_KEY=your_spaces_key
SPACES_SECRET=your_spaces_secret
SPACES_BUCKET=lexai-docs
SPACES_REGION=nyc3
```

---

## 5. DIGITALOCEAN DEPLOYMENT — EVERY STEP

### Step 1: Create DO Spaces bucket
```bash
# In DO dashboard: Spaces → Create Space
# Name: lexai-docs
# Region: nyc3
# WHY nyc3: lowest latency for your App Platform app if deployed in nyc3
# Enable CDN: YES — WHY: faster doc downloads during judging demo
```

### Step 2: DO App Platform setup
```yaml
# infra/do_app_spec.yaml
# WHY App Platform: auto-deploys from GitHub, handles HTTPS, scales automatically
name: lexai
region: nyc
services:
  - name: api
    source_dir: /
    github:
      repo: your-username/lexai
      branch: main
      deploy_on_push: true   # WHY: every push auto-deploys = CI/CD for free
    dockerfile_path: Dockerfile
    instance_size_slug: basic-xs   # $5/mo — enough for hackathon
    instance_count: 1
    http_port: 8000
    health_check:
      http_path: /health
    envs:
      - key: GRADIENT_ACCESS_TOKEN
        value: "${GRADIENT_ACCESS_TOKEN}"
        type: SECRET           # WHY SECRET: never stored in plaintext
      - key: GRADIENT_WORKSPACE_ID
        value: "${GRADIENT_WORKSPACE_ID}"
        type: SECRET
      - key: SPACES_KEY
        value: "${SPACES_KEY}"
        type: SECRET
      - key: SPACES_SECRET
        value: "${SPACES_SECRET}"
        type: SECRET
      - key: SPACES_BUCKET
        value: "lexai-docs"
      - key: ENVIRONMENT
        value: "production"

  - name: frontend
    source_dir: /frontend
    github:
      repo: your-username/lexai
      branch: main
      deploy_on_push: true
    build_command: npm install && npm run build
    output_dir: dist
    instance_size_slug: static   # Free static hosting on DO
    envs:
      - key: VITE_API_URL
        value: "${api.PUBLIC_URL}"  # DO injects this automatically
```

### Step 3: GitHub Actions CI/CD
```yaml
# .github/workflows/deploy.yml
name: Test and Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -r requirements.txt
      - run: pytest tests/ -v
        env:
          GRADIENT_ACCESS_TOKEN: ${{ secrets.GRADIENT_ACCESS_TOKEN }}
          GRADIENT_WORKSPACE_ID: ${{ secrets.GRADIENT_WORKSPACE_ID }}

  deploy:
    needs: test   # WHY: never deploy if tests fail
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DO_API_TOKEN }}
      - name: Deploy to App Platform
        run: doctl apps create --spec infra/do_app_spec.yaml --wait
        # WHY --wait: confirms deployment succeeded before pipeline exits
```

---

## 6. TESTS

### `tests/test_api.py`
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_chat_no_doc():
    r = client.post("/chat", json={
        "message": "What are my termination rights?",
        "session_id": "test-123"
    })
    assert r.status_code == 200
    assert "answer" in r.json()

def test_ticket_creation():
    r = client.post("/ticket", json={
        "user_email": "test@example.com",
        "doc_id": "abc123",
        "concern": "Risky termination clause",
        "flagged_clauses": ["Termination without cause"]
    })
    assert r.status_code == 200
    assert "ticket_id" in r.json()
    assert r.json()["ticket_id"].startswith("LEX-")
```

---

## 7. README (Judge-Optimised)

```markdown
# ⚖️ LexAI — AI Legal Assistant for African SMEs

> Small business owners across Africa sign contracts they don't understand. 
> Lawyers are expensive. LexAI changes that.

## 🚀 Live Demo
**URL:** https://lexai-xxxxx.ondigitalocean.app
**Demo credentials:** (none required — public)

## ⚡ Run Locally (2 commands)
cp .env.example .env   # fill in your keys
docker-compose up

## 📋 Demo Query Script (for judges)
Upload: sample_docs/ghana_lease_agreement.pdf
Ask: "Can the landlord terminate without notice?"
Ask: "What are my payment obligations?"
Ask: "Are there any automatic renewals?"
Action: Click "Request Lawyer Review" → see ticket created

## 🏗️ Architecture
- Backend: FastAPI + Gradient AI (llama3-8b-chat) + FAISS
- Embeddings: Gradient AI BGE-large
- Storage: DigitalOcean Spaces
- Frontend: React + Tailwind CSS
- Deployment: DigitalOcean App Platform + GitHub Actions

## ✅ Gradient AI Features Used
- Text generation: gradient.get_base_model().complete()
- Embeddings: gradient.get_embeddings_model("bge-large").embed()
- See: app/models.py, app/ingest.py
```

---

## 8. WINNING EDGE CHECKLIST

- [ ] Gradient AI for BOTH generation AND embeddings (double sponsor points)
- [ ] DigitalOcean Spaces for storage
- [ ] DigitalOcean App Platform for hosting
- [ ] DigitalOcean Functions for serverless ticket creation
- [ ] GitHub Actions deploys automatically on push
- [ ] Live public URL in README
- [ ] `/health` endpoint works
- [ ] Proactive risky clause detection (agentic behavior)
- [ ] Citations visible in UI (proves RAG is real)
- [ ] PII redaction (shows responsible AI maturity)
- [ ] Legal disclaimer on every answer (shows safety awareness)
- [ ] Demo video ≤ 3 minutes, follows judge script exactly
- [ ] OSI license (MIT) in repo root
- [ ] OCR fallback for scanned contracts (real-world robustness)

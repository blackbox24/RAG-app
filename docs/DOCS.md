
# RAG‑Powered Customer Support Agent  

**Goal:** Build a chat interface that answers product/support questions by retrieving and citing relevant documentation, and that can perform one safe action (create a support ticket). Deliverables: **public repo with OSI license**, working demo (hosted or credentials), and a ≤3 minute demo video.

---

## Architecture and components

- **Frontend**: Minimal chat UI (React) or simple CLI for quick demo.  
- **Backend API**: FastAPI service that accepts queries, calls the retrieval pipeline, composes prompts, calls the model, and executes safe function calls.  
- **Knowledge base**: Document ingestion pipeline that chunks docs, creates embeddings, and upserts to a vector store.  
- **Model layer**: Gradient/ADK model endpoint or compatible LLM SDK for generation and function calling.  
- **Function stubs**: Safe serverless functions (create_ticket, lookup_order) implemented as local stubs or DigitalOcean Functions.  
- **Storage**: DigitalOcean Spaces (or S3‑compatible) for raw docs; vector index hosted by Gradient or a lightweight OpenSearch/FAISS for local dev.  
- **Deployment**: Docker for services; GitHub Actions for CI; ADK/Gradient CLI for agent deployment or DigitalOcean Apps/Functions for hosting.

---

## Repo layout and required files

```markdown
README.md
LICENSE (OSI approved)
demo.mp4
Dockerfile
docker-compose.yml
requirements.txt
app/
  main.py                # FastAPI app
  models.py              # model wrapper & prompt templates
  functions.py           # function handlers (create_ticket stub)
  retrieval.py           # vectorstore client & search
  ingest_kb.py           # ingestion script
frontend/                # optional minimal React app
infra/
  adk_agent_config.yaml  # ADK/agent config example
  do_app_spec.yaml       # DigitalOcean App spec (optional)
tests/
  integration_tests.py
```

---

### Minimal commands and exact steps to get running locally

1. **Clone and install**

```bash
git clone <your-repo>
cd your-repo
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

```

2.**Run ingestion (local vector store or remote)**

```bash
python app/ingest_kb.py --docs ./sample_docs --index local
```

3.**Start backend**

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

4.**Open frontend** (if included)

```bash
cd frontend
npm install
npm start
```

---

### Starter code snippets

#### ingest_kb.py

```python
# app/ingest_kb.py
import os
import json
from pathlib import Path
from typing import List
from gradient_sdk import EmbeddingsClient, VectorStoreClient  # conceptual

CHUNK_SIZE = 800

def load_docs(folder: str) -> List[dict]:
    docs = []
    for p in Path(folder).glob("**/*.md"):
        docs.append({"id": str(p), "text": p.read_text(encoding="utf-8")})
    return docs

def chunk_text(text: str, size: int = CHUNK_SIZE):
    for i in range(0, len(text), size):
        yield text[i:i+size]

def main(docs_folder: str = "./sample_docs"):
    docs = load_docs(docs_folder)
    chunks = []
    for d in docs:
        for i, c in enumerate(chunk_text(d["text"])):
            chunks.append({"id": f"{d['id']}::chunk{i}", "text": c})
    texts = [c["text"] for c in chunks]
    emb_client = EmbeddingsClient()  # replace with real client init
    embeddings = emb_client.embed(texts)
    vs = VectorStoreClient()
    items = [{"id": c["id"], "embedding": e, "metadata": {"source": c["id"]}} for c,e in zip(chunks, embeddings)]
    vs.upsert(items)
    print(f"Indexed {len(items)} chunks")

if __name__ == "__main__":
    main()
```

#### models.py (query flow)

```python
# app/models.py
from gradient_sdk import ModelClient  # conceptual
from .retrieval import search_kb

MODEL_NAME = "gpt-xyz"  # replace with actual model

def render_prompt(query: str, contexts: list):
    ctx_text = "\n\n".join([f"Source: {c['metadata']['source']}\n{c['text']}" for c in contexts])
    return f"""You are a helpful support assistant.
Use the following sources to answer the question. Cite sources in your answer.

{ctx_text}

Question: {query}
Answer:"""

def answer_query(query: str):
    hits = search_kb(query, top_k=5)
    prompt = render_prompt(query, hits)
    client = ModelClient(model=MODEL_NAME)
    resp = client.generate(prompt=prompt, max_tokens=512)
    return resp.text, hits
```

#### functions.py (safe function stub)

```python
# app/functions.py
def create_ticket(user_email: str, subject: str, body: str):
    # In hackathon demo, return a mock ticket id
    return {"ticket_id": "TICKET-12345", "status": "created"}
```

#### Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PYTHONUNBUFFERED=1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### ADK agent config example

```yaml
# infra/adk_agent_config.yaml
agent:
  name: rag-support-agent
  description: "RAG support agent using knowledge base and function calling"
  model: gpt-xyz
  tools:
    - name: create_ticket
      type: http
      endpoint: https://your-function-endpoint/create_ticket
  retrieval:
    vector_store: gradient_vector_store
    top_k: 5
  guardrails:
    pii_redaction: true
```

---

### Deployment and CI/CD checklist

- **Secrets**: store API keys in GitHub Secrets or DO App secrets; never commit keys.  
- **CI**: GitHub Actions workflow to run tests, lint, build Docker image, and push to registry.  
- **Deploy**: use DigitalOcean Apps or Functions for hosting backend and functions; use ADK/Gradient CLI to deploy agent endpoint if available.  
- **Health checks**: simple `/health` endpoint returning status and version.  
- **Monitoring**: log token usage and latencies; enable tracing for agent steps if platform supports it.

---

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
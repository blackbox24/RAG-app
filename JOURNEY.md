### Learning resources and study plan for Plan A (RAG customer support agent)

---

### Quick orientation and what to expect
**Goal:** Get you from Python ML familiarity to building a production‑ready RAG agent that ingests docs, performs retrieval, composes answers with citations, and safely calls one function (create ticket). The plan below gives a week‑by‑week learning path, concrete tutorials and PDFs to read, runnable exercises, and deployment references so you can complete the hackathon deliverables.

**Core concepts you’ll learn:** embeddings and vector search, chunking strategies, prompt engineering for RAG, simple agent patterns and function calling, guardrails/PII redaction, sandboxed serverless functions, CI/CD and monitoring. The DigitalOcean Model Playground doc is a useful platform reference for testing and comparing models while you build.   [docs.digitalocean.com](https://docs.digitalocean.com/products/gradient-ai-platform/getting-started/use-model-playground)

---

### Week‑by‑week learning path (8 weeks total, accelerated option available)

#### Week 0 — Foundations (2–3 days)
- **Topics:** LLM basics, tokens, temperature, top‑p, embeddings concept.
- **Hands‑on:** Call a foundation model and an embeddings endpoint from Python; print token counts and experiment with temperature.
- **Resources:** LangChain RAG tutorial for conceptual grounding and quick code examples.   [LangChain](https://docs.langchain.com/oss/python/langchain/rag)

#### Week 1 — RAG fundamentals (4–7 days)
- **Topics:** Chunking strategies, embedding models, vector stores (FAISS, OpenSearch, hosted Gradient vector store), retrieval pipelines.
- **Hands‑on:** Implement `ingest_kb.py` that chunks Markdown docs, computes embeddings, and upserts to a vector store; implement a simple retrieval + prompt pipeline that returns top‑k chunks.
- **Tutorials & reading:** FreeCodeCamp RAG tutorial for a practical walkthrough.   [FreeCodecamp](https://www.freecodecamp.org/news/mastering-rag-from-scratch)

#### Week 2 — Prompting and answer composition (3–5 days)
- **Topics:** Prompt templates for RAG (context injection, citation formatting), reducing hallucinations, few‑shot examples.
- **Hands‑on:** Build prompt templates that include retrieved chunks and require the model to cite sources in the answer.
- **Reference:** LangChain RAG docs for chain patterns and two‑step RAG examples.   [LangChain](https://docs.langchain.com/oss/python/langchain/rag)

#### Week 3 — Function calling and simple agent pattern (4–7 days)
- **Topics:** Agent pattern basics (instruction + tools + state), structured function calling, designing safe function schemas.
- **Hands‑on:** Implement a `create_ticket` function stub and wire the model to return a structured function call that your backend executes and returns to the user.
- **Practice:** Use a small set of tool schemas and test with scripted prompts.

#### Week 4 — Guardrails, PII redaction, and evaluation (4–7 days)
- **Topics:** Content moderation, PII detection and redaction, evaluation metrics for RAG (precision@k, answer correctness, citation accuracy).
- **Hands‑on:** Add a pre‑send PII filter and an evaluation harness that runs scripted queries and checks expected answers.

#### Week 5 — Multi‑stage testing and demo polish (3–5 days)
- **Topics:** End‑to‑end testing, demo script creation, recording a ≤3 minute video.
- **Hands‑on:** Create a short demo script that shows retrieval, citation, and a function call.

#### Week 6 — Deployment and CI/CD (4–7 days)
- **Topics:** Docker, GitHub Actions, DigitalOcean Apps/Functions or ADK/Gradient CLI for agent endpoints, secrets management.
- **Hands‑on:** Create Dockerfile, GitHub Actions workflow, and deploy backend and function stubs to a small hosted environment.

#### Ongoing practice (weeks 7–8)
- **Topics:** Monitoring, cost control, prompt caching, iterative improvements.
- **Hands‑on:** Add tracing for token usage and latency; tune chunk size and retrieval top_k.

---

### Curated learning materials, tutorials, and PDFs

**High‑priority tutorials**
- **LangChain — Build a RAG agent** (step‑by‑step tutorial and code examples).   [LangChain](https://docs.langchain.com/oss/python/langchain/rag)  
- **FreeCodeCamp — Learn RAG from Scratch** (practical video/article walkthrough).   [FreeCodecamp](https://www.freecodecamp.org/news/mastering-rag-from-scratch)  
- **GeeksforGeeks — RAG with LangChain** (concise conceptual article and code snippets).   [GeeksForGeeks](https://www.geeksforgeeks.org/artificial-intelligence/rag-with-langchain/)

**Platform reference**
- **DigitalOcean Model Playground docs** — how to test and compare models and tweak settings while you prototype. Use this to evaluate model behavior and settings like max tokens, temperature, and top_p.   [docs.digitalocean.com](https://docs.digitalocean.com/products/gradient-ai-platform/getting-started/use-model-playground)

**Recommended PDFs and books (publicly available or purchasable)**
- **The Illustrated Transformer** — visual explanation of transformer architecture (searchable PDF).  
- **Designing Data‑Intensive Applications** — for system design and data architecture patterns (read for ingestion, indexing, and scaling).  
- **LangChain documentation (online)** — not a PDF but essential reference for RAG and agent patterns.   [LangChain](https://docs.langchain.com/oss/python/langchain/rag)

**Courses and videos**
- **LangChain YouTube tutorials and official docs** — practical code and examples.   [LangChain](https://docs.langchain.com/oss/python/langchain/rag)  
- **FreeCodeCamp RAG video course** — hands‑on implementation from scratch.   [FreeCodecamp](https://www.freecodecamp.org/news/mastering-rag-from-scratch)

---

### Practical exercises and starter artifacts (what to build each week)

**Exercise A (Week 1):** `ingest_kb.py`  
- Input: folder of Markdown docs.  
- Output: chunked texts, embeddings, upsert to FAISS or hosted vector store.  
- Deliverable: script that prints `Indexed N chunks`.

**Exercise B (Week 2):** Retrieval + prompt pipeline  
- Input: user query.  
- Steps: search vector store → assemble prompt with top‑k chunks → call model → return answer with inline citations.  
- Deliverable: CLI `python query.py "How do I reset my password?"` that prints answer and sources.

**Exercise C (Week 3):** Function calling  
- Implement `create_ticket(user_email, subject, body)` stub.  
- Model returns a structured JSON call; backend executes stub and returns ticket id.

**Exercise D (Week 4):** Evaluation harness  
- Create `tests/` with 10 scripted queries and expected citation sources; run and report pass/fail.

**Starter repos and examples to clone**
- LangChain RAG example repo.   [LangChain](https://docs.langchain.com/oss/python/langchain/rag)  
- FreeCodeCamp example notebooks for RAG.   [FreeCodecamp](https://www.freecodecamp.org/news/mastering-rag-from-scratch)

---

### Deployment, CI/CD, and production checklist

**Local → Staging → Demo**
- **Local:** Docker + docker‑compose for backend and local FAISS.  
- **Staging:** Deploy backend to DigitalOcean App or a small VM; host vector store on managed OpenSearch or use Gradient vector store.   [docs.digitalocean.com](https://docs.digitalocean.com/products/gradient-ai-platform/getting-started/use-model-playground)  
- **Demo:** Provide a hosted URL or short‑lived credentials for judges; include a README demo script.

**CI/CD**
- **GitHub Actions:** run tests, lint, build Docker image, push to registry, and optionally deploy.  
- **Secrets:** store API keys in GitHub Secrets or DO App secrets; never commit keys.

**Monitoring & cost control**
- Trace token usage and latency.  
- Use prompt caching for repeated queries.  
- Set model call budgets and alerts.

---

### Quick reference: essential commands and snippets

**Ingest (conceptual)**
```bash
python app/ingest_kb.py --docs ./sample_docs --index local
```

**Run backend**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Run a query (CLI)**
```bash
python app/query.py "How do I reset my password?"
```

---

### How I’ll support you next (I’ll proceed unless you tell me otherwise)
- I can **generate the complete runnable files** you asked for: `app/ingest_kb.py`, `app/main.py` (FastAPI), `app/models.py`, `app/functions.py`, `Dockerfile`, and a minimal GitHub Actions workflow.  
- I can **produce the exact learning pack**: a zipped list of public PDFs and links (LangChain RAG tutorial, FreeCodeCamp course, transformer primer) and a 4‑week study calendar with daily tasks and checkpoints.

Tell me which of the two you want me to produce now: **(A)** full starter code + deployment scripts for local FAISS, or **(B)** the complete learning pack with PDFs, videos, and a daily study schedule.
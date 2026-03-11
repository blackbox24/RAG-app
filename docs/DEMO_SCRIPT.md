# 🎬 LexAI — Demo Script for Judges

> **Estimated demo time: 2–3 minutes**
>
> This script walks through every major feature of LexAI in the exact order that earns maximum hackathon points.

---

## Pre-Demo Setup

1. Ensure the app is running:
   - **Live:** https://lexai-frontend-43cn4.ondigitalocean.app/
   - **Local:** `docker-compose up` → http://localhost:5173
2. Have a sample PDF contract ready (any lease agreement, employment contract, or NDA works)
3. Clear any previous uploads by refreshing the page

---

## Scene 1: The Problem (10 seconds)

*"Small business owners across Africa sign contracts they don't fully understand. Legal advice is expensive and inaccessible. LexAI solves this — upload any contract and instantly understand what you're signing."*

---

## Scene 2: Document Upload + Ingestion (30 seconds)

### Action
1. **Drag & drop** a PDF contract onto the upload zone (or click to browse)
2. Watch the **loading animation** ("Analyzing Document... Extracting clauses and vectorizing text")

### What to highlight
- The file is uploaded to **DigitalOcean Spaces** for persistent storage
- Text is extracted via **pdfplumber** (with OCR fallback for scanned docs)
- The document is **chunked by legal sections** (not arbitrary character splits)
- Chunks are **vectorized** using FastEmbed (BGE-small-en-v1.5)
- **Risky clauses** are automatically flagged

### Expected output
After upload completes, the chat shows:
```
✅ contract.pdf successfully analyzed.

⚠️ 3 potential issues found:
• ⚠️ Automatic renewal clause
• ⚠️ Termination without cause
• ⚠️ Indemnification clause — review carefully

Ask me anything about this contract, such as termination rights or payment obligations.
```

### Sidebar shows
- **File Name:** contract.pdf
- **Language Detected:** English
- **Vector Embeddings:** X chunks indexed
- **Risk Factors:** colored warning badges

---

## Scene 3: RAG Chat — Question Answering (60 seconds)

### Question 1: Termination Rights
**Ask:** *"Can the landlord terminate without notice?"*

**What to highlight:**
- The answer **cites specific sections** using `[Section X]` format
- **ClauseCards** appear below the answer showing the exact document excerpt, source, and relevance score (e.g., "Match: 87%")
- The legal **disclaimer** is appended automatically

### Question 2: Payment Obligations
**Ask:** *"What are my payment obligations?"*

**What to highlight:**
- The system retrieves **different sections** relevant to this new question
- Answers are in **plain English** (not legal jargon) — designed for SME owners
- Multiple citations are shown with ranked relevance

### Question 3: Risky Clauses
**Ask:** *"Are there any automatic renewals?"*

**What to highlight:**
- LexAI identifies the specific clause and **explains the risk**
- This demonstrates the **agentic behavior**: proactive risk identification, not just Q&A

### Suggested prompt chips
Point out the **suggested prompt buttons** at the bottom of the chat — they pre-fill common questions for faster interaction.

---

## Scene 4: Lawyer Escalation (30 seconds)

### Action
1. Click the **"Request Lawyer Review"** red button in the header
2. Fill in:
   - **Email:** demo@example.com
   - **Concern:** "I'm worried about the automatic renewal clause"
3. Click **Submit**

### Expected output
A success screen shows:
```
LEX-A1B2C3
Your lawyer review request has been submitted.
Ticket LEX-A1B2C3 created at 2026-03-11 14:30.
A qualified lawyer will contact demo@example.com within 24 hours.
```

### What to highlight
- This is the **safe function call** — the agent creates a real ticket
- Risky clause flags from ingestion are **automatically included** in the ticket
- The ticket ID format (`LEX-XXXXXX`) is trackable
- In production, this would trigger an email to a lawyer network

---

## Scene 5: Technical Highlights (30 seconds)

*"Under the hood, LexAI uses:"*

| Feature | Technology |
|---------|-----------|
| **RAG Pipeline** | LangGraph (2-node: retrieve → generate) with node-level tracing |
| **LLM** | DigitalOcean GenAI Platform — llama3-8b-instruct |
| **Vector Search** | FAISS with cosine similarity, 384-dim embeddings |
| **PII Protection** | Regex-based redaction strips IDs, emails, phones before LLM call |
| **Storage** | DigitalOcean Spaces for raw PDFs |
| **Deployment** | Docker + DO App Platform + GitHub Actions CI/CD |

*"The entire system is open source under MIT license, containerized, and deployed on DigitalOcean."*

---

## Key Judging Criteria Mapping

| Criterion | How LexAI Scores |
|-----------|-----------------|
| **Working demo** | Live URL + Docker local setup |
| **Gradient/DO AI usage** | LLM via DO inference, Spaces storage, ADK @entrypoint |
| **RAG quality** | Section-aware chunking, FAISS cosine search, citation grounding |
| **Agent behavior** | Risky clause detection, lawyer escalation, PII redaction |
| **Function calling** | `create_lawyer_request()` — safe, real-world action |
| **Code quality** | Typed schemas, Pydantic validation, tests, clean separation |
| **Open source** | MIT license, documented, reproducible setup |
| **Real-world impact** | Directly addresses legal access gap for African SMEs |

---

## Backup: If Something Goes Wrong

| Problem | Recovery |
|---------|----------|
| Backend down | Show the code structure and architecture diagram |
| Upload fails | Use a smaller PDF (< 10MB), ensure it's not image-only |
| LLM timeout | Explain the RAG flow works, show the FAISS search independently |
| Blank response | The document may lack structured sections — explain chunking logic |

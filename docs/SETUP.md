# ⚖️ LexAI — Local Development Setup

> Get LexAI running on your machine in under 5 minutes.

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Docker + Docker Compose | 20+ | `docker --version` |
| Git | any | `git --version` |
| Node.js (optional, for frontend dev) | 20+ | `node --version` |
| Python (optional, for backend dev) | 3.12+ | `python --version` |

---

## Option A: Docker Compose (Recommended)

The fastest way to run the full stack.

### 1. Clone the repository

```bash
git clone https://github.com/blackbox24/RAG-app.git
cd RAG-app
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
# Required: DigitalOcean GenAI API key
GRADIENT_MODEL_ACCESS_KEY=dop_v1_your_token_here

# Required: DigitalOcean workspace ID
GRADIENT_WORKSPACE_ID=your_workspace_id

# Required: DigitalOcean Spaces credentials
SPACES_KEY=your_spaces_access_key
SPACES_SECRET=your_spaces_secret_key
SPACES_BUCKET=lexai-docs
SPACES_REGION=nyc3
SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
```

### 3. Start everything

```bash
docker-compose up
```

This starts:
- **Backend** on http://localhost:9000 (FastAPI + FAISS + LangGraph)
- **Frontend** on http://localhost:5173 (React + Vite)

### 4. Open the app

Navigate to **http://localhost:5173** and upload a PDF contract.

### Stop

```bash
docker-compose down
```

---

## Option B: Manual Setup (for Development)

Use this when you need hot-reload and debugging.

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Copy env file to backend directory
cp ../.env.example ../.env
# Edit ../.env with your credentials

# Start the server (with auto-reload)
uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```

The backend will be available at http://localhost:9000.

API docs at http://localhost:9000/docs (Swagger UI).

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set the backend URL
export VITE_API_URL=http://localhost:9000

# Start dev server
npm run dev
```

The frontend will be available at http://localhost:5173.

---

## Environment Variables Reference

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `GRADIENT_MODEL_ACCESS_KEY` | Yes | DigitalOcean GenAI API key | — |
| `GRADIENT_WORKSPACE_ID` | Yes | DigitalOcean workspace ID | — |
| `SPACES_KEY` | Yes | DO Spaces access key ID | — |
| `SPACES_SECRET` | Yes | DO Spaces secret access key | — |
| `SPACES_BUCKET` | No | S3 bucket name | `lexai-docs` |
| `SPACES_REGION` | No | Spaces data center region | `nyc3` |
| `SPACES_ENDPOINT` | Yes | Spaces endpoint URL | — |

### Getting Your Credentials

1. **GenAI API Key:**
   - Go to [DigitalOcean Cloud Console](https://cloud.digitalocean.com/)
   - Navigate to **GenAI Platform** → **API Keys**
   - Create a new key and copy the token

2. **Spaces Credentials:**
   - Go to **API** → **Spaces Keys**
   - Generate a new key pair
   - Create a Space called `lexai-docs` in your preferred region

---

## Running Tests

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

Test coverage:
- `test_health` — checks `/health` returns 200
- `test_chat_no_doc` — verifies `/chat` endpoint responds without a doc
- `test_ticket_creation` — validates ticket creation returns `LEX-*` ID

---

## Project Structure (Quick Reference)

```
RAG-app/
├── .env.example            ← copy to .env and fill in
├── docker-compose.yml      ← docker-compose up
├── backend/
│   ├── main.py             ← FastAPI entry point
│   ├── agent.py            ← LangGraph RAG agent
│   ├── config/config.py    ← all settings
│   ├── models/schemas.py   ← Pydantic models
│   └── tools/
│       ├── ingest.py       ← PDF processing pipeline
│       ├── retrieval.py    ← FAISS vector store
│       ├── models.py       ← prompt engineering
│       ├── functions.py    ← ticket creation
│       └── guardrails.py   ← PII redaction
└── frontend/
    └── src/
        ├── App.jsx         ← root component
        ├── api/client.js   ← API calls
        └── components/     ← UI components
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: fastembed` | Ensure you're in the venv: `source venv/bin/activate` |
| Backend can't find `.env` | The `.env` file should be at the project root (same level as `docker-compose.yml`) |
| FAISS index empty | Upload a PDF first via `/ingest` — the index is built on first upload |
| Frontend shows "Connection lost" | Check backend is running on port 9000 and `VITE_API_URL` is set |
| Docker build fails on ARM Mac | Add `platform: linux/amd64` to docker-compose services |
| Spaces upload fails | Verify your Spaces key/secret and that the bucket exists |
| OCR not working | Ensure Tesseract is installed: `apt install tesseract-ocr` (handled in Docker) |

---

## Useful Commands

```bash
# View backend logs
docker-compose logs -f backend

# Rebuild after code changes
docker-compose up --build

# Run just the backend
docker-compose up backend

# Check FAISS index
ls -la data/faiss_index/

# Test a single endpoint
curl http://localhost:9000/health
```

# ⚖️ LexAI — AI Legal Assistant for African SMEs

> Small business owners across Africa sign contracts they don't understand. 
> Lawyers are expensive. LexAI changes that.

## 🚀 Live Demo
**URL:** https://lexai-frontend-43cn4.ondigitalocean.app/
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
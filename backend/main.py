from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import boto3
from botocore.exceptions import ClientError

from config.config import get_settings, Settings
from models.schemas import (
    ChatRequest, ChatResponse, TicketRequest,
    TicketResponse, IngestResponse
)
from tools.models import answer_query
from tools.ingest import ingest_document
from tools.guardrails import redact_pii, add_disclaimer
from tools.functions import create_lawyer_request

app = FastAPI(
    title="RAG Support Agent - Minimal Version",
    description="AI Legal Document Assistant for African SMEs",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Welcome to the RAG Support Agent API!", "docs": "/docs"}

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Backend is running!"}


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

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        # User passed a prompt as a CLI argument
        prompt_text = " ".join(sys.argv[1:])
        print(f"Echoing prompt via CLI: {prompt_text}")
    else:
        import uvicorn
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

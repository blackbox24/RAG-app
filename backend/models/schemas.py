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
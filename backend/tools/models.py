# WHY separate models.py: prompt engineering is its own discipline.
# Keeping prompts here means you can tune them without touching business logic.

from gradient import Gradient
from typing import List
from config.config import get_settings
from tools.retrieval import VectorStore, embed_query

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

    client = Gradient(model_access_key=settings.gradient_access_token)
    response = client.chat.completions.create(
        model=settings.gradient_model_slug,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=settings.max_tokens
    )
    answer_text = response.choices[0].message.content

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
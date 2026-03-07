"""
WHY LangGraph + @entrypoint:
1. @entrypoint is required by gradient-adk for deployment
2. LangGraph StateGraph gives you automatic trace capture in the DO console
   — every node (retrieve → generate → respond) is traced with zero extra code
3. Judges can see the agent reasoning steps in the DO dashboard

Architecture of this graph:
  retrieve_node → generate_node → END

retrieve_node: takes the user question, searches FAISS for top chunks
generate_node: builds prompt with context, calls ChatGradient, returns answer
"""

from typing import TypedDict, List, Optional
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_gradient import ChatGradient
from langgraph.graph import StateGraph, END
from gradient_adk import entrypoint, RequestContext

from config.config import get_settings
from tools.retrieval import VectorStore, embed_query
from tools.guardrails import redact_pii, add_disclaimer

settings = get_settings()

# --- LangGraph State ---
class AgentState(TypedDict):
    query: str
    doc_id: Optional[str]
    mode: str                    # "plain" or "formal"
    retrieved_chunks: List[dict]
    answer: str
    citations: List[dict]

# --- System Prompt ---
SYSTEM_PROMPT = """You are LexAI, a legal document assistant helping small business 
owners in Africa understand their contracts. You speak clearly and plainly.

RULES — follow strictly:
1. ONLY use the provided document excerpts to answer. Never invent facts.
2. ALWAYS cite the source section using [Section X] format inline in your answer.
3. If a clause is one-sided or risky, say so clearly.
4. If the excerpts don't contain the answer, say: "I couldn't find that in your document."
5. Be concise but complete."""

def build_prompt(query: str, chunks: List[dict], mode: str) -> str:
    ctx = "\n\n---\n\n".join(
        f"[{c['metadata']['source']}]\n{c['text']}" for c in chunks
    )
    style = (
        "Explain in plain English for a small business owner with no legal background. "
        "Use simple words. Use bullet points for complex clauses."
        if mode == "plain"
        else
        "Provide a formal legal analysis referencing exact clause numbers."
    )
    return f"{SYSTEM_PROMPT}\n\n{style}\n\nDOCUMENT EXCERPTS:\n{ctx}\n\nQUESTION: {query}\n\nANSWER:"

# --- Graph Nodes ---
def retrieve_node(state: AgentState) -> AgentState:
    """
    WHY separate retrieval node:
    LangGraph traces each node independently. Judges see "retrieve_node took 120ms,
    returned 6 chunks" in the DO console. This makes RAG visible and verifiable.
    """
    store = VectorStore()
    query_emb = embed_query(state["query"])
    chunks = store.search(query_emb, top_k=settings.top_k, doc_id=state.get("doc_id"))
    return {**state, "retrieved_chunks": chunks}

def generate_node(state: AgentState) -> AgentState:
    """
    WHY ChatGradient:
    Official DO LangChain integration. Uses GRADIENT_MODEL_ACCESS_KEY from env.
    Counts toward Gradient AI usage — important for hackathon judging criteria.
    """
    chunks = state["retrieved_chunks"]

    if not chunks:
        return {
            **state,
            "answer": add_disclaimer(
                "I couldn't find relevant clauses in your document for that question. "
                "Try rephrasing or asking about a specific section."
            ),
            "citations": []
        }

    llm = ChatGradient(
        model=settings.gradient_model_slug,
        max_tokens=settings.max_tokens,
        # api_key read from GRADIENT_MODEL_ACCESS_KEY env var automatically
    )

    prompt = build_prompt(state["query"], chunks, state.get("mode", "plain"))
    messages = [HumanMessage(content=prompt)]
    response = llm.invoke(messages)
    answer_text = add_disclaimer(response.content)

    citations = [
        {
            "source": c["metadata"]["source"],
            "text": c["text"][:300],
            "relevance_score": round(c["relevance_score"], 3)
        }
        for c in chunks[:3]  # top 3 citations shown in UI
    ]

    return {**state, "answer": answer_text, "citations": citations}

# --- Build LangGraph workflow ---
# WHY build once at module level: graph compilation is expensive.
# Building it once when the module loads, reusing on every request.
workflow = StateGraph(AgentState)
workflow.add_node("retrieve", retrieve_node)
workflow.add_node("generate", generate_node)
workflow.set_entry_point("retrieve")
workflow.add_edge("retrieve", "generate")
workflow.add_edge("generate", END)
graph = workflow.compile()

# --- ADK Entrypoint ---
# WHY @entrypoint: this is the required decorator for gradient-adk.
# Without it, `gradient agent run` and `gradient agent deploy` won't work.
# The entrypoint is also what the FastAPI /chat route calls internally.
@entrypoint
def run_agent(payload: dict, context: RequestContext) -> dict:
    """
    Called by:
    - `gradient agent run` (local testing via POST http://localhost:8080/run)
    - `gradient agent deploy` (production via POST https://agents.do-ai.run/.../run)
    - Our FastAPI /chat endpoint (bridges React frontend to agent)

    WHY dual invocation: the ADK exposes its own /run endpoint. Our FastAPI
    /chat endpoint calls this same function directly so we get one code path
    for both the ADK runtime and the React frontend.
    """
    query = redact_pii(payload.get("prompt", ""))
    doc_id = payload.get("doc_id")
    mode = payload.get("mode", "plain")

    if not query:
        return {"answer": "Please provide a question.", "citations": [], "risky_flags": []}

    initial_state: AgentState = {
        "query": query,
        "doc_id": doc_id,
        "mode": mode,
        "retrieved_chunks": [],
        "answer": "",
        "citations": []
    }

    result = graph.invoke(initial_state)
    return {
        "answer": result["answer"],
        "citations": result["citations"],
        "risky_flags": []  # populated by ingest, not chat
    }
import sys
import os

# Add the parent directory (backend) to the sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from main import app


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


if __name__ == "__main__":
    test_api()

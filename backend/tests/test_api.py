import sys
import os

# Add the parent directory (backend) to the sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_api():
    response = client.get("/health")
    assert response.status_code == 200
    print("Health check passed:", response.json())
    
    response = client.post("/api/prompt", json={"prompt": "Hello world!"})
    assert response.status_code == 200
    print("Prompt echo passed:", response.json())
    
    print("All tests passed successfully.")

if __name__ == "__main__":
    test_api()

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="RAG Support Agent - Minimal Version")

class PromptRequest(BaseModel):
    prompt: str

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Backend is running!"}

@app.post("/api/prompt")
def echo_prompt(request: PromptRequest):
    """
    Takes a prompt and returns the same prompt.
    """
    return {
        "status": "success",
        "returned_prompt": request.prompt
    }

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        # User passed a prompt as a CLI argument
        prompt_text = " ".join(sys.argv[1:])
        print(f"Echoing prompt via CLI: {prompt_text}")
    else:
        import uvicorn
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Gradient AI
    gradient_access_token: str
    gradient_workspace_id: str
    gradient_model_slug: str = "llama3-8b-chat"  # use available Gradient model

    # DigitalOcean Spaces (S3-compatible doc storage)
    spaces_key: str
    spaces_secret: str
    spaces_bucket: str = "lexai-docs"
    spaces_region: str = "nyc3"
    spaces_endpoint: str = "https://nyc3.digitaloceanspaces.com"

    # App
    faiss_index_path: str = "./data/faiss_index"
    chunk_size: int = 600       # WHY 600: legal clauses avg ~400-800 chars
    chunk_overlap: int = 100    # WHY overlap: prevents splitting mid-sentence
    top_k: int = 6              # WHY 6: more context = better legal answers
    max_tokens: int = 1024
    environment: str = "development"

    class Config:
        env_file = ".env"

@lru_cache()  # WHY: instantiate settings once, reuse everywhere
def get_settings():
    return Settings()
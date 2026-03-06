from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from functools import lru_cache

class Settings(BaseSettings):
    # Gradient AI
    gradient_access_token: str = Field(validation_alias="GRADIENT_ACCESS_TOKEN")
    gradient_workspace_id: str = Field(validation_alias="GRADIENT_WORKSPACE_ID")
    gradient_model_slug: str = "llama3-8b-chat"  # use available Gradient model

    # DigitalOcean Spaces (S3-compatible doc storage)
    spaces_key: str = Field(validation_alias="SPACES_KEY")
    spaces_secret: str = Field(validation_alias="SPACES_SECRET")
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

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore"
    )

@lru_cache()  # WHY: instantiate settings once, reuse everywhere
def get_settings():
    return Settings()
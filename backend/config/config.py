from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from functools import lru_cache
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parents[0].parent

class Settings(BaseSettings):
    # DigitalOcean Gradient AI
    gradient_access_token: str = Field(validation_alias="GRADIENT_MODEL_ACCESS_KEY")
    gradient_model_slug: str = "llama3.1-8b-instruct"  # use available DigitalOcean model
    embedding_model_slug: str = "bge-large-en-v1.5"

    # DigitalOcean Spaces (S3-compatible doc storage)
    spaces_key: str = Field(validation_alias="SPACES_KEY")
    spaces_secret: str = Field(validation_alias="SPACES_SECRET")
    spaces_bucket: str = Field(validation_alias="SPACES_BUCKET")
    spaces_region: str = Field(validation_alias="SPACES_REGION")
    spaces_endpoint: str = Field(validation_alias="SPACES_ENDPOINT")

    # App
    faiss_index_path: str = "./data/faiss_index"
    chunk_size: int = 600       # WHY 600: legal clauses avg ~400-800 chars
    chunk_overlap: int = 100    # WHY overlap: prevents splitting mid-sentence
    top_k: int = 6              # WHY 6: more context = better legal answers
    max_tokens: int = 1024
    environment: str = "development"

    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR,".env"), 
        env_file_encoding="utf-8",
        extra="ignore"
    )

@lru_cache()  # WHY: instantiate settings once, reuse everywhere
def get_settings():
    return Settings()
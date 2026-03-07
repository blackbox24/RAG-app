from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, model_validator
from functools import lru_cache
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parents[0].parent

class Settings(BaseSettings):
    # DigitalOcean Gradient AI
    gradient_access_token: str = Field(validation_alias="GRADIENT_MODEL_ACCESS_KEY")
    gradient_workspace_id: str = Field(validation_alias="GRADIENT_WORKSPACE_ID")
    gradient_model_slug: str = "llama3-8b-instruct"  # use available DigitalOcean model

    do_inference_base_url: str = "https://inference.do-ai.run/v1"

    embedding_model_name: str = "BAAI/bge-small-en-v1.5"
    embedding_dimension: int = 384   # must match the model above

    # DigitalOcean Spaces (S3-compatible doc storage)
    spaces_key: str = Field(validation_alias="SPACES_KEY")
    spaces_secret: str = Field(validation_alias="SPACES_SECRET")
    spaces_bucket: str = Field(validation_alias="SPACES_BUCKET")
    spaces_region: str = Field(validation_alias="SPACES_REGION")
    spaces_endpoint: str = Field(validation_alias="SPACES_ENDPOINT")

    # App
    faiss_index_path: str = "../data/faiss_index"
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
    @model_validator(mode="after")
    def set_do_inference_key(self) -> "Settings":
        """
        WHY: langchain-gradient's ChatGradient reads DIGITALOCEAN_INFERENCE_KEY
        from the environment. We inject it from our existing GRADIENT_MODEL_ACCESS_KEY
        so the ChatGradient client picks it up automatically without any extra config.
        """
        os.environ["DIGITALOCEAN_INFERENCE_KEY"] = self.gradient_access_token
        os.environ["OPENAI_API_KEY"] = self.gradient_access_token
        os.environ["OPENAI_API_BASE"] = self.do_inference_base_url
        return self

@lru_cache()  # WHY: instantiate settings once, reuse everywhere
def get_settings():
    return Settings() # type: ignore
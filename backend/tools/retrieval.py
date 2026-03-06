# WHY FAISS: fast, free, no external service.
# WHY save/load: FAISS lives in memory — if container restarts, index is lost.
# We persist to disk and reload on startup.

import faiss
import numpy as np
import pickle
from pathlib import Path
from typing import List, Tuple, Optional
from gradient import Gradient

from config.config import get_settings

settings = get_settings()

class VectorStore:
    def __init__(self):
        self.index_path = Path(settings.faiss_index_path)
        self.index_path.mkdir(parents=True, exist_ok=True)
        self.faiss_file = self.index_path / "index.faiss"
        self.meta_file = self.index_path / "metadata.pkl"
        self.dimension = 1024  # BGE-large embedding dimension
        self._load()

    def _load(self):
        if self.faiss_file.exists() and self.meta_file.exists():
            self.index = faiss.read_index(str(self.faiss_file))
            with open(self.meta_file, "rb") as f:
                self.metadata = pickle.load(f)
        else:
            # WHY IndexFlatIP: cosine similarity via inner product.
            # Better than L2 for text embeddings — measures angle, not distance.
            self.index = faiss.IndexFlatIP(self.dimension)
            self.metadata = []  # parallel list to FAISS index

    def save(self):
        faiss.write_index(self.index, str(self.faiss_file))
        with open(self.meta_file, "wb") as f:
            pickle.dump(self.metadata, f)

    def add(self, chunks: List[dict], embeddings: List[np.ndarray]):
        matrix = np.vstack(embeddings)
        # WHY normalize: required for cosine similarity with IndexFlatIP
        faiss.normalize_L2(matrix)
        self.index.add(matrix)
        self.metadata.extend(chunks)

    def search(self, query_embedding: np.ndarray, top_k: int = 6,
               doc_id: Optional[str] = None) -> List[dict]:
        query = query_embedding.reshape(1, -1).astype(np.float32)
        faiss.normalize_L2(query)
        scores, indices = self.index.search(query, top_k * 3)  # fetch more, filter after

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:
                continue
            chunk = self.metadata[idx]
            # WHY doc_id filter: scope search to the uploaded document
            if doc_id and chunk["metadata"]["doc_id"] != doc_id:
                continue
            results.append({
                **chunk,
                "relevance_score": float(score)
            })
            if len(results) == top_k:
                break
        return results

def embed_query(query: str) -> np.ndarray:
    client = Gradient(model_access_key=settings.gradient_access_token)
    response = client.embeddings.create(
        model=settings.embedding_model_slug,
        input=[query]
    )
    return np.array(response.data[0].embedding, dtype=np.float32)
# WHY FAISS: fast, free, no external service.
# WHY save/load: FAISS lives in memory — if container restarts, index is lost.
# We persist to disk and reload on startup.

import faiss
import numpy as np
import pickle
from pathlib import Path
from typing import List, Optional
from langchain_community.embeddings import GradientEmbeddings

from config.config import get_settings
from tools.ingest import get_embedder

settings = get_settings()

class VectorStore:
    def __init__(self):
        self.index_path = Path(settings.faiss_index_path)
        self.index_path.mkdir(parents=True, exist_ok=True)
        self.faiss_file = self.index_path / "index.faiss"
        self.meta_file = self.index_path / "metadata.pkl"
        self.dimension = 384  # BGE-large embedding dimension
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

    def search(self, query_embedding: np.ndarray, top_k: int = 6, doc_id: Optional[str] = None) -> List[dict]:
        if self.index.ntotal == 0:
            return []
        
        query = query_embedding.reshape(1, -1).astype(np.float32)
        faiss.normalize_L2(query)

        fetch_k = min(top_k * 3, self.index.ntotal)
        scores, indices = self.index.search(query, fetch_k)  # fetch more, filter after

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
    """
    Embed a single query using the same local model as chunk embedding.
    WHY same model: query and chunks MUST use identical embedding spaces
    for cosine similarity to be meaningful. Mixing models = garbage results.
    """
    embedder = get_embedder()
    # encode() with a single string still returns 2D array — squeeze to 1D
    result = embedder.encode(
        [query],
        normalize_embeddings=True
    )
    return result[0].astype(np.float32)
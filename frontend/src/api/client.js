// WHY centralise API calls: if the backend URL changes,
// you update ONE file, not 10 components.
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: BASE_URL });

export const uploadDocument = async (file, onProgress) => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/ingest', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  const { job_id } = data;
  const maxAttempts = 120;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000));  // wait 2s

    const { data: status } = await api.get(`/ingest/status/${job_id}`);

    if (status.status === 'done') {
      return status.result;  // same shape as before: { doc_id, chunks_indexed, ... }
    }

    if (status.status === 'error') {
      throw new Error(status.error || 'Ingestion failed');
    }

    // Still processing — call optional progress callback for UI feedback
    if (onProgress) {
      onProgress(i, maxAttempts);
    }
  }

  throw new Error('Ingestion timed out after 4 minutes');
};

export const sendMessage = async ({ message, sessionId, docId }) => {
  const { data } = await api.post('/chat', {
    message,
    session_id: sessionId,
    doc_id: docId
  });
  return data; // { answer, citations, risky_flags }
};

export const createTicket = async ({ email, docId, concern, flaggedClauses }) => {
  const { data } = await api.post('/ticket', {
    user_email: email,
    doc_id: docId,
    concern,
    flagged_clauses: flaggedClauses
  });
  return data;
};

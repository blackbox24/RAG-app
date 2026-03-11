// WHY centralise API calls: if the backend URL changes,
// you update ONE file, not 10 components.
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: BASE_URL });

export const uploadDocument = async (file) => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/ingest', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data; // { doc_id, chunks_indexed, risky_clauses_found }
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

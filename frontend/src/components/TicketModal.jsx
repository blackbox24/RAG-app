import { useState } from 'react';
import { createTicket } from '../api/client';

export default function TicketModal({ doc, onClose }) {
  const [email, setEmail] = useState('');
  const [concern, setConcern] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    const data = await createTicket({
      email, docId: doc.doc_id, concern,
      flaggedClauses: doc.risky_clauses_found || []
    });
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">🚨 Request Lawyer Review</h2>
        {result ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-green-400 font-semibold">{result.ticket_id}</p>
            <p className="text-gray-300 text-sm mt-2">{result.message}</p>
            <button onClick={onClose} className="mt-4 bg-gray-700 text-white px-6 py-2 rounded-lg">
              Close
            </button>
          </div>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-4">
              A qualified lawyer will review your contract and contact you within 24 hours.
            </p>
            <input className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 mb-3 outline-none"
              placeholder="Your email address" value={email}
              onChange={e => setEmail(e.target.value)} />
            <textarea className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 mb-4 outline-none h-24 resize-none"
              placeholder="What's your main concern?" value={concern}
              onChange={e => setConcern(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 bg-gray-700 text-white py-2 rounded-lg">Cancel</button>
              <button onClick={submit} disabled={!email || !concern || loading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white py-2 rounded-lg transition">
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

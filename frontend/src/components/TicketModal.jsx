import { useState } from 'react';
import { ShieldAlert, X, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { createTicket } from '../api/client';

export default function TicketModal({ doc, onClose }) {
  const [email, setEmail] = useState('');
  const [concern, setConcern] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const data = await createTicket({
        email, docId: doc.doc_id, concern,
        flaggedClauses: doc.risky_clauses_found || []
      });
      setResult(data);
    } catch {
      setResult({ ticket_id: 'LEX-ERROR', message: 'Failed to connect to support system. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg bg-surface border border-white/10 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden relative"
      >
        {/* Header Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-orange-500"></div>

        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20">
                <ShieldAlert className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Request Lawyer Review</h2>
                <p className="text-sm text-zinc-400">Escalate this contract to a legal expert</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 bg-surfaceSecondary hover:bg-white/5 text-zinc-400 hover:text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {result ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="text-center py-6"
            >
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-emerald-400 font-bold text-xl mb-2">{result.ticket_id}</p>
              <p className="text-zinc-300 text-sm leading-relaxed max-w-sm mx-auto">{result.message}</p>
              
              <button 
                onClick={onClose} 
                className="mt-8 bg-surfaceSecondary hover:bg-white/5 border border-white/10 text-white font-medium px-8 py-2.5 rounded-xl transition-colors"
              >
                Return to Workspace
              </button>
            </motion.div>
          ) : (
            <div className="space-y-5">
              
              {doc.risky_clauses_found?.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/10 p-3.5 rounded-xl">
                  <p className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wider">Pre-filled Context</p>
                  <p className="text-sm text-zinc-400 flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 text-red-500/50 flex-shrink-0 mt-0.5" />
                    Attaching {doc.risky_clauses_found.length} flagged risks for the attorney to review.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300 ml-1">Email Address</label>
                <input 
                  type="email"
                  className="w-full bg-zinc-900 border border-white/10 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600"
                  placeholder="name@company.com" 
                  value={email}
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300 ml-1">Main Concern</label>
                <textarea 
                  className="w-full bg-zinc-900 border border-white/10 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 text-white rounded-xl px-4 py-3 outline-none transition-all resize-none min-h-[120px] placeholder:text-zinc-600"
                  placeholder="e.g. The termination clause on page 2 seems very one-sided..." 
                  value={concern}
                  onChange={e => setConcern(e.target.value)} 
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  onClick={onClose} 
                  className="flex-1 bg-surfaceSecondary hover:bg-white/5 border border-white/10 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={submit} 
                  disabled={!email || !concern || loading}
                  className="flex-[2] bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:border-white/5 border border-red-500/30 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-red-900/20"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

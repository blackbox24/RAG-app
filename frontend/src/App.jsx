import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Scale, ShieldAlert, FileText, Globe, Layers } from 'lucide-react';
import { motion as _motion, AnimatePresence } from 'framer-motion';
const motion = _motion;

import DocumentUpload from './components/DocumentUpload';
import ChatPanel from './components/ChatPanel';
import TicketModal from './components/TicketModal';

const SESSION_ID = uuidv4();

export default function App() {
  const [doc, setDoc] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDocUploaded = (result, filename) => {
    setDoc({ ...result, filename });
    setMessages([{
      role: 'assistant',
      content: `✅ **${filename}** successfully analyzed.\n\n` +
        (result.risky_clauses_found?.length
          ? `⚠️ **${result.risky_clauses_found.length} potential issues found:**\n` +
            result.risky_clauses_found.map(f => `• ${f}`).join('\n')
          : '✅ No obvious risky clauses detected on initial scan.') +
        `\n\nAsk me anything about this contract, such as termination rights or payment obligations.`,
      citations: []
    }]);
  };

  return (
    <div className="min-h-screen bg-background text-zinc-200 flex flex-col overflow-hidden relative font-sans selection:bg-primary-500/30">
      
      {/* Subtle Background Glow */}
      <div className="absolute top-0 inset-x-0 h-96 bg-primary-900/10 blur-[100px] pointer-events-none rounded-b-full"></div>

      {/* Header */}
      <header className="relative z-10 glass border-b border-white/5 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl shadow-lg border border-white/10">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 tracking-tight">
              lexAI
            </h1>
            <p className="text-xs text-primary-200/60 font-medium tracking-wide">
              INTELLIGENT CONTRACT ANALYSIS
            </p>
          </div>
        </div>
        
        {doc && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setTicketOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-red-900/20 border border-red-500/30"
          >
            <ShieldAlert className="w-4 h-4" />
            Request Lawyer Review
          </motion.button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative z-0">
        <AnimatePresence mode="wait">
          {!doc ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col items-center justify-center p-6 relative z-10"
            >
              <DocumentUpload onUploaded={handleDocUploaded} />
            </motion.div>
          ) : (
            <motion.div 
              key="workspace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex-1 flex flex-col lg:flex-row w-full max-w-7xl mx-auto overflow-hidden p-4 lg:p-6 gap-6"
            >
              {/* Document Metadata Sidebar */}
              <motion.aside 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="hidden lg:flex w-80 flex-col gap-4"
              >
                <div className="glass-panel p-5 rounded-2xl flex-1 max-h-[400px]">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 border-b border-white/5 pb-3">
                    Document Context
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="p-2 bg-primary-500/10 text-primary-400 rounded-lg h-fit">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs text-zinc-500">File Name</p>
                        <p className="text-sm font-medium truncate" title={doc.filename}>{doc.filename}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg h-fit">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Language Detected</p>
                        <p className="text-sm font-medium capitalize">{doc.detected_language || 'English'}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg h-fit">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Vector Embeddings</p>
                        <p className="text-sm font-medium">{doc.chunks_indexed} chunks indexed</p>
                      </div>
                    </div>

                    {doc.risky_clauses_found?.length > 0 && (
                      <div className="pt-3 border-t border-white/5 mt-2">
                        <p className="text-xs text-rose-400 font-semibold mb-2 flex items-center gap-2">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Risk Factors
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {doc.risky_clauses_found.map((flag, idx) => (
                            <span key={idx} className="text-[10px] px-2 py-1 bg-rose-500/10 text-rose-300 rounded-md border border-rose-500/20">
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.aside>

              {/* Chat Area */}
              <div className="flex-1 flex flex-col glass-panel rounded-2xl overflow-hidden shadow-2xl relative">
                 <ChatPanel
                  doc={doc}
                  messages={messages}
                  setMessages={setMessages}
                  sessionId={SESSION_ID}
                  loading={loading}
                  setLoading={setLoading}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {ticketOpen && (
          <TicketModal
            doc={doc}
            onClose={() => setTicketOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

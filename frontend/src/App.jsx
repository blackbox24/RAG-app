// WHY App.jsx is the state hub: keeps doc state and chat history
// in one place so all child components stay in sync.
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import DocumentUpload from './components/DocumentUpload';
import ChatPanel from './components/ChatPanel';
import TicketModal from './components/TicketModal';

const SESSION_ID = uuidv4(); // one session per browser load

export default function App() {
  const [doc, setDoc] = useState(null);       // { doc_id, filename, risky_clauses_found }
  const [messages, setMessages] = useState([]);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDocUploaded = (result, filename) => {
    setDoc({ ...result, filename });
    setMessages([{
      role: 'assistant',
      content: `✅ **${filename}** uploaded and analysed.\n\n` +
        (result.risky_clauses_found?.length
          ? `⚠️ **${result.risky_clauses_found.length} potential issues found:**\n` +
            result.risky_clauses_found.map(f => `• ${f}`).join('\n')
          : '✅ No obvious risky clauses detected on initial scan.') +
        `\n\nAsk me anything about this contract.`,
      citations: []
    }]);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚖️</span>
          <div>
            <h1 className="text-xl font-bold text-white">LexAI</h1>
            <p className="text-xs text-gray-400">Legal Document Assistant for African SMEs</p>
          </div>
        </div>
        {doc && (
          <button
            onClick={() => setTicketOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            🚨 Request Lawyer Review
          </button>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 flex overflow-hidden">
        {!doc ? (
          <div className="flex-1 flex items-center justify-center">
            <DocumentUpload onUploaded={handleDocUploaded} />
          </div>
        ) : (
          <ChatPanel
            doc={doc}
            messages={messages}
            setMessages={setMessages}
            sessionId={SESSION_ID}
            loading={loading}
            setLoading={setLoading}
          />
        )}
      </main>

      {ticketOpen && (
        <TicketModal
          doc={doc}
          onClose={() => setTicketOpen(false)}
        />
      )}
    </div>
  );
}

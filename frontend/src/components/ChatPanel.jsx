import { useEffect, useRef } from 'react';
import { sendMessage } from '../api/client';
import ClauseCard from './ClauseCard';
import InputBar from './InputBar';
import ReactMarkdown from 'react-markdown';

export default function ChatPanel({ doc, messages, setMessages, sessionId, loading, setLoading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const data = await sendMessage({ message: text, sessionId, docId: doc.doc_id });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        risky_flags: data.risky_flags
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Something went wrong. Please try again.',
        citations: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl rounded-2xl px-5 py-4 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-100'
            }`}>
              <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                {msg.content}
              </ReactMarkdown>
              {msg.citations?.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                    Sources
                  </p>
                  {msg.citations.map((c, j) => <ClauseCard key={j} citation={c} />)}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl px-5 py-4">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <InputBar onSend={handleSend} disabled={loading} />
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { Bot, User, AlertCircle, Quote } from 'lucide-react';
import { motion as _motion, AnimatePresence } from 'framer-motion';
const motion = _motion;
import ReactMarkdown from 'react-markdown';
import ClauseCard from './ClauseCard';
import InputBar from './InputBar';
import { sendMessage } from '../api/client';

export default function ChatPanel({ doc, messages, setMessages, sessionId, loading, setLoading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (text) => {
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const data = await sendMessage({ message: text, sessionId, docId: doc.doc_id });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        risky_flags: data.risky_flags,
        disclaimer: data.disclaimer
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Connection lost. Unable to reach the LexAI engine.',
        citations: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface/30 relative">
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-8 space-y-8 custom-scrollbar relative z-0">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            
            return (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[85%] lg:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* Avatar */}
                  <div className="flex-shrink-0 mt-1">
                    {isUser ? (
                      <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-900/50">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center shadow-lg">
                        <Bot className="w-4 h-4 text-primary-400" />
                      </div>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={`
                    relative rounded-2xl px-5 py-4 shadow-md 
                    ${isUser 
                      ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-tr-sm' 
                      : 'glass border border-white/5 text-zinc-200 rounded-tl-sm'
                    }
                  `}>
                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-a:text-primary-300">
                      <ReactMarkdown>{msg.content?.split('\n\n⚠️ *This is not')[0] || msg.content}</ReactMarkdown>
                    </div>

                    {/* Citations */}
                    {msg.citations?.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-white/10">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <Quote className="w-3 h-3" /> Sources Cited
                        </p>
                        <div className="grid gap-2">
                          {msg.citations.map((c, j) => <ClauseCard key={j} citation={c} />)}
                        </div>
                      </div>
                    )}

                    {/* Disclaimer appended neatly */}
                    {!isUser && msg.content?.includes('⚠️ *This is not') && (
                      <div className="mt-4 pt-3 border-t border-white/5 flex gap-2 text-zinc-500">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <p className="text-xs italic leading-tight">
                          This is not legal advice. LexAI provides information only. Please consult a qualified lawyer before making decisions based on this analysis.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {loading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start w-full"
          >
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary-400" />
              </div>
              <div className="glass border border-white/5 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2 h-12">
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="w-1.5 h-1.5 bg-primary-400 rounded-full" />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1.5 h-1.5 bg-primary-400 rounded-full" />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1.5 h-1.5 bg-primary-400 rounded-full" />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>
      
      <InputBar onSend={handleSend} disabled={loading} />
    </div>
  );
}

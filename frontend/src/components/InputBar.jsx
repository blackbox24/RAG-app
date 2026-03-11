import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SUGGESTED = [
  "Can they terminate without notice?",
  "What are my payment obligations?",
  "Are there any automatic renewals?",
  "What happens if I break this contract?"
];

export default function InputBar({ onSend, disabled }) {
  const [val, setVal] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [val]);

  const submit = () => {
    if (!val.trim() || disabled) return;
    onSend(val.trim());
    setVal('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-white/5 bg-surface/50 backdrop-blur-xl p-4 md:p-6 relative z-10">
      
      {/* Suggested chips array */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SUGGESTED.map((s, i) => (
          <motion.button 
            key={i} 
            onClick={() => onSend(s)} 
            disabled={disabled}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 text-[11px] md:text-xs bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 font-medium tracking-wide"
          >
            <Sparkles className="w-3 h-3 text-primary-400" />
            {s}
          </motion.button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto flex gap-3 md:gap-4 items-end relative">
        <textarea
          ref={textareaRef}
          rows={1}
          className="flex-1 bg-zinc-900 text-white rounded-2xl px-5 py-3.5 pr-12 outline-none border border-white/10 focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition-all resize-none shadow-inner text-sm md:text-base placeholder:text-zinc-600 custom-scrollbar"
          placeholder="Ask AlexAI about your contract... (Shift+Enter for newline)"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        
        <AnimatePresence>
          {val.trim() && !disabled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-20 bottom-3.5 top-auto pointer-events-none text-xs font-semibold text-primary-400 bg-primary-950/80 px-2 py-0.5 rounded-md border border-primary-500/20"
            >
              Enter to send
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button 
          whileHover={!disabled && val.trim() ? { scale: 1.05 } : {}}
          whileTap={!disabled && val.trim() ? { scale: 0.95 } : {}}
          onClick={submit} 
          disabled={disabled || !val.trim()}
          className={`
            p-3.5 rounded-2xl flex items-center justify-center transition-all shadow-lg
            ${disabled || !val.trim() 
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5' 
              : 'bg-primary-600 hover:bg-primary-500 text-white border border-primary-400/30'
            }
          `}
        >
          <Send className={`w-5 h-5 ${val.trim() && !disabled ? 'ml-0.5' : ''}`} />
        </motion.button>
      </div>
    </div>
  );
}

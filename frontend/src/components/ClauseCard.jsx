import { FileSearch } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ClauseCard({ citation }) {
  // Convert 0.95 to 95%
  const score = Math.round(citation.relevance_score * 100);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-zinc-900/80 rounded-xl p-4 border border-white/5 relative overflow-hidden group hover:border-primary-500/30 transition-colors"
    >
      <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-primary-400 to-indigo-600 rounded-l-xl"></div>
      
      <div className="flex justify-between items-start mb-2 pl-2">
        <div className="flex items-center gap-2">
          <FileSearch className="w-3.5 h-3.5 text-primary-400" />
          <p className="text-xs font-semibold text-primary-300 truncate max-w-[200px]" title={citation.source}>
            {citation.source}
          </p>
        </div>
        
        {/* Modern relevance badge */}
        <div className="bg-primary-950/50 border border-primary-500/20 px-2 py-0.5 rounded text-[10px] font-mono text-primary-300 flex items-center gap-1.5">
          <span>Match: {score}%</span>
          <div className="w-8 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary-500 to-indigo-400 rounded-full" 
              style={{ width: `${score}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      <p className="text-xs text-zinc-400 leading-relaxed italic pl-2 border-l border-white/5 ml-1 mt-3">
        "{citation.text?.trim()}"
      </p>
    </motion.div>
  );
}

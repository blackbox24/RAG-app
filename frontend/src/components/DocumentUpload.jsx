import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { uploadDocument } from '../api/client';

export default function DocumentUpload({ onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const onDrop = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadDocument(file);
      onUploaded(result, file.name);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [onUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1
  });

  return (
    <div className="max-w-xl w-full mx-4">
      <div className="text-center mb-10">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]"
        >
          <FileText className="w-8 h-8 text-primary-400" />
        </motion.div>
        
        <h2 className="text-4xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400 tracking-tight">
          Understand Your Contract
        </h2>
        <p className="text-zinc-400 text-lg max-w-md mx-auto leading-relaxed">
          Upload any legal document. LexAI will scan for risks and answer your questions in plain English.
        </p>
      </div>

      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div
          {...getRootProps()}
          className={`
            relative overflow-hidden
            border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300
            ${isDragActive 
              ? 'border-primary-500 bg-primary-900/20 shadow-[0_0_40px_rgba(99,102,241,0.15)]' 
              : 'border-white/10 glass hover:border-primary-500/50 hover:bg-white/5'}
          `}
        >
          <input {...getInputProps()} />
          
          <AnimatePresence mode="wait">
            {uploading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center space-y-4"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-primary-500/20"></div>
                  <Loader2 className="w-16 h-16 text-primary-500 animate-spin absolute top-0 left-0" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-white">Analyzing Document...</p>
                  <p className="text-sm text-primary-300 mt-1">Extracting clauses and vectorizing text</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center text-zinc-300 relative z-10"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                >
                  <UploadCloud className={`w-16 h-16 mb-6 ${isDragActive ? 'text-primary-400' : 'text-zinc-500'}`} />
                </motion.div>
                
                <p className="text-xl font-semibold text-white mb-2">
                  {isDragActive ? 'Drop your contract here' : 'Drag & drop your PDF contract'}
                </p>
                <p className="text-zinc-500">or click to browse local files</p>
                
                <div className="flex items-center gap-4 mt-8 pt-6 border-t border-white/5 w-full justify-center">
                  <span className="text-xs bg-zinc-800/50 text-zinc-400 px-3 py-1.5 rounded-md font-medium">PDF Only</span>
                  <span className="text-xs bg-zinc-800/50 text-zinc-400 px-3 py-1.5 rounded-md font-medium">Max 10MB</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* subtle background decoration */}
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary-500/10 blur-[50px] rounded-full pointer-events-none"></div>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mt-6 bg-red-500/10 border border-red-500/20 flex items-center gap-3 p-4 rounded-xl text-red-400"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

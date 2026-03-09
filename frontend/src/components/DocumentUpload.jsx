import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
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
    <div className="max-w-lg w-full mx-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Understand Your Contract</h2>
        <p className="text-gray-400">Upload any contract or legal document. Ask questions in plain English.</p>
      </div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition
          ${isDragActive ? 'border-blue-500 bg-blue-950' : 'border-gray-600 hover:border-gray-400'}`}
      >
        <input {...getInputProps()} />
        <div className="text-5xl mb-4">{uploading ? '⏳' : '📄'}</div>
        <p className="text-lg font-medium">
          {uploading ? 'Analysing document...' :
           isDragActive ? 'Drop your contract here' :
           'Drag & drop your PDF contract'}
        </p>
        <p className="text-sm text-gray-500 mt-2">or click to browse • PDF only • max 10MB</p>
      </div>
      {error && <p className="text-red-400 text-center mt-4">{error}</p>}
    </div>
  );
}

import { useState } from 'react';

const SUGGESTED = [
  "Can they terminate without notice?",
  "What are my payment obligations?",
  "Are there any automatic renewals?",
  "What happens if I break this contract?"
];

export default function InputBar({ onSend, disabled }) {
  const [val, setVal] = useState('');

  const submit = () => {
    if (!val.trim() || disabled) return;
    onSend(val.trim());
    setVal('');
  };

  return (
    <div className="border-t border-gray-800 p-4">
      <div className="flex flex-wrap gap-2 mb-3">
        {SUGGESTED.map((s, i) => (
          <button key={i} onClick={() => onSend(s)} disabled={disabled}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-full transition">
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <input
          className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask about your contract..."
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
        <button onClick={submit} disabled={disabled || !val.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-5 rounded-xl transition font-medium">
          Send
        </button>
      </div>
    </div>
  );
}

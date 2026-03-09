// WHY this component: makes citations VISIBLE.
// This is what proves to judges that RAG is actually working.
export default function ClauseCard({ citation }) {
  return (
    <div className="bg-gray-700 rounded-lg p-3 border-l-4 border-blue-500">
      <p className="text-xs font-semibold text-blue-400 mb-1">{citation.source}</p>
      <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">{citation.text}</p>
      <p className="text-xs text-gray-500 mt-1">
        Relevance: {(citation.relevance_score * 100).toFixed(0)}%
      </p>
    </div>
  );
}

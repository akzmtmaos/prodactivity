import React, { useEffect, useState } from 'react';

interface TermsModalProps {
  open: boolean;
  onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ open, onClose }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      fetch('http://localhost:8000/api/terms/latest/')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch Terms and Conditions');
          return res.json();
        })
        .then(data => {
          setContent(data.content || 'No Terms and Conditions found.');
        })
        .catch(() => setError('Could not load Terms and Conditions.'))
        .finally(() => setLoading(false));
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4 text-indigo-700">Terms and Conditions</h2>
        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="prose max-h-96 overflow-y-auto" style={{ whiteSpace: 'pre-wrap' }}>{content}</div>
        )}
      </div>
    </div>
  );
};

export default TermsModal; 
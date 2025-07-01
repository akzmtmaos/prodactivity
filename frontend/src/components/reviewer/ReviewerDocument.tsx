import React from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';

interface Reviewer {
  id: number;
  title: string;
  content: string;
  source_note_title?: string;
  source_notebook_name?: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  tags: string[];
}

interface ReviewerDocumentProps {
  reviewer: Reviewer;
  onClose: () => void;
}

const ReviewerDocument: React.FC<ReviewerDocumentProps> = ({ reviewer, onClose }) => {
  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-2xl p-6 relative flex flex-col max-h-[80vh]">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold focus:outline-none"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{reviewer.title}</h2>
        <div className="overflow-y-auto flex-1 p-2 text-base text-gray-900 dark:text-white">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <ReactMarkdown>{reviewer.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modal, document.body);
};

export default ReviewerDocument; 
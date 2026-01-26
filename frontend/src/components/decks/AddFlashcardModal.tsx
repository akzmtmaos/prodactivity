import React, { useState } from 'react';
import { X } from 'lucide-react';
import ReactDOM from 'react-dom';

interface AddFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFlashcard: (flashcard: { question: string; answer: string }) => void;
}

const AddFlashcardModal: React.FC<AddFlashcardModalProps> = ({ isOpen, onClose, onAddFlashcard }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && answer.trim()) {
      onAddFlashcard({ question: question.trim(), answer: answer.trim() });
      setQuestion('');
      setAnswer('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Add Flashcard
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Question
            </label>
            <textarea
              id="question"
              rows={3}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Enter your question"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="answer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Answer
            </label>
            <textarea
              id="answer"
              rows={3}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Enter your answer"
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Add Flashcard
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddFlashcardModal; 
import React, { useState } from 'react';
import { X, Plus, Pencil, Trash2 } from 'lucide-react';
import ReactDOM from 'react-dom';
import PageLayout from '../PageLayout';

interface FlashcardData {
  id: string;
  question: string;
  answer: string;
}

interface ManageFlashcardsProps {
  isOpen: boolean;
  deckTitle: string;
  flashcards: FlashcardData[];
  onClose: () => void;
  onAddFlashcard: (flashcard: Omit<FlashcardData, 'id'>) => void;
  onUpdateFlashcard: (id: string, flashcard: Omit<FlashcardData, 'id'>) => void;
  onDeleteFlashcard: (id: string) => void;
}

const ManageFlashcards: React.FC<ManageFlashcardsProps> = ({
  isOpen,
  deckTitle,
  flashcards,
  onClose,
  onAddFlashcard,
  onUpdateFlashcard,
  onDeleteFlashcard,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCard, setNewCard] = useState({ question: '', answer: '' });
  const [editingCard, setEditingCard] = useState({ question: '', answer: '' });

  const handleAddCard = () => {
    if (newCard.question.trim() && newCard.answer.trim()) {
      onAddFlashcard(newCard);
      setNewCard({ question: '', answer: '' });
      setIsAdding(false);
    }
  };

  const handleUpdateCard = () => {
    if (editingId && editingCard.question.trim() && editingCard.answer.trim()) {
      onUpdateFlashcard(editingId, editingCard);
      setEditingId(null);
      setEditingCard({ question: '', answer: '' });
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Manage Flashcards - {deckTitle}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6">
          {/* Add New Card Button */}
          <div className="mb-8">
            {!isAdding ? (
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add New Card
              </button>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
                <div>
                  <label htmlFor="question" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Question
                  </label>
                  <textarea
                    id="question"
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    value={newCard.question}
                    onChange={(e) => setNewCard({ ...newCard, question: e.target.value })}
                    placeholder="Enter your question"
                  />
                </div>
                <div>
                  <label htmlFor="answer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Answer
                  </label>
                  <textarea
                    id="answer"
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    value={newCard.answer}
                    onChange={(e) => setNewCard({ ...newCard, answer: e.target.value })}
                    placeholder="Enter your answer"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setIsAdding(false);
                      setNewCard({ question: '', answer: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCard}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add Card
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Flashcards List */}
          <div className="flex flex-col gap-4 w-full">
            {flashcards.map((flashcard) => (
              <div
                key={flashcard.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
              >
                {editingId === flashcard.id ? (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor={`edit-question-${flashcard.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Question
                      </label>
                      <textarea
                        id={`edit-question-${flashcard.id}`}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                        value={editingCard.question}
                        onChange={(e) => setEditingCard({ ...editingCard, question: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor={`edit-answer-${flashcard.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Answer
                      </label>
                      <textarea
                        id={`edit-answer-${flashcard.id}`}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                        value={editingCard.answer}
                        onChange={(e) => setEditingCard({ ...editingCard, answer: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingCard({ question: '', answer: '' });
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateCard}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative group flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Question</h3>
                        <p className="mt-1 text-gray-800 dark:text-gray-200 text-sm break-words">{flashcard.question}</p>
                      </div>
                      {/* Triple Dots Menu */}
                      <div className="relative">
                        <button
                          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(editingId === flashcard.id ? null : flashcard.id + '-menu');
                          }}
                          aria-label="More options"
                        >
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
                        </button>
                        {/* Dropdown Menu */}
                        {editingId === flashcard.id + '-menu' && (
                          <div className="absolute right-0 mt-2 w-28 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                            <button
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                              onClick={() => {
                                setEditingId(flashcard.id);
                                setEditingCard({ question: flashcard.question, answer: flashcard.answer });
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
                              onClick={() => onDeleteFlashcard(flashcard.id)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-2">Answer</h3>
                      <p className="mt-1 text-gray-800 dark:text-gray-200 text-sm break-words">{flashcard.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ManageFlashcards;
import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import ReactDOM from 'react-dom';

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
  /** Optional: bulk delete in one shot (avoids stale state when deleting many) */
  onBulkDeleteFlashcards?: (ids: string[]) => void;
}

const ManageFlashcards: React.FC<ManageFlashcardsProps> = ({
  isOpen,
  deckTitle,
  flashcards,
  onClose,
  onAddFlashcard,
  onUpdateFlashcard,
  onDeleteFlashcard,
  onBulkDeleteFlashcards,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCard, setNewCard] = useState({ question: '', answer: '' });
  const [editingCard, setEditingCard] = useState({ question: '', answer: '' });

  // Bulk delete flashcards (Delete Section) – same pattern as Decks/Notebooks
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedFlashcardsForDelete, setSelectedFlashcardsForDelete] = useState<string[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

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

  const handleBulkDeleteFlashcards = () => {
    if (selectedFlashcardsForDelete.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      if (onBulkDeleteFlashcards) {
        onBulkDeleteFlashcards(selectedFlashcardsForDelete);
      } else {
        selectedFlashcardsForDelete.forEach((id) => onDeleteFlashcard(id));
      }
      setSelectedFlashcardsForDelete([]);
      setShowBulkDeleteModal(false);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Manage Flashcards - {deckTitle}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
          >
            <X size={24} />
          </button>
        </div>
        {/* Filter / toolbar row: Delete (multi-select) – same as Decks/Notebooks */}
        {flashcards.length > 0 && (
          <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <button
              type="button"
              onClick={() => {
                setSelectedFlashcardsForDelete([]);
                setShowBulkDeleteModal(true);
              }}
              className="px-2 h-7 text-xs border border-red-200 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-1.5"
              aria-label="Delete multiple cards"
              title="Delete multiple cards"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        )}
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
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Question</h3>
                        <p className="mt-1 text-gray-800 dark:text-gray-200 text-sm break-words">{flashcard.question}</p>
                      </div>
                      {/* Actions: Delete button (visible) + More menu */}
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => onDeleteFlashcard(flashcard.id)}
                          className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          aria-label="Delete flashcard"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(editingId === flashcard.id ? null : flashcard.id + '-menu');
                            }}
                            aria-label="More options"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
                          </button>
                          {editingId === flashcard.id + '-menu' && (
                            <div className="absolute right-0 mt-2 w-28 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                              <button
                                type="button"
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                                onClick={() => {
                                  setEditingId(flashcard.id);
                                  setEditingCard({ question: flashcard.question, answer: flashcard.answer });
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg flex items-center gap-2"
                                onClick={() => onDeleteFlashcard(flashcard.id)}
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
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

      {/* Bulk Delete Flashcards Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40 dark:bg-black/60"
            onClick={() => {
              if (!bulkDeleteLoading) {
                setShowBulkDeleteModal(false);
                setSelectedFlashcardsForDelete([]);
              }
            }}
          />
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="relative flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-[#333333] max-w-2xl w-full max-h-[85vh] overflow-hidden z-[101]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Delete Flashcards</h3>
                <button
                  type="button"
                  onClick={() => {
                    if (!bulkDeleteLoading) {
                      setShowBulkDeleteModal(false);
                      setSelectedFlashcardsForDelete([]);
                    }
                  }}
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  disabled={bulkDeleteLoading}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 py-3">
                <p className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Select flashcards to delete. This cannot be undone.
                </p>
                {selectedFlashcardsForDelete.length > 0 && (
                  <p className="flex-shrink-0 mb-2 text-xs text-red-600 dark:text-red-400">
                    {selectedFlashcardsForDelete.length} card{selectedFlashcardsForDelete.length !== 1 ? 's' : ''} selected for deletion
                  </p>
                )}
                <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  {flashcards.map((flashcard) => (
                    <div
                      key={flashcard.id}
                      className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        id={`fc-bulk-${flashcard.id}`}
                        checked={selectedFlashcardsForDelete.includes(flashcard.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFlashcardsForDelete((prev) => [...prev, flashcard.id]);
                          } else {
                            setSelectedFlashcardsForDelete((prev) => prev.filter((id) => id !== flashcard.id));
                          }
                        }}
                        disabled={bulkDeleteLoading}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`fc-bulk-${flashcard.id}`}
                        className="ml-4 flex-1 cursor-pointer min-w-0"
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {flashcard.question || '(No question)'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {flashcard.answer || '(No answer)'}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0 px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-xl flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!bulkDeleteLoading) {
                      setShowBulkDeleteModal(false);
                      setSelectedFlashcardsForDelete([]);
                    }
                  }}
                  disabled={bulkDeleteLoading}
                  className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkDeleteFlashcards}
                  disabled={selectedFlashcardsForDelete.length === 0 || bulkDeleteLoading}
                  className="px-2.5 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkDeleteLoading
                    ? 'Deleting…'
                    : `Delete${selectedFlashcardsForDelete.length > 0 ? ` (${selectedFlashcardsForDelete.length})` : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default ManageFlashcards;
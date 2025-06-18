import React, { useState } from 'react';
import { X, Plus, Pencil, Trash2 } from 'lucide-react';

interface FlashcardData {
  id: string;
  question: string;
  answer: string;
}

interface ManageFlashcardsProps {
  deckTitle: string;
  flashcards: FlashcardData[];
  onClose: () => void;
  onAddFlashcard: (flashcard: Omit<FlashcardData, 'id'>) => void;
  onUpdateFlashcard: (id: string, flashcard: Omit<FlashcardData, 'id'>) => void;
  onDeleteFlashcard: (id: string) => void;
}

const ManageFlashcards: React.FC<ManageFlashcardsProps> = ({
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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center space-x-2">
                <span className="text-gray-600 dark:text-gray-400">Decks</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-gray-900 dark:text-white font-medium">{deckTitle}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
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
          <div className="space-y-4">
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
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Question</h3>
                      <p className="mt-2 text-gray-600 dark:text-gray-400">{flashcard.question}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Answer</h3>
                      <p className="mt-2 text-gray-600 dark:text-gray-400">{flashcard.answer}</p>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setEditingId(flashcard.id);
                          setEditingCard({
                            question: flashcard.question,
                            answer: flashcard.answer,
                          });
                        }}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Pencil size={20} />
                      </button>
                      <button
                        onClick={() => onDeleteFlashcard(flashcard.id)}
                        className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageFlashcards;
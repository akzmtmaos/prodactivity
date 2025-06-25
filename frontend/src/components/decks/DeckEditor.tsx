import React, { useState } from 'react';
import { X, Plus, Edit, Trash2, Save } from 'lucide-react';

interface FlashcardData {
  id: string;
  front: string;
  back: string;
  created_at: string;
  updated_at: string;
}

interface Deck {
  id: number;
  title: string;
  description: string;
  notebook: number;
  notebook_name: string;
  created_at: string;
  updated_at: string;
  flashcards: FlashcardData[];
  is_deleted: boolean;
  progress: number;
  lastStudied: string;
}

interface DeckEditorProps {
  deck: Deck | null;
  isNewDeck: boolean;
  onSave: (deck: Deck) => void;
  onDelete: (deck: Deck) => void;
  onBack: () => void;
  isSaving: boolean;
}

const DeckEditor: React.FC<DeckEditorProps> = ({
  deck,
  isNewDeck,
  onSave,
  onDelete,
  onBack,
  isSaving,
}) => {
  const [title, setTitle] = useState(deck?.title || '');
  const [description, setDescription] = useState(deck?.description || '');
  const [flashcards, setFlashcards] = useState<FlashcardData[]>(deck?.flashcards || []);
  const [editingFlashcard, setEditingFlashcard] = useState<FlashcardData | null>(null);
  const [newFlashcard, setNewFlashcard] = useState({ front: '', back: '' });

  const handleAddFlashcard = () => {
    if (!newFlashcard.front.trim() || !newFlashcard.back.trim()) return;

    const flashcard: FlashcardData = {
      id: Date.now().toString(),
      front: newFlashcard.front.trim(),
      back: newFlashcard.back.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setFlashcards([...flashcards, flashcard]);
    setNewFlashcard({ front: '', back: '' });
  };

  const handleUpdateFlashcard = (id: string) => {
    if (!editingFlashcard) return;

    const updatedFlashcards = flashcards.map(f =>
      f.id === id
        ? {
            ...f,
            front: editingFlashcard.front.trim(),
            back: editingFlashcard.back.trim(),
            updated_at: new Date().toISOString(),
          }
        : f
    );

    setFlashcards(updatedFlashcards);
    setEditingFlashcard(null);
  };

  const handleDeleteFlashcard = (id: string) => {
    setFlashcards(flashcards.filter(f => f.id !== id));
  };

  const handleSave = () => {
    if (!title.trim()) return;

    const updatedDeck: Deck = {
      ...deck!,
      title: title.trim(),
      description: description.trim(),
      flashcards,
      updated_at: new Date().toISOString(),
    };

    onSave(updatedDeck);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isNewDeck ? 'Create New Deck' : 'Edit Deck'}
          </h2>
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Deck Info */}
          <div className="mb-6">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Deck title"
              className="w-full mb-4 p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deck description"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              rows={3}
            />
          </div>

          {/* Flashcards */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Flashcards
            </h3>

            {/* Add new flashcard */}
            <div className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <input
                type="text"
                value={newFlashcard.front}
                onChange={(e) => setNewFlashcard({ ...newFlashcard, front: e.target.value })}
                placeholder="Front"
                className="w-full mb-2 p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
              <input
                type="text"
                value={newFlashcard.back}
                onChange={(e) => setNewFlashcard({ ...newFlashcard, back: e.target.value })}
                placeholder="Back"
                className="w-full mb-2 p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={handleAddFlashcard}
                className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                <Plus size={16} className="inline mr-1" />
                Add Flashcard
              </button>
            </div>

            {/* Flashcards list */}
            <div className="space-y-4">
              {flashcards.map((flashcard) => (
                <div key={flashcard.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  {editingFlashcard?.id === flashcard.id ? (
                    <>
                      <input
                        type="text"
                        value={editingFlashcard.front}
                        onChange={(e) =>
                          setEditingFlashcard({ ...editingFlashcard, front: e.target.value })
                        }
                        className="w-full mb-2 p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                      <input
                        type="text"
                        value={editingFlashcard.back}
                        onChange={(e) =>
                          setEditingFlashcard({ ...editingFlashcard, back: e.target.value })
                        }
                        className="w-full mb-2 p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateFlashcard(flashcard.id)}
                          className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          <Save size={16} className="inline mr-1" />
                          Save
                        </button>
                        <button
                          onClick={() => setEditingFlashcard(null)}
                          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-gray-900 dark:text-white mb-2">
                            <span className="font-medium">Front:</span> {flashcard.front}
                          </p>
                          <p className="text-gray-900 dark:text-white">
                            <span className="font-medium">Back:</span> {flashcard.back}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => setEditingFlashcard(flashcard)}
                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteFlashcard(flashcard.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div>
            {!isNewDeck && (
              <button
                onClick={() => deck && onDelete(deck)}
                className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 size={16} className="inline mr-1" />
                Delete Deck
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onBack}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Deck'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckEditor; 
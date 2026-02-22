import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface EditDeckModalProps {
  isOpen: boolean;
  deck: {
    id: string;
    title: string;
  };
  onClose: () => void;
  onUpdateDeck: (deckId: string, deckData: { title: string }) => void;
}

const EditDeckModal: React.FC<EditDeckModalProps> = ({
  isOpen,
  deck,
  onClose,
  onUpdateDeck
}) => {
  const [title, setTitle] = useState(deck.title);

  // Update title when deck prop changes
  useEffect(() => {
    if (isOpen && deck) {
      setTitle(deck.title);
    }
  }, [isOpen, deck]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onUpdateDeck(deck.id, { title: title.trim() });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl w-full max-w-md mx-4 border border-gray-200 dark:border-[#333333]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-[#333333]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Edit Deck</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-3">
          <label
            htmlFor="edit-deck-title"
            className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1"
          >
            Deck Title
          </label>
          <input
            type="text"
            id="edit-deck-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter deck title"
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-[#333333] rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-[#252525] text-gray-900 dark:text-white placeholder-gray-400"
            required
            maxLength={30}
            autoFocus
          />
          {title.length === 30 && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">Maximum 30 characters reached</p>
          )}

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2.5 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDeckModal;
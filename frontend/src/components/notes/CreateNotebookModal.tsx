import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CreateNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNotebook: (notebookData: { name: string }) => void;
}

const CreateNotebookModal: React.FC<CreateNotebookModalProps> = ({
  isOpen,
  onClose,
  onCreateNotebook
}) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreateNotebook({ name: name.trim() });
      setName('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop – neutral (no blue tint), same as Find Friends panel */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative bg-white dark:bg-[#1e1e1e] rounded-md shadow-xl w-full max-w-md mx-4 border border-gray-200 dark:border-[#333333]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#333333]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Create New Notebook
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-3">
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1.5"
            >
              Notebook Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter notebook name"
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-[#333333] rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-[#252525] text-gray-900 dark:text-white"
              required
              maxLength={100}
            />
            {name.length === 100 && (
              <p className="text-xs text-red-500 mt-1">Maximum 100 characters reached</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors"
            >
              Create Notebook
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNotebookModal; 
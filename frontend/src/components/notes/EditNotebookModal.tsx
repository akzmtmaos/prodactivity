import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface EditNotebookModalProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onSave: (newName: string) => void;
}

const EditNotebookModal: React.FC<EditNotebookModalProps> = ({ isOpen, currentName, onClose, onSave }) => {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(name.trim() || 'Untitled Notebook');
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1e1e1e] rounded-md shadow-xl w-full max-w-md mx-4 border border-gray-200 dark:border-[#333333]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-[#333333]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Edit Notebook Name</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-4 py-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-[#333333] rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-[#252525] text-gray-900 dark:text-white placeholder-gray-400"
            placeholder="Enter notebook name"
            maxLength={100}
            autoFocus
          />
          {name.length === 100 && (
            <p className="text-xs text-red-500 mt-1">Maximum 100 characters reached</p>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2.5 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditNotebookModal; 
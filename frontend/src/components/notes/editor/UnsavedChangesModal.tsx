// frontend/src/components/notes/editor/UnsavedChangesModal.tsx
import React from 'react';
import { X } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onStay: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onStay,
  onDiscard,
  onSave,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop – click = stay on page */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onStay}
        aria-hidden
      />
      <div
        className="relative bg-white dark:bg-[#1e1e1e] rounded-md shadow-xl w-full max-w-md mx-4 border border-gray-200 dark:border-[#333333]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#333333]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Unsaved changes
          </h2>
          <button
            onClick={onStay}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
            aria-label="Stay on this page"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
          You have unsaved changes. What would you like to do before leaving this note?
        </div>

        <div className="px-4 py-3 border-t border-gray-200 dark:border-[#333333] flex justify-end gap-2">
          <button
            type="button"
            onClick={onStay}
            className="px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-md font-medium transition-colors"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="px-2.5 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-2.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesModal;


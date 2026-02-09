// frontend/src/components/notes/editor/UnsavedChangesModal.tsx
import React from 'react';

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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 dark:bg-black/60">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Save Changes?</h2>
        <p className="mb-4 text-gray-700 dark:text-gray-300">
          You have unsaved changes. Would you like to save them before leaving?
        </p>
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            onClick={onStay}
          >
            Stay
          </button>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={onDiscard}
          >
            Discard
          </button>
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesModal;


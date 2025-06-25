import React from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deckTitle: string;
  loading?: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  deckTitle,
  loading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: 0, padding: 0 }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-1 bg-red-100 dark:bg-red-900/20 rounded-lg mr-2">
              <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Delete Deck
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mr-3">
              <Trash2 size={16} className="text-red-600 dark:text-red-400" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-0.5">
                Are you sure?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm m-0">
                Delete <span className="font-medium">"{deckTitle}"</span>? This cannot be undone.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-2 py-1 bg-red-600 text-white rounded font-medium text-sm flex items-center justify-center transition-colors ${
                loading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-red-700'
              }`}
            >
              {loading ? (
                <span className="inline-block animate-spin mr-1 h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
              ) : (
                <Trash2 size={14} className="mr-1" />
              )}
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
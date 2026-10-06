import React from 'react';
import { X, Trash2, AlertTriangle, Users } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black/30 dark:bg-black/60 transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-[#1a1a1a] text-left shadow-xl border border-gray-200 dark:border-[#2a2a2a] transition-all sm:w-full sm:max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FDE8E8] dark:bg-red-900/30 shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
              </div>
              <h2 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                Delete Deck
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 dark:text-[#666666] hover:text-gray-600 dark:hover:text-[#888888] rounded-md hover:bg-gray-100 dark:hover:bg-[#242424] transition-colors"
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 py-4">
            <p className="text-sm text-gray-600 dark:text-white/80 m-0">
              Delete <span className="font-medium text-gray-900 dark:text-white">"{deckTitle}"</span>? This cannot be undone.
            </p>
          </div>

          {/* Footer with line */}
          <div className="px-5 py-3 border-t border-gray-200 dark:border-[#2a2a2a] flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-2.5 py-1.5 text-xs text-gray-700 dark:text-white border border-gray-300 dark:border-[#333333] rounded-md font-medium bg-white dark:bg-[#242424] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>              <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                loading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700 dark:bg-[#e60000] dark:hover:bg-[#c20000]'
              }`}
            >
              {loading ? (
                <span className="inline-block h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
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
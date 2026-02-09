import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 dark:bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Modal - dtrack-region-ix style */}
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="relative transform overflow-hidden rounded-md bg-white dark:bg-[#1e1e1e] text-left shadow-xl border border-gray-200 dark:border-[#333333] transition-all sm:my-8 sm:w-full sm:max-w-lg">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="px-4 py-4">
            {/* Icon */}
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>

            {/* Title and Message */}
            <div className="mt-3 text-center">
              <h3 className="text-sm font-semibold leading-5 text-gray-900 dark:text-white">
                {title}
              </h3>
              <div className="mt-1.5">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {message}
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex w-full justify-center rounded-md bg-white dark:bg-[#333333] px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-[#333333] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] sm:w-auto"
              >
                {cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="inline-flex w-full justify-center rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-500 sm:w-auto"
              >
                {confirmLabel || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal; 
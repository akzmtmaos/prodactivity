import React from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

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
        className="fixed inset-0 bg-black/30 dark:bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-[#1a1a1a] text-left shadow-xl border border-gray-200 dark:border-[#2a2a2a] transition-all sm:w-full sm:max-w-md">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-3">
            {/* Icon - rounded square with pink background */}
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FDE8E8] dark:bg-red-900/30 shrink-0">
              <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
            </div>
            {/* Title */}
            <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              {title}
            </h3>
            {/* Spacer */}
            <div className="flex-1" />
            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1 text-gray-400 dark:text-[#666666] hover:text-gray-600 dark:hover:text-[#888888] rounded-md hover:bg-gray-100 dark:hover:bg-[#242424] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Header divider */}
          <div className="h-px bg-gray-200 dark:bg-[#2a2a2a] px-5" />

          {/* Body */}
          <div className="px-5 py-4">
            <p className="text-sm text-gray-600 dark:text-white/80 leading-relaxed">
              {message}
            </p>
          </div>

          {/* Body divider */}
          <div className="h-px bg-gray-200 dark:bg-[#2a2a2a] px-5" />

          {/* Footer / Buttons */}
          <div className="flex items-center justify-end gap-2 px-5 py-3">
            {/* Cancel button */}
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 text-xs text-gray-700 dark:text-white border border-gray-300 dark:border-[#333333] rounded-md font-medium bg-white dark:bg-[#242424] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors"
            >
              {cancelLabel || 'Cancel'}
            </button>
            {/* Confirm/Delete button */}
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 dark:bg-[#b55353] dark:hover:bg-[#c76363] transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {confirmLabel || 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal; 
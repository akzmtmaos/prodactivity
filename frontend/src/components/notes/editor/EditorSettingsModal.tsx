// frontend/src/components/notes/editor/EditorSettingsModal.tsx
import React from 'react';
import { X, FileUp, Download } from 'lucide-react';

interface EditorSettingsModalProps {
  isOpen: boolean;
  pageView: boolean;
  onClose: () => void;
  onTogglePageView: (checked: boolean) => void;
  onImportDocument: () => void;
  onExportDocument: () => void;
}

const EditorSettingsModal: React.FC<EditorSettingsModalProps> = ({
  isOpen,
  pageView,
  onClose,
  onTogglePageView,
  onImportDocument,
  onExportDocument,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop – neutral, same as notebook modals */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative bg-white dark:bg-[#1e1e1e] rounded-md shadow-xl w-full max-w-md mx-4 border border-gray-200 dark:border-[#333333]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#333333]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Document Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-4 text-sm">
          {/* Import & Export */}
          <div className="border-b border-gray-200 dark:border-[#333333] pb-3">
            <h3 className="text-xs font-medium text-gray-900 dark:text-white mb-2">
              Import & Export
            </h3>
            <div className="space-y-1.5">
              <button
                onClick={() => {
                  onClose();
                  onImportDocument();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <FileUp size={16} />
                <span className="text-left truncate">Import document (PDF / Word)</span>
              </button>
              
              <button
                onClick={() => {
                  onClose();
                  onExportDocument();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-green-50 dark:bg-green-900/20 text-xs text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <Download size={16} />
                <span className="text-left truncate">Export Document (PDF / Word)</span>
              </button>
            </div>
          </div>

          {/* View options */}
          <div>
            <h3 className="text-xs font-medium text-gray-900 dark:text-white mb-2">
              View options
            </h3>
            <label className="flex items-center justify-between px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700">
              <div>
                <div className="text-xs font-medium text-gray-900 dark:text-white">Page view</div>
                <div className="text-[11px] text-gray-600 dark:text-gray-400">Show document in page format</div>
              </div>
              <input 
                type="checkbox" 
                checked={pageView} 
                onChange={(e) => onTogglePageView(e.target.checked)}
                className="text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-[#333333] flex justify-end">
          <button
            onClick={onClose}
            className="px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorSettingsModal;


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
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Document Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Import & Export
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  onClose();
                  onImportDocument();
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <FileUp size={20} />
                <div className="text-left">
                  <div className="font-medium">Import Document</div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Upload PDF or Word documents</div>
                </div>
              </button>
              
              <button
                onClick={() => {
                  onClose();
                  onExportDocument();
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <Download size={20} />
                <div className="text-left">
                  <div className="font-medium">Export Document</div>
                  <div className="text-sm text-green-600 dark:text-green-400">Download as PDF or Word</div>
                </div>
              </button>
            </div>
          </div>

          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Document Tools
            </h3>
            <div className="space-y-2">
              {/* Table option removed - now available in toolbar */}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              View Options
            </h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Page View</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Show document in page format</div>
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
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorSettingsModal;


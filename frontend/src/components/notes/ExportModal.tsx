import React, { useState } from 'react';
import { X, Download, FileText, FileDown } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'pdf' | 'doc') => void;
  isExporting: boolean;
  noteCount: number;
}

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  isExporting,
  noteCount
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'doc'>('pdf');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Export Notes
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Export {noteCount} note{noteCount !== 1 ? 's' : ''} to your preferred format.
          </p>

          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="pdf"
                checked={selectedFormat === 'pdf'}
                onChange={(e) => setSelectedFormat(e.target.value as 'pdf' | 'doc')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex items-center space-x-2">
                <FileText className="text-red-500" size={20} />
                <span className="text-gray-900 dark:text-white">PDF Document</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="doc"
                checked={selectedFormat === 'doc'}
                onChange={(e) => setSelectedFormat(e.target.value as 'pdf' | 'doc')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex items-center space-x-2">
                <FileDown className="text-blue-500" size={20} />
                <span className="text-gray-900 dark:text-white">Word Document</span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={() => onExport(selectedFormat)}
            disabled={isExporting}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Export</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;

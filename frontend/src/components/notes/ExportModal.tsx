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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop – neutral, consistent with other note modals */}
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
            Export Notes
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
            aria-label="Close export"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3 text-sm">
          <p className="text-gray-600 dark:text-gray-400">
            Export {noteCount} note{noteCount !== 1 ? 's' : ''} to your preferred format.
          </p>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="pdf"
                checked={selectedFormat === 'pdf'}
                onChange={(e) => setSelectedFormat(e.target.value as 'pdf' | 'doc')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex items-center gap-2">
                <FileText className="text-red-500" size={18} />
                <span className="text-xs text-gray-900 dark:text-white">PDF document</span>
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="doc"
                checked={selectedFormat === 'doc'}
                onChange={(e) => setSelectedFormat(e.target.value as 'pdf' | 'doc')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex items-center gap-2">
                <FileDown className="text-blue-500" size={18} />
                <span className="text-xs text-gray-900 dark:text-white">Word document</span>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-[#333333] flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onExport(selectedFormat)}
            disabled={isExporting}
            className="px-2.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download size={14} />
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

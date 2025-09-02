import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Download, Upload, FileText, FileDown, Plus } from 'lucide-react';

interface ImportExportDropdownProps {
  onImport: () => void;
  onExportNotebook: () => void;
  onExportSingleNote?: (noteId: number) => void;
  onExportSelectedNotes?: () => void;
  selectedNoteId?: number;
  hasNotes: boolean;
  notebookName?: string;
}

const ImportExportDropdown: React.FC<ImportExportDropdownProps> = ({
  onImport,
  onExportNotebook,
  onExportSingleNote,
  onExportSelectedNotes,
  selectedNoteId,
  hasNotes,
  notebookName
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportSingleNote = () => {
    if (selectedNoteId && onExportSingleNote) {
      onExportSingleNote(selectedNoteId);
    }
    setIsOpen(false);
  };

  const handleExportSelectedNotes = () => {
    if (onExportSelectedNotes) {
      onExportSelectedNotes();
    }
    setIsOpen(false);
  };

  const handleExportNotebook = () => {
    onExportNotebook();
    setIsOpen(false);
  };

  const handleImport = () => {
    onImport();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
      >
        <Plus size={16} />
        <span className="font-medium">Import/Export</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-2">
            {/* Import Section */}
            <div className="mb-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-2">
                Import
              </h3>
              <button
                onClick={handleImport}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <Upload size={16} className="text-blue-500" />
                <span>Import Notes</span>
              </button>
            </div>

            {/* Export Section */}
            <div className="mb-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-2">
                Export
              </h3>
              
              {/* Export Notebook */}
              <button
                onClick={handleExportNotebook}
                disabled={!hasNotes}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText size={16} className="text-green-500" />
                <div className="flex-1">
                  <span>Export Notebook</span>
                  {notebookName && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {notebookName}
                    </div>
                  )}
                </div>
              </button>

              {/* Export Single Note */}
              {selectedNoteId && onExportSingleNote && (
                <button
                  onClick={handleExportSingleNote}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <FileDown size={16} className="text-purple-500" />
                  <span>Export Current Note</span>
                </button>
              )}

              {/* Export Selected Notes */}
              {onExportSelectedNotes && (
                <button
                  onClick={handleExportSelectedNotes}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <Download size={16} className="text-orange-500" />
                  <span>Export Selected Notes</span>
                </button>
              )}
            </div>

            {/* Export Format Info */}
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <FileText size={12} />
                <span>Supports PDF & DOC formats</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportExportDropdown;

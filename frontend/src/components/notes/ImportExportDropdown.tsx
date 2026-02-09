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
        <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#252525] rounded-lg border border-gray-200 dark:border-[#333333] shadow z-50 py-1">
          <div className="p-1.5">
            {/* Import Section */}
            <div className="mb-1">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2.5 py-1">Import</p>
              <button
                onClick={handleImport}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] rounded-md transition-colors"
              >
                <Upload size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span>Import Notes</span>
              </button>
            </div>

            {/* Export Section */}
            <div className="mb-1">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2.5 py-1">Export</p>
              <button
                onClick={handleExportNotebook}
                disabled={!hasNotes}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span>Export Notebook</span>
                  {notebookName && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{notebookName}</div>
                  )}
                </div>
              </button>
              {selectedNoteId && onExportSingleNote && (
                <button
                  onClick={handleExportSingleNote}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] rounded-md transition-colors"
                >
                  <FileDown size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <span>Export Current Note</span>
                </button>
              )}
              {onExportSelectedNotes && (
                <button
                  onClick={handleExportSelectedNotes}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] rounded-md transition-colors"
                >
                  <Download size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <span>Export Selected Notes</span>
                </button>
              )}
            </div>

            <div className="px-2.5 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-[#333333] mt-1">
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

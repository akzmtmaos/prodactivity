import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface NotesHeaderProps {
  currentView: 'notebooks' | 'notes';
  selectedNotebook: any;
  notesCount: number;
  onBackToNotebooks?: () => void;
  onGlobalSearch?: () => void;
}

const NotesHeader: React.FC<NotesHeaderProps> = ({
  currentView,
  selectedNotebook,
  notesCount,
  onBackToNotebooks,
  onGlobalSearch,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {currentView === 'notes' && onBackToNotebooks && (
          <button
            onClick={onBackToNotebooks}
            className="p-2 mt-1 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            aria-label="Back to notebooks"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {currentView === 'notes' && selectedNotebook ? selectedNotebook.name : 'Notebooks'}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {currentView === 'notebooks'
              ? 'Create and manage your notebooks'
              : `${notesCount} ${notesCount === 1 ? 'note' : 'notes'}`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotesHeader;

import React from 'react';
import { ChevronLeft } from 'lucide-react';
import HelpButton from '../HelpButton';

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
  const notebooksHelpContent = (
    <div>
      <p className="font-semibold mb-2">Notebooks Management</p>
      <ul className="space-y-1 text-xs">
        <li>• <strong>Notebooks:</strong> Organize your notes into different categories</li>
        <li>• <strong>Create Notes:</strong> Click the + button to add new notes</li>
        <li>• <strong>Markdown Support:</strong> Use # ## ### for headings, - for lists</li>
        <li>• <strong>AI Features:</strong> Get summaries, chat, and insights for your notes</li>
        <li>• <strong>Search:</strong> Find notes by title, content, or date</li>
        <li>• <strong>Archive:</strong> Move old notes to archive to keep things organized</li>
        <li>• <strong>Color Coding:</strong> Use different colors to categorize notebooks</li>
      </ul>
    </div>
  );

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            {currentView === 'notes' && selectedNotebook ? selectedNotebook.name : 'Notebooks'}
            <HelpButton content={notebooksHelpContent} title="Notebooks Help" />
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

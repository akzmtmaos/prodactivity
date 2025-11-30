import React from 'react';
import { Search } from 'lucide-react';
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
  const notesHelpContent = (
    <div>
      <p className="font-semibold mb-2">Notes Management</p>
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
    <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          Notes
          <HelpButton content={notesHelpContent} title="Notes Help" />
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
          {currentView === 'notebooks'
            ? 'Create and manage your notes'
            : `Notes in ${selectedNotebook?.name || ''}`}
        </p>
      </div>
      {/* Global Search Button - Top Right */}
      {onGlobalSearch && (
        <div className="mt-4 sm:mt-0">
          <button
            onClick={onGlobalSearch}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            <Search size={16} />
            <span>Search</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default NotesHeader;

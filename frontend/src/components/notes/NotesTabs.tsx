import React from 'react';

interface NotesTabsProps {
  currentView: 'notebooks' | 'notes';
  activeTab: 'notes' | 'logs' | 'archived';
  setActiveTab: (tab: 'notes' | 'logs' | 'archived') => void;
  activeNotebookTab: 'notebooks' | 'archived';
  setActiveNotebookTab: (tab: 'notebooks' | 'archived') => void;
}

const NotesTabs: React.FC<NotesTabsProps> = ({
  currentView,
  activeTab,
  setActiveTab,
  activeNotebookTab,
  setActiveNotebookTab,
}) => {
  if (currentView === 'notebooks') {
    return (
      <div>
        <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-8">
          <button
            onClick={() => setActiveNotebookTab('notebooks')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
              activeNotebookTab === 'notebooks'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            Notebooks
          </button>
          <button
            onClick={() => setActiveNotebookTab('archived')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
              activeNotebookTab === 'archived'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            Archived
          </button>
        </div>
      </div>
    );
  }
  if (currentView === 'notes') {
    return (
      <div>
        <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-8">
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
              activeTab === 'notes'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            Notes
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
              activeTab === 'archived'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            Archived
          </button>
        </div>
      </div>
    );
  }
  return null;
};

export default NotesTabs;

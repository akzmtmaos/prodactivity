import React from 'react';
import SearchBar from './SearchBar';

interface NotesHeaderProps {
  currentView: 'notebooks' | 'notes';
  selectedNotebook: any;
  notesCount: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterType: 'all' | 'title' | 'content' | 'date';
  setFilterType: (type: 'all' | 'title' | 'content' | 'date') => void;
  notebookSearchTerm: string;
  setNotebookSearchTerm: (term: string) => void;
  notebookFilterType: 'all' | 'name' | 'date';
  setNotebookFilterType: (type: 'all' | 'name' | 'date') => void;
  onBackToNotebooks?: () => void;
}

const NotesHeader: React.FC<NotesHeaderProps> = ({
  currentView,
  selectedNotebook,
  notesCount,
  searchTerm,
  setSearchTerm,
  filterType,
  setFilterType,
  notebookSearchTerm,
  setNotebookSearchTerm,
  notebookFilterType,
  setNotebookFilterType,
  onBackToNotebooks,
}) => {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {currentView === 'notebooks' ? 'Notes' : 'Notes'}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
          {currentView === 'notebooks'
            ? 'Create and manage your notes'
            : `Notes in ${selectedNotebook?.name || ''}`}
        </p>
      </div>
      {/* Search and Filter Bar - Show for both notebooks and notes */}
      {currentView === 'notebooks' && (
        <>
          {/* Search and Filter Bar for Notebooks - Desktop */}
          <div className="hidden sm:flex items-center gap-2 mt-4 sm:mt-0 justify-end w-full sm:w-auto">
            <select
              value={notebookFilterType}
              onChange={e => setNotebookFilterType(e.target.value as 'all' | 'name' | 'date')}
              className="h-10 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ minWidth: '100px' }}
            >
              <option value="all">All</option>
              <option value="name">Name</option>
              <option value="date">Date</option>
            </select>
            <div className="w-64">
              <SearchBar
                searchTerm={notebookSearchTerm}
                onSearchChange={setNotebookSearchTerm}
                placeholder="Search notebooks..."
                inputClassName="h-10"
                noMargin
              />
            </div>
          </div>
          {/* Search and Filter Bar for Notebooks - Mobile */}
          <div className="sm:hidden mb-6">
            <div className="flex gap-3">
              <div className="flex-1">
                <SearchBar
                  searchTerm={notebookSearchTerm}
                  onSearchChange={setNotebookSearchTerm}
                  placeholder="Search notebooks..."
                  inputClassName="h-12 text-base"
                  noMargin
                />
              </div>
              <div className="w-32">
                <select
                  value={notebookFilterType}
                  onChange={e => setNotebookFilterType(e.target.value as 'all' | 'name' | 'date')}
                  className="w-full h-12 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All</option>
                  <option value="name">Name</option>
                  <option value="date">Date</option>
                </select>
              </div>
            </div>
          </div>
        </>
      )}
      {currentView === 'notes' && (
        <>
          {/* Search and Filter Bar - Desktop */}
          <div className="hidden sm:flex items-center gap-2 mt-4 sm:mt-0 justify-end w-full sm:w-auto">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as 'all' | 'title' | 'content' | 'date')}
              className="h-10 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ minWidth: '100px' }}
            >
              <option value="all">All</option>
              <option value="title">Title</option>
              <option value="content">Content</option>
              <option value="date">Date</option>
            </select>
            <div className="w-64">
              <SearchBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                placeholder="Search notes..."
                inputClassName="h-10"
                noMargin
              />
            </div>
          </div>
          {/* Search and Filter Bar - Mobile */}
          <div className="sm:hidden mb-6">
            <div className="flex gap-3">
              <div className="flex-1">
                <SearchBar
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  placeholder="Search notes..."
                  inputClassName="h-12 text-base"
                  noMargin
                />
              </div>
              <div className="w-32">
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as 'all' | 'title' | 'content' | 'date')}
                  className="w-full h-12 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All</option>
                  <option value="title">Title</option>
                  <option value="content">Content</option>
                  <option value="date">Date</option>
                </select>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotesHeader;

import React from 'react';
import SearchBar from './SearchBar';
import { Search, AlertTriangle, ArrowUpDown, Brain } from 'lucide-react';
import HelpButton from '../HelpButton';

interface NotesHeaderProps {
  currentView: 'notebooks' | 'notes';
  selectedNotebook: any;
  notesCount: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterType: 'title' | 'content' | 'date';
  setFilterType: (type: 'title' | 'content' | 'date') => void;
  notebookSearchTerm: string;
  setNotebookSearchTerm: (term: string) => void;
  notebookFilterType: 'name' | 'date';
  setNotebookFilterType: (type: 'name' | 'date') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  notebookSortOrder: 'asc' | 'desc';
  setNotebookSortOrder: (order: 'asc' | 'desc') => void;
  noteDateStart: string;
  noteDateEnd: string;
  setNoteDateStart: (d: string) => void;
  setNoteDateEnd: (d: string) => void;
  notebookDateStart: string;
  notebookDateEnd: string;
  setNotebookDateStart: (d: string) => void;
  setNotebookDateEnd: (d: string) => void;
  onBackToNotebooks?: () => void;
  onGlobalSearch?: () => void;
  onAIInsights?: () => void;
  isSearching?: boolean;
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
  sortOrder,
  setSortOrder,
  notebookSortOrder,
  setNotebookSortOrder,
  noteDateStart,
  noteDateEnd,
  setNoteDateStart,
  setNoteDateEnd,
  notebookDateStart,
  notebookDateEnd,
  setNotebookDateStart,
  setNotebookDateEnd,
  onBackToNotebooks,
  onGlobalSearch,
  onAIInsights,
  isSearching = false,
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
          {currentView === 'notebooks' ? 'Notes' : 'Notes'}
          <HelpButton content={notesHelpContent} title="Notes Help" />
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
          {currentView === 'notebooks'
            ? 'Create and manage your notes'
            : `Notes in ${selectedNotebook?.name || ''}`}
        </p>
      </div>
      
      {/* Filter Bar and Global Search - Show for both notebooks and notes */}
      {currentView === 'notebooks' && (
        <>
          {/* Filter Bar for Notebooks - Desktop */}
          <div className="hidden sm:flex items-center gap-2 mt-4 sm:mt-0 justify-end w-full sm:w-auto">
            <select
              value={notebookFilterType}
              onChange={e => setNotebookFilterType(e.target.value as 'name' | 'date')}
              className="h-10 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ minWidth: '100px' }}
            >
              <option value="name">By name</option>
              <option value="date">By date</option>
            </select>
            {notebookFilterType === 'date' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={notebookDateStart}
                  onChange={e => setNotebookDateStart(e.target.value)}
                  className="h-10 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-2 text-sm"
                />
                <span className="text-gray-500 dark:text-gray-400 text-sm">to</span>
                <input
                  type="date"
                  value={notebookDateEnd}
                  onChange={e => setNotebookDateEnd(e.target.value)}
                  className="h-10 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-2 text-sm"
                />
                {(notebookDateStart || notebookDateEnd) && (
                  <button
                    onClick={() => { setNotebookDateStart(''); setNotebookDateEnd(''); }}
                    className="h-10 px-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
            <button
              onClick={() => setNotebookSortOrder(notebookSortOrder === 'asc' ? 'desc' : 'asc')}
              className="h-10 px-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
              title={`Sort ${notebookSortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              <ArrowUpDown size={16} />
              <span className="text-xs font-medium">{notebookSortOrder.toUpperCase()}</span>
            </button>
            <button
              onClick={onGlobalSearch}
              className="h-10 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              <Search size={16} />
              <span className="font-medium">Search</span>
            </button>
          </div>
          {/* Filter Bar for Notebooks - Mobile */}
          <div className="sm:hidden mb-6">
            <div className="flex gap-3">
              <button
                onClick={onGlobalSearch}
                className="h-12 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <Search size={16} />
                <span className="font-medium">Search</span>
              </button>
              <div className="w-32">
                <select
                  value={notebookFilterType}
                  onChange={e => setNotebookFilterType(e.target.value as 'name' | 'date')}
                  className="w-full h-12 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="name">By name</option>
                  <option value="date">By date</option>
                </select>
              </div>
              {notebookFilterType === 'date' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={notebookDateStart}
                    onChange={e => setNotebookDateStart(e.target.value)}
                    className="h-12 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-2 text-base"
                  />
                  <span className="text-gray-500 dark:text-gray-400 text-sm">to</span>
                  <input
                    type="date"
                    value={notebookDateEnd}
                    onChange={e => setNotebookDateEnd(e.target.value)}
                    className="h-12 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-2 text-base"
                  />
                  {(notebookDateStart || notebookDateEnd) && (
                    <button
                      onClick={() => { setNotebookDateStart(''); setNotebookDateEnd(''); }}
                      className="h-12 px-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-sm"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
              <button
                onClick={() => setNotebookSortOrder(notebookSortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-12 px-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                title={`Sort ${notebookSortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <ArrowUpDown size={16} />
                <span className="text-xs font-medium">{notebookSortOrder.toUpperCase()}</span>
              </button>
            </div>
          </div>
        </>
      )}
      
      {currentView === 'notes' && (
        <>
          {/* Filter Bar for Notes - Desktop */}
          <div className="hidden sm:flex items-center gap-2 mt-4 sm:mt-0 justify-end w-full sm:w-auto">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as 'title' | 'content' | 'date')}
              className="h-10 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ minWidth: '100px' }}
            >
              <option value="title">Title</option>
              <option value="content">Content</option>
              <option value="date">Date</option>
            </select>
            {filterType === 'date' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={noteDateStart}
                  onChange={e => setNoteDateStart(e.target.value)}
                  className="h-10 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-2 text-sm"
                />
                <span className="text-gray-500 dark:text-gray-400 text-sm">to</span>
                <input
                  type="date"
                  value={noteDateEnd}
                  onChange={e => setNoteDateEnd(e.target.value)}
                  className="h-10 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-2 text-sm"
                />
                {(noteDateStart || noteDateEnd) && (
                  <button
                    onClick={() => { setNoteDateStart(''); setNoteDateEnd(''); }}
                    className="h-10 px-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="h-10 px-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              <ArrowUpDown size={16} />
              <span className="text-xs font-medium">{sortOrder.toUpperCase()}</span>
            </button>
            <button
              onClick={onGlobalSearch}
              className="h-10 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              <Search size={16} />
              <span className="font-medium">Search</span>
            </button>
            {/* AI Insights Button - Show when viewing notes */}
            {selectedNotebook && (
              <button
                onClick={onAIInsights}
                className="h-10 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
                title="Get AI-powered insights and recommendations"
              >
                <Brain size={16} />
                <span className="font-medium">Insights</span>
              </button>
            )}
          </div>
          {/* Filter Bar for Notes - Mobile */}
          <div className="sm:hidden mb-6">
            <div className="flex gap-3">
              <button
                onClick={onGlobalSearch}
                className="h-12 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <Search size={16} />
                <span className="font-medium">Search</span>
              </button>
              <div className="w-32">
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as 'title' | 'content' | 'date')}
                  className="w-full h-12 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="title">Title</option>
                  <option value="content">Content</option>
                  <option value="date">Date</option>
                </select>
              </div>
              {filterType === 'date' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={noteDateStart}
                    onChange={e => setNoteDateStart(e.target.value)}
                    className="h-12 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-2 text-base"
                  />
                  <span className="text-gray-500 dark:text-gray-400 text-sm">to</span>
                  <input
                    type="date"
                    value={noteDateEnd}
                    onChange={e => setNoteDateEnd(e.target.value)}
                    className="h-12 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-2 text-base"
                  />
                  {(noteDateStart || noteDateEnd) && (
                    <button
                      onClick={() => { setNoteDateStart(''); setNoteDateEnd(''); }}
                      className="h-12 px-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-sm"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-12 px-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <ArrowUpDown size={16} />
                <span className="text-xs font-medium">{sortOrder.toUpperCase()}</span>
              </button>
              {/* AI Insights Button - Show when viewing notes */}
              {selectedNotebook && (
                <button
                  onClick={onAIInsights}
                  className="h-12 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
                  title="Get AI-powered insights and recommendations"
                >
                  <Brain size={16} />
                  <span className="font-medium">AI Insights</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotesHeader;

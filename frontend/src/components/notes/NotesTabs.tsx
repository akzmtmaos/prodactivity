import React from 'react';
import { Search, ArrowUpDown, Plus, Brain, Clock, Trash2, Download, Upload } from 'lucide-react';

interface NotesTabsProps {
  currentView: 'notebooks' | 'notes';
  activeTab: 'notes' | 'logs' | 'archived';
  setActiveTab: (tab: 'notes' | 'logs' | 'archived') => void;
  activeNotebookTab: 'notebooks' | 'favorites' | 'archived';
  setActiveNotebookTab: (tab: 'notebooks' | 'favorites' | 'archived') => void;
  // Notebook search and filter props
  notebookSearchTerm?: string;
  setNotebookSearchTerm?: (term: string) => void;
  notebookFilterType?: 'name' | 'date';
  setNotebookFilterType?: (type: 'name' | 'date') => void;
  notebookSortOrder?: 'asc' | 'desc';
  setNotebookSortOrder?: (order: 'asc' | 'desc') => void;
  notebookDateStart?: string;
  notebookDateEnd?: string;
  setNotebookDateStart?: (d: string) => void;
  setNotebookDateEnd?: (d: string) => void;
  // Note search and filter props
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  filterType?: 'title' | 'content' | 'date';
  setFilterType?: (type: 'title' | 'content' | 'date') => void;
  sortOrder?: 'asc' | 'desc';
  setSortOrder?: (order: 'asc' | 'desc') => void;
  noteDateStart?: string;
  noteDateEnd?: string;
  setNoteDateStart?: (d: string) => void;
  setNoteDateEnd?: (d: string) => void;
  // Action buttons
  onGlobalSearch?: () => void;
  onAIInsights?: () => void;
  onCreateNotebook?: () => void;
  onBulkDeleteNotebooks?: () => void;
  selectedNotebook?: any;
  notebooksCount?: number;
  // Note action buttons
  onBulkDeleteNotes?: () => void;
  onImportNotes?: () => void;
  onExportNotes?: () => void;
  onAddNote?: () => void;
  isImporting?: boolean;
  isExporting?: boolean;
  notesCount?: number;
}

const NotesTabs: React.FC<NotesTabsProps> = ({
  currentView,
  activeTab,
  setActiveTab,
  activeNotebookTab,
  setActiveNotebookTab,
  notebookSearchTerm = '',
  setNotebookSearchTerm,
  notebookFilterType = 'name',
  setNotebookFilterType,
  notebookSortOrder = 'asc',
  setNotebookSortOrder,
  notebookDateStart = '',
  notebookDateEnd = '',
  setNotebookDateStart,
  setNotebookDateEnd,
  searchTerm = '',
  setSearchTerm,
  filterType = 'title',
  setFilterType,
  sortOrder = 'desc',
  setSortOrder,
  noteDateStart = '',
  noteDateEnd = '',
  setNoteDateStart,
  setNoteDateEnd,
  onGlobalSearch,
  onAIInsights,
  onCreateNotebook,
  onBulkDeleteNotebooks,
  selectedNotebook,
  notebooksCount = 0,
  onBulkDeleteNotes,
  onImportNotes,
  onExportNotes,
  onAddNote,
  isImporting = false,
  isExporting = false,
  notesCount = 0,
}) => {
  if (currentView === 'notebooks') {
    return (
      <div>
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 mb-2 gap-4 flex-wrap">
          <div className="flex space-x-4">
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
              onClick={() => setActiveNotebookTab('favorites')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeNotebookTab === 'favorites'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Favorites
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
          {/* Filters next to tabs - WITHOUT search input and Add Notebook button */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Type */}
            <div className="flex items-center gap-1">
              <Clock size={18} className="text-gray-400" />
              <select
                value={notebookFilterType}
                onChange={(e) => setNotebookFilterType?.(e.target.value as 'name' | 'date')}
                className="px-2 h-[38px] text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="name">By name</option>
                <option value="date">By date</option>
              </select>
            </div>
            {/* Date Range (if date filter is selected) */}
            {notebookFilterType === 'date' && (notebookDateStart || notebookDateEnd) && (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={notebookDateStart}
                  onChange={(e) => setNotebookDateStart?.(e.target.value)}
                  className="px-2 h-[38px] text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">to</span>
                <input
                  type="date"
                  value={notebookDateEnd}
                  onChange={(e) => setNotebookDateEnd?.(e.target.value)}
                  className="px-2 h-[38px] text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {(notebookDateStart || notebookDateEnd) && (
                  <button
                    onClick={() => { setNotebookDateStart?.(''); setNotebookDateEnd?.(''); }}
                    className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
            {/* Sort */}
            <button
              onClick={() => setNotebookSortOrder?.(notebookSortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 h-[38px] text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
              title={`Sort ${notebookSortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              <ArrowUpDown size={16} />
              <span className="text-xs font-medium">{notebookSortOrder.toUpperCase()}</span>
            </button>
            {/* Bulk Delete Notebooks Button - Icon only, after Sort */}
            {notebooksCount > 0 && onBulkDeleteNotebooks && (
              <button
                onClick={onBulkDeleteNotebooks}
                className="px-2 h-[38px] text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center justify-center"
                title="Delete notebooks"
              >
                <Trash2 size={16} />
              </button>
            )}
            {/* Search Notebook Input - After Delete */}
            <div className="relative w-full sm:w-56">
              <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeNotebookTab}...`}
                value={notebookSearchTerm}
                onChange={(e) => setNotebookSearchTerm?.(e.target.value)}
                className="w-full pl-9 pr-3 h-[38px] text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {/* New Notebook Button - After Search */}
            {activeNotebookTab === 'notebooks' && onCreateNotebook && (
              <button
                onClick={onCreateNotebook}
                className="px-3 h-[38px] text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
              >
                <Plus size={16} />
                <span>New Notebook</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  if (currentView === 'notes') {
    return (
      <div>
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 mb-2 gap-4 flex-wrap">
          <div className="flex space-x-4">
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
          {/* Search and Filters next to tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative w-full sm:w-56">
              <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm?.(e.target.value)}
                className="w-full pl-9 pr-3 h-[38px] text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {/* Filter Type */}
            <div className="flex items-center gap-1">
              <Clock size={18} className="text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType?.(e.target.value as 'title' | 'content' | 'date')}
                className="px-2 h-[38px] text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="title">Title</option>
                <option value="content">Content</option>
                <option value="date">Date</option>
              </select>
            </div>
            {/* Date Range (if date filter is selected) */}
            {filterType === 'date' && (noteDateStart || noteDateEnd) && (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={noteDateStart}
                  onChange={(e) => setNoteDateStart?.(e.target.value)}
                  className="px-2 h-[38px] text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">to</span>
                <input
                  type="date"
                  value={noteDateEnd}
                  onChange={(e) => setNoteDateEnd?.(e.target.value)}
                  className="px-2 h-[38px] text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {(noteDateStart || noteDateEnd) && (
                  <button
                    onClick={() => { setNoteDateStart?.(''); setNoteDateEnd?.(''); }}
                    className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
            {/* Sort */}
            <button
              onClick={() => setSortOrder?.(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 h-[38px] text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              <ArrowUpDown size={16} />
              <span className="text-xs font-medium">{sortOrder.toUpperCase()}</span>
            </button>
            {/* Bulk Delete Notes Button - Icon only, after Sort */}
            {notesCount > 0 && onBulkDeleteNotes && (
              <button
                onClick={onBulkDeleteNotes}
                className="px-2 h-[38px] text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center justify-center"
                title="Delete multiple notes"
              >
                <Trash2 size={16} />
              </button>
            )}
            {/* Import Notes Button - After Delete */}
            {onImportNotes && (
              <button
                onClick={onImportNotes}
                disabled={isImporting}
                className="px-2 h-[38px] text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                title={isImporting ? 'Importing notes...' : 'Import notes'}
              >
                <Upload size={16} />
              </button>
            )}
            {/* Export Notes Button - After Import */}
            {onExportNotes && (
              <button
                onClick={onExportNotes}
                disabled={isExporting || notesCount === 0}
                className="px-2 h-[38px] text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                title={isExporting ? 'Exporting notes...' : 'Export notes'}
              >
                <Download size={16} />
              </button>
            )}
            {/* Add Note Button - After Export */}
            {onAddNote && activeTab === 'notes' && (
              <button
                onClick={onAddNote}
                className="px-3 h-[38px] text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                title="Add new note"
              >
                <Plus size={16} />
                <span>Add Note</span>
              </button>
            )}
            {/* AI Insights Button - Show when viewing notes */}
            {selectedNotebook && onAIInsights && (
              <button
                onClick={onAIInsights}
                className="px-3 h-[38px] text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
                title="Get AI-powered insights and recommendations"
              >
                <Brain size={16} />
                <span>Insights</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default NotesTabs;

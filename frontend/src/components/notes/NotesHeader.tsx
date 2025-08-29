import React from 'react';
import SearchBar from './SearchBar';
import { Search, AlertTriangle, ArrowUpDown } from 'lucide-react';

interface NotesHeaderProps {
  currentView: 'notebooks' | 'notes';
  selectedNotebook: any;
  notesCount: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterType: 'all' | 'title' | 'content' | 'date';
  setFilterType: (type: 'all' | 'title' | 'content' | 'date') => void;
  priorityFilter: 'all' | 'low' | 'medium' | 'high' | 'urgent';
  setPriorityFilter: (priority: 'all' | 'low' | 'medium' | 'high' | 'urgent') => void;
  notebookSearchTerm: string;
  setNotebookSearchTerm: (term: string) => void;
  notebookFilterType: 'all' | 'name' | 'date';
  setNotebookFilterType: (type: 'all' | 'name' | 'date') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  notebookSortOrder: 'asc' | 'desc';
  setNotebookSortOrder: (order: 'asc' | 'desc') => void;
  onBackToNotebooks?: () => void;
  onGlobalSearch?: () => void;
  onUrgentItems?: () => void;
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
  priorityFilter,
  setPriorityFilter,
  notebookSearchTerm,
  setNotebookSearchTerm,
  notebookFilterType,
  setNotebookFilterType,
  sortOrder,
  setSortOrder,
  notebookSortOrder,
  setNotebookSortOrder,
  onBackToNotebooks,
  onGlobalSearch,
  onUrgentItems,
  isSearching = false,
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
      
      {/* Filter Bar and Global Search - Show for both notebooks and notes */}
      {currentView === 'notebooks' && (
        <>
          {/* Filter Bar for Notebooks - Desktop */}
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
                  onChange={e => setNotebookFilterType(e.target.value as 'all' | 'name' | 'date')}
                  className="w-full h-12 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All</option>
                  <option value="name">Name</option>
                  <option value="date">Date</option>
                </select>
              </div>
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
              onChange={e => setFilterType(e.target.value as 'all' | 'title' | 'content' | 'date')}
              className="h-10 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ minWidth: '100px' }}
            >
              <option value="all">All</option>
              <option value="title">Title</option>
              <option value="content">Content</option>
              <option value="date">Date</option>
            </select>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value as 'all' | 'low' | 'medium' | 'high' | 'urgent')}
              className="h-10 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ minWidth: '100px' }}
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
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
            <button
              onClick={onUrgentItems}
              className="h-10 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              <AlertTriangle size={16} />
              <span className="font-medium">Urgent Items</span>
            </button>
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
                  onChange={e => setFilterType(e.target.value as 'all' | 'title' | 'content' | 'date')}
                  className="w-full h-12 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All</option>
                  <option value="title">Title</option>
                  <option value="content">Content</option>
                  <option value="date">Date</option>
                </select>
              </div>
              <div className="w-32">
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value as 'all' | 'low' | 'medium' | 'high' | 'urgent')}
                  className="w-full h-12 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-12 px-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <ArrowUpDown size={16} />
                <span className="text-xs font-medium">{sortOrder.toUpperCase()}</span>
              </button>
              <button
                onClick={onUrgentItems}
                className="h-12 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <AlertTriangle size={16} />
                <span className="font-medium">Urgent</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotesHeader;

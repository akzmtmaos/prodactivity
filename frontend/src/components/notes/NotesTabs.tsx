import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Brain, Clock, Trash2, Download, Upload, ChevronDown, LayoutList, ArrowUp, ArrowDown } from 'lucide-react';
import HeaderTooltip from '../common/HeaderTooltip';

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
  notebookListViewMode?: 'compact' | 'comfortable';
  setNotebookListViewMode?: (mode: 'compact' | 'comfortable') => void;
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
  noteListViewMode?: 'compact' | 'comfortable';
  setNoteListViewMode?: (mode: 'compact' | 'comfortable') => void;
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
  notebookListViewMode = 'comfortable',
  setNotebookListViewMode,
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
  noteListViewMode = 'comfortable',
  setNoteListViewMode,
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
  const [notebookFilterOpen, setNotebookFilterOpen] = useState(false);
  const [notesFilterOpen, setNotesFilterOpen] = useState(false);
  const notebookFilterRef = useRef<HTMLDivElement>(null);
  const notesFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notebookFilterRef.current && !notebookFilterRef.current.contains(e.target as Node)) {
        setNotebookFilterOpen(false);
      }
      if (notesFilterRef.current && !notesFilterRef.current.contains(e.target as Node)) {
        setNotesFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (currentView === 'notebooks') {
    return (
      <div>
        {/* Tabs and Filters on same line */}
        <div className="flex items-center justify-between gap-4 flex-wrap mb-0">
          {/* Tabs on left */}
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveNotebookTab('notebooks')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeNotebookTab === 'notebooks'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Notebooks
            </button>
            <button
              onClick={() => setActiveNotebookTab('favorites')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeNotebookTab === 'favorites'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Favorites
            </button>
            <button
              onClick={() => setActiveNotebookTab('archived')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeNotebookTab === 'archived'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Archived
            </button>
          </div>
          {/* Filters and Buttons on right */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Type – icon-only dropdown; tooltip below on hover */}
            <div className="relative" ref={notebookFilterRef}>
              <HeaderTooltip label={notebookFilterType === 'name' ? 'Filter by name' : 'Filter by date'}>
                <button
                  type="button"
                  onClick={() => setNotebookFilterOpen((o) => !o)}
                  className="flex items-center justify-center gap-0.5 h-7 px-2.5 text-xs border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#404040] focus:border-gray-300 dark:focus:border-[#404040] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors"
                  aria-label={notebookFilterType === 'name' ? 'Filter by name' : 'Filter by date'}
                  aria-expanded={notebookFilterOpen}
                >
                  <Clock size={14} className="text-gray-400" />
                  <ChevronDown size={10} className={`text-gray-500 dark:text-gray-400 transition-transform ${notebookFilterOpen ? 'rotate-180' : ''}`} />
                </button>
              </HeaderTooltip>
              {notebookFilterOpen && (
                <div className="absolute left-0 top-full mt-1 min-w-[88px] bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333333] rounded-lg shadow z-50 p-2">
                  <button
                    type="button"
                    onClick={() => { setNotebookFilterType?.('name'); setNotebookFilterOpen(false); }}
                    className="w-full px-3 py-2.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] rounded-md transition-colors flex items-center gap-2.5 whitespace-nowrap"
                  >
                    <Clock size={12} className="text-gray-400 flex-shrink-0" />
                    By name
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNotebookFilterType?.('date'); setNotebookFilterOpen(false); }}
                    className="w-full px-3 py-2.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] rounded-md transition-colors flex items-center gap-2.5 whitespace-nowrap"
                  >
                    <Clock size={12} className="text-gray-400 flex-shrink-0" />
                    By date
                  </button>
                </div>
              )}
            </div>
            {/* View mode toggle: icon only; tooltip below on hover (dtrack-style) */}
            <HeaderTooltip label={notebookListViewMode === 'compact' ? 'Switch to Comfortable view' : 'Switch to Compact view'}>
              <button
                type="button"
                onClick={() => setNotebookListViewMode?.(notebookListViewMode === 'compact' ? 'comfortable' : 'compact')}
                className="flex items-center justify-center h-7 px-2.5 text-xs border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#404040] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors"
                aria-label={notebookListViewMode === 'compact' ? 'Switch to Comfortable view' : 'Switch to Compact view'}
              >
                <LayoutList size={14} className="text-gray-400" />
              </button>
            </HeaderTooltip>
            {/* Date Range (if date filter is selected) */}
            {notebookFilterType === 'date' && (notebookDateStart || notebookDateEnd) && (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={notebookDateStart}
                  onChange={(e) => setNotebookDateStart?.(e.target.value)}
                  className="px-2 h-7 text-xs border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#404040]"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">to</span>
                <input
                  type="date"
                  value={notebookDateEnd}
                  onChange={(e) => setNotebookDateEnd?.(e.target.value)}
                  className="px-2 h-7 text-xs border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#404040]"
                />
                {(notebookDateStart || notebookDateEnd) && (
                  <button
                    onClick={() => { setNotebookDateStart?.(''); setNotebookDateEnd?.(''); }}
                    className="px-1.5 py-0.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
            {/* Sort – icon reflects ASC (up) / DESC (down) */}
            <HeaderTooltip label={notebookSortOrder === 'asc' ? 'Sort ascending (click for descending)' : 'Sort descending (click for ascending)'}>
              <button
                type="button"
                onClick={() => setNotebookSortOrder?.(notebookSortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center justify-center h-7 px-2.5 text-xs border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors"
                aria-label={notebookSortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
              >
                {notebookSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              </button>
            </HeaderTooltip>
            {/* Bulk Delete Notebooks Button - Icon only, tooltip below like other filters */}
            {notebooksCount > 0 && onBulkDeleteNotebooks && (
              <HeaderTooltip label="Delete notebooks">
                <button
                  onClick={onBulkDeleteNotebooks}
                  className="px-2 h-7 text-xs border border-red-200 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center"
                  aria-label="Delete notebooks"
                >
                  <Trash2 size={14} />
                </button>
              </HeaderTooltip>
            )}
            {/* Search Notebook Input - After Delete */}
            <div className="relative w-full sm:w-48">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeNotebookTab}...`}
                value={notebookSearchTerm}
                onChange={(e) => setNotebookSearchTerm?.(e.target.value)}
                className="w-full pl-7 pr-2.5 h-7 text-xs border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#404040] focus:border-gray-300 dark:focus:border-[#404040]"
              />
            </div>
            {/* New Notebook Button - After Search */}
            {activeNotebookTab === 'notebooks' && onCreateNotebook && (
              <button
                onClick={onCreateNotebook}
                className="px-2.5 h-7 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 border border-indigo-400/70 dark:border-indigo-300/50 shadow-sm"
              >
                <Plus size={14} />
                <span>New Notebook</span>
              </button>
            )}
          </div>
        </div>
        {/* HR Line - directly under tabs/filters */}
        <div className="border-b border-gray-200 dark:border-gray-700 mt-0"></div>
      </div>
    );
  }
  if (currentView === 'notes') {
    return (
      <div>
        {/* Tabs and Filters on same line */}
        <div className="flex items-center justify-between gap-4 flex-wrap mb-0">
          {/* Tabs on left */}
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeTab === 'notes'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeTab === 'archived'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Archived
            </button>
          </div>
          {/* Filters and Buttons on right – order: Filter, Date, Sort, Delete, Import, Export, Search, Add, Insights */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Type – icon-only dropdown with Clock inside (no text on trigger) */}
            <div className="relative" ref={notesFilterRef}>
              <HeaderTooltip label={filterType === 'title' ? 'Filter by title' : filterType === 'content' ? 'Filter by content' : 'Filter by date'}>
                <button
                  type="button"
                  onClick={() => setNotesFilterOpen((o) => !o)}
                  className="flex items-center justify-center gap-0.5 h-7 px-2.5 text-xs border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#404040] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors"
                  aria-label={filterType === 'title' ? 'Filter by title' : filterType === 'content' ? 'Filter by content' : 'Filter by date'}
                  aria-expanded={notesFilterOpen}
                >
                  <Clock size={14} className="text-gray-400" />
                  <ChevronDown size={10} className={`text-gray-500 dark:text-gray-400 transition-transform ${notesFilterOpen ? 'rotate-180' : ''}`} />
                </button>
              </HeaderTooltip>
              {notesFilterOpen && (
                <div className="absolute left-0 top-full mt-1 min-w-[88px] bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333333] rounded-lg shadow z-50 p-2">
                  <button type="button" onClick={() => { setFilterType?.('title'); setNotesFilterOpen(false); }} className="w-full px-3 py-2.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] rounded-md transition-colors flex items-center gap-2.5 whitespace-nowrap">
                    <Clock size={12} className="text-gray-400 flex-shrink-0" /> Title
                  </button>
                  <button type="button" onClick={() => { setFilterType?.('content'); setNotesFilterOpen(false); }} className="w-full px-3 py-2.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] rounded-md transition-colors flex items-center gap-2.5 whitespace-nowrap">
                    <Clock size={12} className="text-gray-400 flex-shrink-0" /> Content
                  </button>
                  <button type="button" onClick={() => { setFilterType?.('date'); setNotesFilterOpen(false); }} className="w-full px-3 py-2.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] rounded-md transition-colors flex items-center gap-2.5 whitespace-nowrap">
                    <Clock size={12} className="text-gray-400 flex-shrink-0" /> Date
                  </button>
                </div>
              )}
            </div>
            {/* Date Range (if date filter is selected) */}
            {filterType === 'date' && (noteDateStart || noteDateEnd) && (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={noteDateStart}
                  onChange={(e) => setNoteDateStart?.(e.target.value)}
                  className="px-2 h-7 text-xs border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#404040]"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">to</span>
                <input
                  type="date"
                  value={noteDateEnd}
                  onChange={(e) => setNoteDateEnd?.(e.target.value)}
                  className="px-2 h-7 text-xs border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#404040]"
                />
                {(noteDateStart || noteDateEnd) && (
                  <button onClick={() => { setNoteDateStart?.(''); setNoteDateEnd?.(''); }} className="px-1.5 py-0.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Clear</button>
                )}
              </div>
            )}
            {/* View mode toggle – compact / comfortable (before Sort) */}
            <HeaderTooltip label={noteListViewMode === 'compact' ? 'Switch to Comfortable view' : 'Switch to Compact view'}>
              <button
                type="button"
                onClick={() => setNoteListViewMode?.(noteListViewMode === 'compact' ? 'comfortable' : 'compact')}
                className="flex items-center justify-center h-7 px-2.5 text-xs border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#404040] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors"
                aria-label={noteListViewMode === 'compact' ? 'Switch to Comfortable view' : 'Switch to Compact view'}
              >
                <LayoutList size={14} className="text-gray-400" />
              </button>
            </HeaderTooltip>
            {/* Sort */}
            <HeaderTooltip label={sortOrder === 'asc' ? 'Sort ascending (click for descending)' : 'Sort descending (click for ascending)'}>
              <button type="button" onClick={() => setSortOrder?.(sortOrder === 'asc' ? 'desc' : 'asc')} className="flex items-center justify-center h-7 px-2.5 text-xs border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors" aria-label={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}>
                {sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              </button>
            </HeaderTooltip>
            {/* Bulk Delete Notes */}
            {notesCount > 0 && onBulkDeleteNotes && (
              <HeaderTooltip label="Delete notes">
                <button onClick={onBulkDeleteNotes} className="px-2 h-7 text-xs border border-red-200 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center" aria-label="Delete notes">
                  <Trash2 size={14} />
                </button>
              </HeaderTooltip>
            )}
            {/* Import Notes */}
            {onImportNotes && (
              <HeaderTooltip label={isImporting ? 'Importing notes...' : 'Import notes'}>
                <button onClick={onImportNotes} disabled={isImporting} className="px-2 h-7 text-xs border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center" aria-label="Import notes">
                  <Upload size={14} />
                </button>
              </HeaderTooltip>
            )}
            {/* Export Notes */}
            {onExportNotes && (
              <HeaderTooltip label={isExporting ? 'Exporting notes...' : 'Export notes'}>
                <button onClick={onExportNotes} disabled={isExporting || notesCount === 0} className="px-2 h-7 text-xs border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center" aria-label="Export notes">
                  <Download size={14} />
                </button>
              </HeaderTooltip>
            )}
            {/* Search – after Export, before Insights/Add (no tooltip) */}
            <div className="relative w-full sm:w-48">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm?.(e.target.value)}
                className="w-full pl-7 pr-2.5 h-7 text-xs border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#404040]"
              />
            </div>
            {/* AI Insights – after Search, before Add */}
            {selectedNotebook && onAIInsights && (
              <HeaderTooltip label="Get AI-powered insights and recommendations">
                <button onClick={onAIInsights} className="h-7 px-2.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 border border-indigo-400/70 dark:border-indigo-300/50 shadow-sm" aria-label="AI Insights">
                  <Brain size={14} />
                  <span>Insights</span>
                </button>
              </HeaderTooltip>
            )}
            {/* Add Note – after Insights */}
            {onAddNote && activeTab === 'notes' && (
              <HeaderTooltip label="Add new note">
                <button onClick={onAddNote} className="h-7 px-2.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 border border-indigo-400/70 dark:border-indigo-300/50 shadow-sm" aria-label="Add new note">
                  <Plus size={14} />
                  <span>Add</span>
                </button>
              </HeaderTooltip>
            )}
          </div>
        </div>
        {/* HR Line - directly under tabs/filters */}
        <div className="border-b border-gray-200 dark:border-gray-700 mt-0"></div>
      </div>
    );
  }
  return null;
};

export default NotesTabs;

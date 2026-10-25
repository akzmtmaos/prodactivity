import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, FileText, Target, CheckCircle, Calendar, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosConfig';
import { format } from 'date-fns';
import { Task } from '../../types/task';

interface Note {
  id: number;
  title: string;
  content: string;
  notebook: number;
  notebook_name: string;
  created_at: string;
  updated_at: string;
  last_visited?: string;
  is_deleted: boolean;
}

interface Deck {
  id: string;
  title: string;
  flashcardCount: number;
  progress: number;
  created_at: string;
  updated_at: string;
}

interface SearchResult {
  id: string;
  type: 'note' | 'deck' | 'task' | 'system';
  title: string;
  content?: string;
  description?: string;
  url: string;
  icon: React.ReactNode;
  category: string;
  timestamp?: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedResultIndex(-1);
      setActiveFilter('all');
    }
  }, [isOpen]);

  // Get available filter options - use type for accurate filtering (category can be ambiguous)
  const FILTER_CONFIG = [
    { key: 'all', label: 'All', type: null },
    { key: 'notes', label: 'Notes', type: 'note' as const },
    { key: 'flashcards', label: 'Flashcards', type: 'deck' as const },
    { key: 'tasks', label: 'Tasks', type: 'task' as const },
    { key: 'system', label: 'System', type: 'system' as const },
  ];

  const getAvailableFilters = () => {
    return FILTER_CONFIG.map(({ key, label, type }) => ({
      key,
      label,
      count: type === null ? searchResults.length : searchResults.filter(r => r.type === type).length
    })).filter(f => f.key === 'all' || f.count > 0); // Only show filters that have results
  };

  // Filter search results by type (not category) for accurate filtering
  const getFilteredResults = () => {
    if (activeFilter === 'all') {
      return searchResults;
    }
    const config = FILTER_CONFIG.find(f => f.key === activeFilter);
    if (!config || !config.type) return searchResults;
    return searchResults.filter(result => result.type === config.type);
  };

  // Search across all system components
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const results: SearchResult[] = [];
      const searchTerm = query.toLowerCase();

      // Search Notes - only add items that look like notes (have notebook_name/notebook)
      try {
        const notesResponse = await axiosInstance.get(`/notes/?search=${encodeURIComponent(query)}`);
        
        const notesData = notesResponse.data.results || notesResponse.data;
        if (Array.isArray(notesData)) {
          notesData.forEach((item: Note & { flashcard_count?: number; flashcardCount?: number }) => {
            // Skip if this looks like a deck (wrong API response)
            if ('flashcard_count' in item || 'flashcardCount' in item) return;
            const note = item as Note;
            results.push({
              id: note.id.toString(),
              type: 'note',
              title: note.title || 'Untitled Note',
              content: note.content,
              description: `${note.notebook_name || 'Notebook'} • ${format(new Date(note.updated_at), 'MMM d, yyyy')}`,
              url: `/notes?note=${note.id}`,
              icon: <FileText className="w-4 h-4" />,
              category: 'Notes',
              timestamp: note.updated_at
            });
          });
        }
      } catch (error) {
        console.error('Error searching notes:', error);
      }

      // Search Decks - only add items that look like decks (have deck-like fields, NOT notebook_name)
      try {
        const decksResponse = await axiosInstance.get(`/decks/decks/?search=${encodeURIComponent(query)}`);
        
        const decksData = decksResponse.data.results || decksResponse.data;
        if (Array.isArray(decksData)) {
          decksData.forEach((item: Deck & { notebook_name?: string; notebook?: number }) => {
            // Skip if this looks like a note (wrong API response) - notes have notebook_name
            if ('notebook_name' in item && item.notebook_name != null) return;
            if ('notebook' in item && item.notebook != null && !('parent' in item)) return;
            const deck = item as Deck;
            const fcCount = deck.flashcardCount ?? (deck as { flashcard_count?: number }).flashcard_count ?? 0;
            results.push({
              id: String(deck.id),
              type: 'deck',
              title: deck.title,
              description: `${fcCount} cards • ${deck.progress ?? 0}% progress`,
              url: `/decks/${deck.id}`,
              icon: <Target className="w-4 h-4" />,
              category: 'Flashcards',
              timestamp: deck.updated_at
            });
          });
        }
      } catch (error) {
        console.error('Error searching decks:', error);
      }

      // Search Tasks (exclude completed tasks)
      try {
        const tasksResponse = await axiosInstance.get(`/tasks/?search=${encodeURIComponent(query)}&completed=false`);
        
        const tasksData = tasksResponse.data.results || tasksResponse.data;
        if (Array.isArray(tasksData)) {
          tasksData.forEach((task: Task) => {
            results.push({
              id: task.id.toString(),
              type: 'task',
              title: task.title,
              content: task.description,
              description: `${task.priority} priority • Pending`,
              url: `/tasks`,
              icon: <CheckCircle className="w-4 h-4" />,
              category: 'Tasks',
              timestamp: task.dueDate
            });
          });
        }
      } catch (error) {
        console.error('Error searching tasks:', error);
      }

      // Add system-wide search results
      const systemResults = [
        {
          id: 'notes-page',
          type: 'system' as const,
          title: 'Notes',
          description: 'View and manage all your notes',
          url: '/notebooks',
          icon: <FileText className="w-4 h-4" />,
          category: 'System'
        },
        {
          id: 'decks-page',
          type: 'system' as const,
          title: 'Flashcards',
          description: 'Study with flashcards and quizzes',
          url: '/decks',
          icon: <Target className="w-4 h-4" />,
          category: 'System'
        },
        {
          id: 'tasks-page',
          type: 'system' as const,
          title: 'Tasks',
          description: 'Manage your tasks and to-dos',
          url: '/tasks',
          icon: <CheckCircle className="w-4 h-4" />,
          category: 'System'
        },
        {
          id: 'schedule-page',
          type: 'system' as const,
          title: 'Schedule',
          description: 'Plan your day and events',
          url: '/schedule',
          icon: <Calendar className="w-4 h-4" />,
          category: 'System'
        }
      ].filter(item => 
        item.title.toLowerCase().includes(searchTerm) || 
        item.description.toLowerCase().includes(searchTerm)
      );

      results.push(...systemResults);

      // Sort results by relevance and recency
      results.sort((a, b) => {
        // Prioritize exact title matches
        const aTitleMatch = a.title.toLowerCase() === searchTerm;
        const bTitleMatch = b.title.toLowerCase() === searchTerm;
        if (aTitleMatch && !bTitleMatch) return -1;
        if (!aTitleMatch && bTitleMatch) return 1;
        
        // Then by type (system items first)
        if (a.type === 'system' && b.type !== 'system') return -1;
        if (a.type !== 'system' && b.type === 'system') return 1;
        
        // Then by timestamp (newer first)
        if (a.timestamp && b.timestamp) {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        
        return 0;
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const filteredResults = getFilteredResults();

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedResultIndex(prev => 
            prev < filteredResults.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedResultIndex(prev => 
            prev > 0 ? prev - 1 : filteredResults.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedResultIndex >= 0 && selectedResultIndex < filteredResults.length) {
            handleResultClick(filteredResults[selectedResultIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedResultIndex, activeFilter]);

  // Reset selected index when search results change
  useEffect(() => {
    setSelectedResultIndex(-1);
  }, [searchResults]);

  // Reset filter when search results change
  useEffect(() => {
    setActiveFilter('all');
  }, [searchResults]);

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'note') {
      // For notes, navigate and set the note ID in localStorage
      localStorage.setItem('openNoteId', result.id);
      navigate(result.url);
    } else {
      navigate(result.url);
    }
    
    // Close modal and clear search after navigation
    setTimeout(() => {
      onClose();
      setSearchQuery('');
      setSearchResults([]);
    }, 50);
  };

  if (!isOpen) return null;

  const modalContent = (
    <>
      {/* Backdrop - covers everything including navbar (z-30) and header (z-20) */}
      <div 
        className="fixed inset-0 bg-slate-950/30 backdrop-blur-sm transition-opacity dark:bg-black/60"
        onClick={onClose}
        style={{ zIndex: 9999 }}
      />
      
      {/* Modal Container - dtrack-region-ix style */}
      <div className="fixed inset-0 z-[10000] overflow-y-auto pointer-events-none" style={{ zIndex: 10000 }}>
      
        {/* Modal - horizontally and vertically centered */}
        <div className="flex min-h-full items-center justify-center p-4 pointer-events-auto">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-slate-900/15 dark:border-[#333333] dark:bg-[#1e1e1e] dark:shadow-black/40">
          <div className="flex items-center justify-between px-5 pb-3 pt-4 sm:px-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Search your workspace</h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Find notes, tasks, flashcards, and more</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close search"
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-[#2d2d2d] dark:hover:text-gray-200"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-5 pb-4 sm:px-6">
            <div className="group relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500 dark:text-gray-500 dark:group-focus-within:text-indigo-400" size={17} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anything..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-11 text-sm text-gray-900 shadow-sm outline-none transition-all placeholder:text-gray-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-[#333333] dark:bg-[#252525] dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-500/60 dark:focus:bg-[#222222] dark:focus:ring-indigo-500/15"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-[#333333] dark:hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[min(60vh,28rem)] overflow-y-auto border-t border-gray-100 dark:border-[#333333]">
            {isSearching ? (
              <div className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                <p className="text-sm">Searching...</p>
              </div>
            ) : searchResults.length === 0 && searchQuery.trim() ? (
              <div className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                <Search size={24} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">No results for <span className="font-medium text-gray-700 dark:text-gray-200">"{searchQuery}"</span></p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Try a different search term.</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Search size={18} />
                </div>
                <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">Start typing to search</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Search across notes, tasks, flashcards, and more</p>
              </div>
            ) : (
              <>
                {/* Filter Buttons - compact */}
                {getAvailableFilters().length > 1 && (
                  <div className="border-b border-gray-100 px-4 py-3 dark:border-[#333333] sm:px-5">
                    <div className="flex flex-wrap gap-1.5">
                      {getAvailableFilters().map((filter) => (
                        <button
                          key={filter.key}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setActiveFilter(filter.key);
                            setSelectedResultIndex(-1);
                          }}
                          className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                            activeFilter === filter.key
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#2d2d2d] dark:text-gray-400 dark:hover:bg-[#383838]'
                          }`}
                        >
                          {filter.label} ({filter.count})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Search Results */}
                <div className="space-y-0.5 px-2 py-2 sm:px-3">
                  {getFilteredResults().map((result, index) => (
                    <div
                      key={result.id}
                      className={`group flex cursor-pointer items-center rounded-xl px-3 py-3 transition-colors ${
                        index === selectedResultIndex 
                          ? 'bg-indigo-50 dark:bg-indigo-500/10'
                          : 'hover:bg-gray-50 dark:hover:bg-[#252525]'
                      }`}
                      onClick={() => handleResultClick(result)}
                      onMouseEnter={() => setSelectedResultIndex(index)}
                    >
                      <div className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-indigo-600 transition-colors group-hover:bg-white dark:bg-[#303030] dark:text-indigo-400 dark:group-hover:bg-[#383838]">{result.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{result.title}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{result.description}</p>
                        {result.timestamp && (
                          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{format(new Date(result.timestamp), 'MMM d, yyyy')}</p>
                        )}
                      </div>
                      <div className="ml-2 flex shrink-0 items-center gap-2">
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                          {result.category}
                        </span>
                        <ArrowRight size={14} className="text-gray-300 transition-colors group-hover:text-indigo-500 dark:text-gray-600 dark:group-hover:text-indigo-400" />
                      </div>
                    </div>
                  ))}
                  
                  {/* No results for current filter */}
                  {getFilteredResults().length === 0 && searchResults.length > 0 && (
                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <p className="text-sm">No results found for the selected filter.</p>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveFilter('all');
                        }}
                        className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Show all results
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="border-t border-gray-100 bg-gray-50/80 px-5 py-3 dark:border-[#333333] dark:bg-[#252525] sm:px-6">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                {searchResults.length > 0 ? `${searchResults.length} result${searchResults.length === 1 ? '' : 's'} found` : ''}
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:border-[#444444] dark:bg-[#303030] dark:text-gray-400">Esc</kbd>
                <span>to close</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default GlobalSearchModal;

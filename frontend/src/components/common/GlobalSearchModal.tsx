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

      // Search Notes
      try {
        const notesResponse = await axiosInstance.get(`/notes/?search=${encodeURIComponent(query)}`);
        
        const notesData = notesResponse.data.results || notesResponse.data;
        if (Array.isArray(notesData)) {
          notesData.forEach((note: Note) => {
            results.push({
              id: note.id.toString(),
              type: 'note',
              title: note.title || 'Untitled Note',
              content: note.content,
              description: `${note.notebook_name} • ${format(new Date(note.updated_at), 'MMM d, yyyy')}`,
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

      // Search Decks
      try {
        const decksResponse = await axiosInstance.get(`/decks/decks/?search=${encodeURIComponent(query)}`);
        
        const decksData = decksResponse.data.results || decksResponse.data;
        if (Array.isArray(decksData)) {
          decksData.forEach((deck: Deck) => {
            results.push({
              id: deck.id,
              type: 'deck',
              title: deck.title,
              description: `${deck.flashcardCount} cards • ${deck.progress}% progress`,
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
          url: '/notes',
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
        className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/60 transition-opacity"
        onClick={onClose}
        style={{ zIndex: 9999 }}
      />
      
      {/* Modal Container - dtrack-region-ix style */}
      <div className="fixed inset-0 z-[10000] overflow-y-auto pointer-events-none" style={{ zIndex: 10000 }}>
      
        {/* Modal - horizontally and vertically centered */}
        <div className="flex min-h-full items-center justify-center p-4 pointer-events-auto">
          <div className="relative w-full max-w-xl bg-white dark:bg-[#171717] rounded-md shadow-xl border border-gray-200 dark:border-[#262626]">
          {/* Header - compact */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#262626]">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Search
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Input - compact like dtrack Input */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-[#262626]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, tasks, decks..."
                className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 dark:border-[#262626] bg-white dark:bg-[#202225] text-gray-900 dark:text-white placeholder-gray-400 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#262626] rounded-md transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {isSearching ? (
              <div className="py-6 px-4 text-center text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent mx-auto mb-2"></div>
                <p className="text-xs">Searching...</p>
              </div>
            ) : searchResults.length === 0 && searchQuery.trim() ? (
              <div className="py-6 px-4 text-center text-gray-500 dark:text-gray-400">
                <Search size={36} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">No results found for "{searchQuery}". Try a different search term.</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-6 px-4 text-center text-gray-500 dark:text-gray-400">
                <Search size={36} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm mb-1">Start typing to search across notes, tasks, decks, and more</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Press Esc to close</p>
              </div>
            ) : (
              <>
                {/* Filter Buttons - compact */}
                {getAvailableFilters().length > 1 && (
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-[#262626]">
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
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                            activeFilter === filter.key
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#262626] dark:text-gray-400 dark:hover:bg-[#333]'
                          }`}
                        >
                          {filter.label} ({filter.count})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Search Results */}
                <div className="py-1">
                  {getFilteredResults().map((result, index) => (
                    <div
                      key={result.id}
                      className={`flex items-center px-4 py-2.5 cursor-pointer transition-colors ${
                        index === selectedResultIndex 
                          ? 'bg-indigo-50 dark:bg-indigo-900/20' 
                          : 'hover:bg-gray-50 dark:hover:bg-[#262626]'
                      }`}
                      onClick={() => handleResultClick(result)}
                      onMouseEnter={() => setSelectedResultIndex(index)}
                    >
                      <div className="mr-3 text-indigo-600 dark:text-indigo-400">{result.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{result.title}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{result.description}</p>
                        {result.timestamp && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{format(new Date(result.timestamp), 'MMM d, yyyy')}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {result.category}
                        </span>
                        <ArrowRight size={14} className="text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  ))}
                  
                  {/* No results for current filter */}
                  {getFilteredResults().length === 0 && searchResults.length > 0 && (
                    <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
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

          {/* Footer - compact */}
          <div className="px-4 py-2.5 border-t border-gray-200 dark:border-[#262626] bg-gray-50 dark:bg-[#202225] rounded-b-md">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                {searchResults.length > 0 ? `${searchResults.length} result${searchResults.length === 1 ? '' : 's'} found` : ''}
              </span>
              <span>Press Esc to close</span>
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

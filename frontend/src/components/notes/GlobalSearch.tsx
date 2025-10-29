import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Book, Clock, Folder } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: number;
  type: 'note' | 'notebook';
  title: string;
  content: string;
  notebook_id: number;
  notebook_name: string;
  created_at: string;
  updated_at: string;
  url: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
    } else {
      setResults([]);
      setHasSearched(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await axiosInstance.get(`/notes/global-search/?q=${encodeURIComponent(query)}`);
      setResults(response.data.results || []);
    } catch (error) {
      console.error('Global search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'note') {
      // Navigate to the note with its notebook context
      navigate(`/notes/notebooks/${result.notebook_id}/notes/${result.id}`);
    } else if (result.type === 'notebook') {
      // Navigate to the notebook view
      navigate(`/notes/notebooks/${result.id}`);
    }
    onClose();
    setSearchQuery('');
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const stripHtml = (html: string) => {
    if (!html) return '';
    // Create a temporary div element to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    // Get text content and clean it up
    return temp.textContent || temp.innerText || '';
  };

  const getResultIcon = (result: SearchResult) => {
    if (result.type === 'notebook') {
      return <Folder size={20} className="text-blue-500" />;
    }
    return <FileText size={20} className="text-indigo-500" />;
  };

  const getResultBadge = (result: SearchResult) => {
    if (result.type === 'notebook') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <Folder size={12} className="mr-1" />
          Notebook
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
        <Book size={12} className="mr-1" />
        {result.notebook_name}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-start justify-center p-4 pt-16">
        <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Search
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search notes and notebooks..."
                className="w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setResults([]);
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading && (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-2"></div>
                Searching...
              </div>
            )}

            {!isLoading && hasSearched && results.length === 0 && searchQuery.trim() && (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <Search size={48} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p>No notes or notebooks found matching "{searchQuery}"</p>
              </div>
            )}

            {!isLoading && !hasSearched && (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <Search size={48} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p>Start typing to search across all your notes and notebooks</p>
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {results.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getResultIcon(result)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {result.title}
                          </h3>
                          {getResultBadge(result)}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                          {stripHtml(result.content)}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Clock size={12} className="mr-1" />
                          Updated {formatDate(result.updated_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>
                {results.length > 0 ? `${results.length} result${results.length === 1 ? '' : 's'} found` : ''}
              </span>
              <span>Press Esc to close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;

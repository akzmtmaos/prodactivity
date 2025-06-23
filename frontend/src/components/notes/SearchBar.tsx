// frontend/src/components/SearchBar.tsx
import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  placeholder?: string;
  inputClassName?: string;
  noMargin?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  searchTerm, 
  onSearchChange, 
  placeholder = "Search...",
  inputClassName = '',
  noMargin = false
}) => {
  return (
    <div className={noMargin ? '' : 'mb-6'}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-4 py-2 border border-gray-200 bg-gray-50 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${inputClassName}`}
        />
      </div>
    </div>
  );
};

export default SearchBar;
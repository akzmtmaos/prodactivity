import React, { useEffect, useState } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const safeTotal = Math.max(totalPages, 1);
  const [inputValue, setInputValue] = useState<string>(String(currentPage));

  useEffect(() => {
    setInputValue(String(currentPage));
  }, [currentPage]);

  const commitPageChange = () => {
    const num = parseInt(inputValue, 10);
    if (Number.isNaN(num)) {
      setInputValue(String(currentPage));
      return;
    }
    const clamped = Math.min(safeTotal, Math.max(1, num));
    setInputValue(String(clamped));
    if (clamped !== currentPage) {
      onPageChange(clamped);
    }
  };

  return (
    <nav className="flex justify-center" aria-label="Pagination">
      <div className="inline-flex items-stretch rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm text-xs sm:text-sm text-gray-700 dark:text-gray-200 overflow-hidden h-7">
        {/* Previous */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-2 sm:px-3 flex items-center justify-center border-r border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          aria-label="Previous page"
        >
          ‹
        </button>

        {/* Current page and total */}
        <div className="px-2 sm:px-3 flex items-center gap-1 bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700">
          <input
            type="number"
            min={1}
            max={safeTotal}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={commitPageChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitPageChange();
              }
            }}
            className="w-10 px-1 py-0.5 text-center text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
            aria-label="Current page"
          />
          <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">
            / {safeTotal}
          </span>
        </div>

        {/* Next */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(Math.max(totalPages, 1), currentPage + 1))}
          disabled={currentPage >= totalPages || totalPages <= 1}
          className="px-2 sm:px-3 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </nav>
  );
};

export default Pagination; 
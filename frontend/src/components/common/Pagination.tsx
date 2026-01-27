import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
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
        <span
          className="px-3 sm:px-4 flex items-center font-semibold bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700"
          aria-current="page"
        >
          {currentPage}
        </span>
        <span className="px-2 sm:px-3 flex items-center border-r border-gray-200 dark:border-gray-700 text-xs sm:text-sm">
          of {Math.max(totalPages, 1)}
        </span>

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
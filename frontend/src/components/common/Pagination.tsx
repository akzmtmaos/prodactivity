import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex justify-center">
      <ul className="inline-flex items-center space-x-2">
        {/* Previous button */}
        <li>
          <button
            className="px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            &lt;
          </button>
        </li>
        {/* Current page number */}
        <li>
          <button
            className="px-2.5 py-1.5 text-sm rounded-lg border border-indigo-600 bg-indigo-600 text-white cursor-default"
            aria-label={`Page ${currentPage}`}
            aria-current="page"
            disabled
          >
            {currentPage}
          </button>
        </li>
        {/* Next button */}
        <li>
          <button
            className="px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            &gt;
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination; 
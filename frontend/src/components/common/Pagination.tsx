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
      <ul className="inline-flex items-center space-x-1">
        <li>
          <button
            className="px-3 py-1 rounded-l-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous"
          >
            &lt;
          </button>
        </li>
        <li>
          <span className="px-3 py-1 border border-gray-300 dark:border-gray-700 bg-indigo-600 text-white">
            {currentPage}
          </span>
        </li>
        <li>
          <button
            className="px-3 py-1 rounded-r-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next"
          >
            &gt;
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination; 
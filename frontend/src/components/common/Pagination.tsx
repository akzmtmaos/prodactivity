import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Optional "Showing X–Y of Z" text rendered on the left (controls move right) */
  rangeText?: string;
}

/**
 * Notion-style pager:  ‹  [ current ] of total  ›
 * The current page is an editable input – type a number and press Enter.
 */
const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, rangeText }) => {
  const safeTotal = Math.max(totalPages, 1);
  const page = Math.min(Math.max(currentPage, 1), safeTotal);
  const [inputValue, setInputValue] = useState<string>(String(page));

  useEffect(() => {
    setInputValue(String(page));
  }, [page]);

  const commitPageChange = () => {
    const trimmed = inputValue.trim();
    const num = parseInt(trimmed, 10);
    if (trimmed === '' || Number.isNaN(num)) {
      setInputValue(String(page));
      return;
    }
    const clamped = Math.min(safeTotal, Math.max(1, num));
    setInputValue(String(clamped));
    if (clamped !== page) {
      onPageChange(clamped);
    }
  };

  const chevronClass =
    'flex items-center justify-center h-7 w-7 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-30 disabled:pointer-events-none';

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center gap-3 flex-wrap ${rangeText ? 'justify-between' : 'justify-center'}`}
    >
      {rangeText && (
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{rangeText}</p>
      )}

      <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] overflow-hidden">
        {/* Previous */}
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={`${chevronClass} border-r border-gray-200 dark:border-gray-700`}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Editable current page "of" total */}
        <div className="flex items-center gap-1.5 px-3">
          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={commitPageChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitPageChange();
                (e.target as HTMLInputElement).blur();
              }
            }}
            onFocus={(e) => e.target.select()}
            className="w-9 h-5 px-0.5 text-center text-xs text-gray-900 dark:text-gray-100 bg-transparent rounded border border-gray-300 dark:border-gray-600 focus:border-indigo-400 dark:focus:border-indigo-500 focus:bg-gray-50 dark:focus:bg-[#2d2d2d] focus:outline-none"
            aria-label={`Current page, page ${page} of ${safeTotal}`}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400 select-none">
            of {safeTotal}
          </span>
        </div>

        {/* Next */}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= safeTotal}
          className={`${chevronClass} border-l border-gray-200 dark:border-gray-700`}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
};

export default Pagination;

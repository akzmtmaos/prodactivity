import React from 'react';
import { format } from 'date-fns';

interface ProductivityRowProps {
  /** ISO date (YYYY-MM-DD) for the row; used when `label` is not given. */
  date?: string;
  /** Overrides the date text, e.g. a week range or a month name. */
  label?: string;
  completionRate: number;
  status: string;
  isToday?: boolean;
  /** Renders dimmed and non-interactive (periods that have not happened yet). */
  isFuture?: boolean;
  getProductivityColor: (status: string) => string;
  onClick?: () => void;
}

function formatRate(rate: number): string {
  const safe = Number.isFinite(rate) ? rate : 0;
  return `${safe % 1 === 0 ? safe.toFixed(0) : safe.toFixed(1)}%`;
}

const ProductivityRow: React.FC<ProductivityRowProps> = ({
  date,
  label,
  completionRate,
  status,
  isToday = false,
  isFuture = false,
  getProductivityColor,
  onClick,
}) => {
  const rate = Math.min(Math.max(Number.isFinite(completionRate) ? completionRate : 0, 0), 100);
  const hasTasks = status !== 'No Tasks';
  const isInteractive = Boolean(onClick) && !isFuture;

  const fillTone =
    rate >= 90 ? 'bg-green-600 dark:bg-green-400'
      : rate >= 70 ? 'bg-green-500 dark:bg-green-300'
        : rate >= 40 ? 'bg-yellow-500 dark:bg-yellow-400'
          : rate > 0 ? 'bg-red-500 dark:bg-red-400'
            : 'bg-transparent';

  // Short month keeps the date inside a single line on narrow screens.
  const labelText = label ?? (date ? format(new Date(`${date}T00:00:00`), 'MMM d, yyyy') : '—');

  return (
    <button
      type="button"
      disabled={!isInteractive}
      onClick={onClick}
      title={`${labelText} · ${formatRate(rate)} · ${status}`}
      className={`mb-1.5 flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors sm:gap-3 sm:px-3 ${
        isFuture
          ? 'cursor-not-allowed border-gray-200 opacity-50 dark:border-[#2f2f2f]'
          : isToday
            ? 'border-indigo-300 bg-indigo-50/60 dark:border-indigo-500/40 dark:bg-indigo-500/10'
            : 'border-gray-200 bg-white dark:border-[#2f2f2f] dark:bg-[#1e1e1e]'
      } ${isInteractive && !isToday ? 'hover:bg-gray-50 dark:hover:bg-[#242424]' : ''} ${
        isInteractive ? 'cursor-pointer' : ''
      }`}
    >
      {/* [ Date ] */}
      <span className="flex w-[6.75rem] shrink-0 items-center gap-1.5 sm:w-[8.75rem]">
        <span className="min-w-0 truncate text-[13px] font-medium text-gray-900 dark:text-white">{labelText}</span>
        {isToday && (
          <span className="shrink-0 rounded border border-indigo-200 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-indigo-600 dark:border-indigo-500/40 dark:text-indigo-300">
            Today
          </span>
        )}
      </span>

      {/* [ Progress bar ] — takes all space between the date and the status. */}
      <span className="relative flex h-4 min-w-[2.5rem] flex-1 items-center overflow-hidden rounded-full bg-gray-100 dark:bg-[#2a2a2a]">
        <span
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${fillTone}`}
          style={{ width: `${rate}%` }}
        />
        <span
          className={`relative z-10 w-full text-center text-[10px] font-semibold tabular-nums ${
            rate >= 55 && hasTasks
              ? 'text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.28)]'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          {hasTasks ? formatRate(rate) : '—'}
        </span>
      </span>

      {/* [ Status ] — fixed width, pinned to the right edge of the row. */}
      <span
        className={`ml-auto w-[6.75rem] shrink-0 whitespace-nowrap text-right text-[10px] font-medium sm:w-[7.5rem] sm:text-[11px] ${hasTasks ? getProductivityColor(status) : 'text-gray-400 dark:text-gray-500'}`}
        title={status}
      >
        {status}
      </span>
    </button>
  );
};

export default ProductivityRow;

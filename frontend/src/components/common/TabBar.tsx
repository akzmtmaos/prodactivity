import React from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  /** Optional trailing count. Omit (or leave undefined) to hide it. */
  count?: number;
  icon?: React.ReactNode;
}

export interface TabBarProps<T extends string = string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  /**
   * Renders only the tab list, letting the page keep its own header row
   * (search, filters, pagination) beside it.
   */
  bare?: boolean;
  className?: string;
  listClassName?: string;
  tabClassName?: string;
  /** Actions rendered at the right end of the row (non-bare mode only). */
  right?: React.ReactNode;
  /** When set, tabs get `id`/`aria-controls` wiring for their tabpanels. */
  idPrefix?: string;
  /** Active tab is the only one in the tab order (arrow keys move between them). */
  rovingFocus?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
}

const baseTab =
  'flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400';
const activeTab = 'bg-gray-100 text-gray-900 dark:bg-[#2b2b2b] dark:text-white';
const inactiveTab =
  'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#242424] dark:hover:text-gray-200';

const TabBar = <T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  bare = false,
  className = '',
  listClassName = '',
  tabClassName = '',
  right,
  idPrefix,
  rovingFocus = false,
  onKeyDown,
}: TabBarProps<T>) => {
  const list = (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={`flex min-w-0 items-center gap-0.5 overflow-x-auto overflow-y-hidden scrollbar-thin ${listClassName}`}
      style={{ scrollbarWidth: 'thin' }}
    >
      {items.map((item) => {
        const isActive = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            id={idPrefix ? `${idPrefix}-tab-${item.id}` : undefined}
            aria-controls={idPrefix ? `${idPrefix}-panel-${item.id}` : undefined}
            tabIndex={rovingFocus && !isActive ? -1 : undefined}
            onClick={() => onChange(item.id)}
            className={`${baseTab} ${isActive ? activeTab : inactiveTab} ${tabClassName}`}
          >
            {item.icon}
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={`text-[11px] tabular-nums ${
                  isActive
                    ? 'text-gray-500 dark:text-gray-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  if (bare) return list;

  return (
    <div
      className={`mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-[#2f2f2f] ${className}`}
    >
      {list}
      {right ? (
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 pb-1">
          {right}
        </div>
      ) : null}
    </div>
  );
};

export default TabBar;

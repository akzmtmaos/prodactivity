import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, RotateCcw, CalendarDays, Flag, ArrowDownAZ, ArrowUp, ArrowDown, Tag } from 'lucide-react';
import { Task } from '../../types/task';
import HeaderTooltip from '../common/HeaderTooltip';

interface TaskFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterCompleted?: boolean | null;
  onFilterCompletedChange?: (value: boolean | null) => void;
  filterPriority: Task['priority'] | 'all';
  onFilterPriorityChange: (value: Task['priority'] | 'all') => void;
  filterCategory?: string;
  onFilterCategoryChange?: (value: string) => void;
  categories?: string[];
  sortField?: 'dueDate' | 'priority' | 'title';
  onSortFieldChange?: (value: 'dueDate' | 'priority' | 'title') => void;
  sortDirection?: 'asc' | 'desc';
  onSortDirectionChange?: (value: 'asc' | 'desc') => void;
  onResetFilters?: () => void;
}

const PRIORITY_OPTIONS: { value: Task['priority'] | 'all'; label: string }[] = [
  { value: 'all', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const SORT_OPTIONS: { value: 'dueDate' | 'priority' | 'title'; label: string }[] = [
  { value: 'dueDate', label: 'Due Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title' },
];

const triggerBase =
  'flex items-center justify-center gap-1 h-7 text-xs rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-[#404040]';

const triggerIdle =
  'border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] hover:text-gray-900 dark:hover:text-gray-200';

const triggerActive =
  'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30';

const dropdownPanel =
  'absolute right-0 top-full mt-1 min-w-[130px] bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333333] rounded-md shadow-lg z-50 py-1';
const dropdownItem =
  'w-full px-2.5 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors whitespace-nowrap';

const TaskFilters: React.FC<TaskFiltersProps> = ({
  filterPriority,
  onFilterPriorityChange,
  filterCategory = 'all',
  onFilterCategoryChange,
  categories = [],
  sortField = 'dueDate',
  onSortFieldChange,
  sortDirection = 'asc',
  onSortDirectionChange,
  onResetFilters,
}) => {
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const priorityRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) setPriorityOpen(false);
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategoryOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const priorityLabel = PRIORITY_OPTIONS.find((o) => o.value === filterPriority)?.label ?? 'Priority';
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortField)?.label ?? 'Due Date';

  return (
    <div className="flex flex-nowrap gap-1.5 items-center">
      {/* Priority */}
      <div className="relative" ref={priorityRef}>
        <HeaderTooltip label="Priority" fixed>
          <button
            type="button"
            onClick={() => { setPriorityOpen((o) => !o); setCategoryOpen(false); setSortOpen(false); }}
            className={`${triggerBase} ${filterPriority === 'all' ? triggerIdle : triggerActive} px-2`}
            aria-expanded={priorityOpen}
            aria-label="Filter by priority"
          >
            <Flag size={14} />
            {filterPriority !== 'all' && <span className="font-medium">{priorityLabel}</span>}
            <ChevronDown size={11} className={`transition-transform ${priorityOpen ? 'rotate-180' : ''}`} />
          </button>
        </HeaderTooltip>
        {priorityOpen && (
          <div className={dropdownPanel}>
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onFilterPriorityChange(opt.value); setPriorityOpen(false); }}
                className={dropdownItem}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category */}
      {onFilterCategoryChange && categories.length > 0 && (
        <div className="relative" ref={categoryRef}>
          <HeaderTooltip label="Category" fixed>
            <button
              type="button"
              onClick={() => { setCategoryOpen((o) => !o); setPriorityOpen(false); setSortOpen(false); }}
              className={`${triggerBase} ${filterCategory === 'all' ? triggerIdle : triggerActive} px-2`}
              aria-expanded={categoryOpen}
              aria-label="Filter by category"
            >
              <Tag size={14} />
              {filterCategory !== 'all' && <span className="font-medium max-w-[7rem] truncate">{filterCategory}</span>}
              <ChevronDown size={11} className={`transition-transform ${categoryOpen ? 'rotate-180' : ''}`} />
            </button>
          </HeaderTooltip>
          {categoryOpen && (
            <div className={`${dropdownPanel} max-h-56 overflow-y-auto`}>
              <button type="button" onClick={() => { onFilterCategoryChange('all'); setCategoryOpen(false); }} className={dropdownItem}>
                All Categories
              </button>
              {categories.map((cat) => (
                <button key={cat} type="button" onClick={() => { onFilterCategoryChange(cat); setCategoryOpen(false); }} className={dropdownItem}>
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sort field */}
      {onSortFieldChange && (
        <div className="relative" ref={sortRef}>
          <HeaderTooltip label={`Sort: ${sortLabel}`} fixed>
            <button
              type="button"
              onClick={() => { setSortOpen((o) => !o); setPriorityOpen(false); setCategoryOpen(false); }}
              className={`${triggerBase} ${triggerIdle} px-2`}
              aria-expanded={sortOpen}
              aria-label={`Sort by ${sortLabel}`}
            >
              {sortField === 'dueDate' && <CalendarDays size={14} />}
              {sortField === 'priority' && <Flag size={14} />}
              {sortField === 'title' && <ArrowDownAZ size={14} />}
              <ChevronDown size={11} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
            </button>
          </HeaderTooltip>
          {sortOpen && (
            <div className={dropdownPanel}>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onSortFieldChange(opt.value); setSortOpen(false); }}
                  className={dropdownItem}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sort direction */}
      {onSortDirectionChange && (
        <HeaderTooltip label={sortDirection === 'asc' ? 'Ascending' : 'Descending'} fixed>
          <button
            type="button"
            onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
            className={`${triggerBase} ${triggerIdle} w-7`}
            aria-label={sortDirection === 'asc' ? 'Sort ascending' : 'Sort descending'}
          >
            {sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </button>
        </HeaderTooltip>
      )}

      {/* Reset */}
      {onResetFilters && (
        <HeaderTooltip label="Reset filters" fixed>
          <button
            type="button"
            onClick={onResetFilters}
            className={`${triggerBase} ${triggerIdle} w-7`}
            aria-label="Reset all filters"
          >
            <RotateCcw size={14} />
          </button>
        </HeaderTooltip>
      )}
    </div>
  );
};

export default TaskFilters;

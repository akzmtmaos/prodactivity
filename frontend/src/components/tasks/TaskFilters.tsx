import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, RotateCcw, Calendar, Flag, ListOrdered } from 'lucide-react';
import { Task } from '../../types/task';

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

const compactButton =
  'h-7 px-2.5 text-xs rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#404040]';

const dropdownTrigger =
  'flex items-center justify-center gap-1 h-7 pl-2.5 pr-2 text-xs rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#404040] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors';

const dropdownPanel = 'absolute left-0 top-full mt-1 min-w-[120px] bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333333] rounded-lg shadow z-50 py-1';
const dropdownItem = 'w-full px-2.5 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] rounded-md transition-colors whitespace-nowrap';

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

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Priority dropdown */}
      <div className="relative" ref={priorityRef}>
        <button
          type="button"
          onClick={() => { setPriorityOpen((o) => !o); setCategoryOpen(false); setSortOpen(false); }}
          className={dropdownTrigger}
          aria-expanded={priorityOpen}
        >
          {PRIORITY_OPTIONS.find((o) => o.value === filterPriority)?.label ?? 'All Priorities'}
          <ChevronDown size={12} className={`text-gray-500 dark:text-gray-400 transition-transform ${priorityOpen ? 'rotate-180' : ''}`} />
        </button>
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

      {/* Category dropdown */}
      {onFilterCategoryChange && categories.length > 0 && (
        <div className="relative" ref={categoryRef}>
          <button
            type="button"
            onClick={() => { setCategoryOpen((o) => !o); setPriorityOpen(false); setSortOpen(false); }}
            className={dropdownTrigger}
            aria-expanded={categoryOpen}
          >
            {filterCategory === 'all' ? 'All Categories' : filterCategory}
            <ChevronDown size={12} className={`text-gray-500 dark:text-gray-400 transition-transform ${categoryOpen ? 'rotate-180' : ''}`} />
          </button>
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

      {/* Sort dropdown (icon trigger) */}
      {onSortFieldChange && (
        <div className="relative" ref={sortRef}>
          <button
            type="button"
            onClick={() => { setSortOpen((o) => !o); setPriorityOpen(false); setCategoryOpen(false); }}
            className={`flex items-center justify-center gap-0.5 h-7 px-2.5 text-xs rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#404040] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors`}
            aria-expanded={sortOpen}
            title={SORT_OPTIONS.find((o) => o.value === sortField)?.label ?? 'Sort by'}
            aria-label={`Sort by ${SORT_OPTIONS.find((o) => o.value === sortField)?.label ?? 'Due Date'}`}
          >
            {sortField === 'dueDate' && <Calendar size={14} />}
            {sortField === 'priority' && <Flag size={14} />}
            {sortField === 'title' && <ListOrdered size={14} />}
            <ChevronDown size={10} className={`text-gray-500 dark:text-gray-400 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
          </button>
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
        <button type="button" onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')} className={compactButton} title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}>
          {sortDirection === 'asc' ? '↑' : '↓'}
        </button>
      )}

      {/* Reset Filters */}
      {onResetFilters && (
        <button type="button" className={`flex items-center justify-center h-7 w-7 rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#404040]`} onClick={onResetFilters} title="Reset all filters" aria-label="Reset all filters">
          <RotateCcw size={14} />
        </button>
      )}
    </div>
  );
};

export default TaskFilters; 
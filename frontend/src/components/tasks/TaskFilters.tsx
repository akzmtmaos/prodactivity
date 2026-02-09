import React from 'react';
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
  onResetFilters?: () => void; // New prop
}

const TaskFilters: React.FC<TaskFiltersProps> = ({
  searchTerm,
  onSearchChange,
  filterCompleted,
  onFilterCompletedChange,
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
  return (
    <div className="flex flex-wrap gap-3 items-center">
        {/* Priority filter */}
        <select
          className="rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-900 dark:text-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          value={filterPriority}
          onChange={(e) => onFilterPriorityChange(e.target.value as Task['priority'] | 'all')}
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        
        {/* Category filter */}
        {onFilterCategoryChange && categories.length > 0 && (
          <select
            className="rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-900 dark:text-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            value={filterCategory}
            onChange={(e) => onFilterCategoryChange(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        )}
        
        {/* Sort by field */}
        {onSortFieldChange && (
          <select
            className="rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-900 dark:text-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            value={sortField}
            onChange={(e) => onSortFieldChange(e.target.value as 'dueDate' | 'priority' | 'title')}
          >
            <option value="dueDate">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="title">Sort by Title</option>
          </select>
        )}
        
        {/* Sort direction */}
        {onSortDirectionChange && (
          <button
            type="button"
            onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-900 dark:text-white text-sm hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            title={`Sort ${sortDirection === 'asc' ? 'Ascending' : 'Descending'}`}
          >
            {sortDirection === 'asc' ? '↑' : '↓'}
          </button>
        )}
        
        {/* Reset Filters Button */}
        {onResetFilters && (
          <button
            type="button"
            className="ml-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition"
            onClick={onResetFilters}
            title="Reset all filters"
          >
            Reset Filters
          </button>
        )}
    </div>
  );
};

export default TaskFilters; 
import React from 'react';
import { Task } from '../../types/task';

interface TaskFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterCompleted: boolean | null;
  onFilterCompletedChange: (value: boolean | null) => void;
  filterPriority: Task['priority'] | 'all';
  onFilterPriorityChange: (value: Task['priority'] | 'all') => void;
  onResetFilters?: () => void; // New prop
}

const TaskFilters: React.FC<TaskFiltersProps> = ({
  searchTerm,
  onSearchChange,
  filterCompleted,
  onFilterCompletedChange,
  filterPriority,
  onFilterPriorityChange,
  onResetFilters,
}) => {
  return (
    <div className="p-0 sm:p-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      {/* Search input */}
      <div className="w-full sm:w-auto">
        <div className="relative rounded-md shadow-sm">
          <input
            type="text"
            className="block w-full rounded-md border border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white pl-10 pr-3 py-2 text-sm"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Filter controls */}
      <div className="flex flex-wrap gap-3 w-full sm:w-auto items-center">
        {/* Status filter */}
        <select
          className="rounded-md border border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white py-2 text-sm"
          value={filterCompleted === null ? 'all' : (filterCompleted ? 'completed' : 'pending')}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'all') onFilterCompletedChange(null);
            else onFilterCompletedChange(val === 'completed');
          }}
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
        </select>
        
        {/* Priority filter */}
        <select
          className="rounded-md border border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white py-2 text-sm"
          value={filterPriority}
          onChange={(e) => onFilterPriorityChange(e.target.value as Task['priority'] | 'all')}
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        {/* Reset Filters Button */}
        {onResetFilters && (
          <button
            type="button"
            className="ml-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            onClick={onResetFilters}
            title="Reset all filters"
          >
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskFilters; 
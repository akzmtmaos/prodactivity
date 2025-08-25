import React from 'react';
import TaskItem from './TaskItem';
import { Task } from '../../types/task';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onTaskCompleted?: (completedTask: any) => void;
  sortField: keyof Task;
  sortDirection: 'asc' | 'desc';
  onSort: (field: keyof Task) => void;
  onAddTask?: () => void; // New prop for Add Task button
  compact?: boolean; // New prop for compact layout
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleComplete,
  onEdit,
  onDelete,
  onTaskCompleted,
  sortField,
  sortDirection,
  onSort,
  onAddTask,
  compact = false,
}) => {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        {/* SVG Illustration */}
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-6">
          <rect x="20" y="30" width="80" height="60" rx="12" fill="#EEF2FF" />
          <rect x="35" y="45" width="50" height="8" rx="4" fill="#6366F1" />
          <rect x="35" y="60" width="30" height="8" rx="4" fill="#A5B4FC" />
          <rect x="35" y="75" width="40" height="8" rx="4" fill="#C7D2FE" />
          <rect x="50" y="20" width="20" height="10" rx="4" fill="#6366F1" />
        </svg>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">You're all caught up!</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">No tasks for now. Enjoy your productivity streak or add a new task to get started.</p>
        {onAddTask && (
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={onAddTask}
          >
            <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Task
          </button>
        )}
      </div>
    );
  }

  // Render as a card list inside a fixed, scrollable container
  return (
    <div className={`${compact ? '' : 'h-[calc(100vh-8rem)]'} overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-800 p-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-indigo-700 scrollbar-track-gray-100 dark:scrollbar-track-gray-900 border border-gray-100 dark:border-gray-700`}>
      <div className="flex flex-col gap-1">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggleComplete={onToggleComplete}
            onEdit={onEdit}
            onDelete={onDelete}
            onTaskCompleted={onTaskCompleted}
          />
        ))}
      </div>
    </div>
  );
};

export default TaskList; 
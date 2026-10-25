import React from 'react';
import { ListChecks, Plus } from 'lucide-react';
import TaskItem from './TaskItem';
import { Task } from '../../types/task';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onTaskCompleted?: (completedTask: any) => void;
  sortField: 'dueDate' | 'priority' | 'title';
  sortDirection: 'asc' | 'desc';
  onSort: (field: 'dueDate' | 'priority' | 'title') => void;
  onAddTask?: () => void;
  compact?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleComplete,
  onEdit,
  onDelete,
  onTaskCompleted,
  onAddTask,
  compact = false,
}) => {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-[#2b2b2b] mb-3">
          <ListChecks size={18} className="text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Nothing here yet</h3>
        <p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
          Tasks you add will show up here, sorted the way you like.
        </p>
        {onAddTask && (
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            onClick={onAddTask}
          >
            <Plus size={14} />
            New task
          </button>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-col divide-y divide-gray-100 dark:divide-[#2b2b2b]">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggleComplete={onToggleComplete}
            onEdit={onEdit}
            onDelete={onDelete}
            onTaskCompleted={onTaskCompleted}
            compact={compact}
          />
        ))}
      </div>
    );
  }

  // Roomier card list inside a fixed, scrollable container
  return (
    <div className="h-[calc(100vh-8rem)] overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-800 p-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-indigo-700 scrollbar-track-gray-100 dark:scrollbar-track-gray-900 border border-gray-100 dark:border-gray-700">
      <div className="flex flex-col gap-1">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggleComplete={onToggleComplete}
            onEdit={onEdit}
            onDelete={onDelete}
            onTaskCompleted={onTaskCompleted}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
};

export default TaskList;

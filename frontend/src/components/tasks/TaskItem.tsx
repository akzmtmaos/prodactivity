import React from 'react';
import { Task } from '../../types/task';

interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
}) => {
  return (
    <tr className={task.completed ? 'bg-gray-50 dark:bg-gray-700/50' : ''}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <input
            type="checkbox"
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            checked={task.completed}
            onChange={() => onToggleComplete(task.id)}
          />
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <div className={`text-sm font-medium ${task.completed ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
            {task.title}
          </div>
          {task.description && (
            <div className={`text-sm ${task.completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-500 dark:text-gray-400'}`}>
              {task.description.length > 100 
                ? `${task.description.substring(0, 100)}...` 
                : task.description}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`text-sm ${task.completed ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
          {new Date(task.dueDate).toLocaleDateString()}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          task.priority === 'high' 
            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' 
            : task.priority === 'medium'
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
            : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
        }`}>
          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
          onClick={() => onEdit(task)}
        >
          Edit
        </button>
        <button
          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
          onClick={() => onDelete(task.id)}
        >
          Delete
        </button>
      </td>
    </tr>
  );
};

export default TaskItem; 
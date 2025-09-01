import React from 'react';
import { Task } from '../../types/task';
import { getTodayDate } from '../../utils/dateUtils';

interface TaskSummaryProps {
  tasks: Task[];
  totalCount: number;
  completedCount?: number;
  pendingCount?: number;
  dueTodayCount?: number;
}

const TaskSummary: React.FC<TaskSummaryProps> = ({ 
  tasks, 
  totalCount, 
  completedCount, 
  pendingCount, 
  dueTodayCount 
}) => {
  // Use provided counts if available, otherwise calculate from current page tasks
  const totalTasks = totalCount || tasks.length;
  const completedTasks = completedCount !== undefined ? completedCount : tasks.filter(task => task.completed).length;
  const pendingTasks = pendingCount !== undefined ? pendingCount : (totalTasks - completedTasks);
  
  // Calculate tasks due today from current page (since we don't have total due today count)
  const today = getTodayDate();
  const dueToday = dueTodayCount !== undefined ? dueTodayCount : tasks.filter(task => task.dueDate === today && !task.completed).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Total Tasks</h3>
        <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{totalTasks}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Completed</h3>
        <p className="text-3xl font-bold text-green-500 dark:text-green-400">{completedTasks}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Pending</h3>
        <p className="text-3xl font-bold text-yellow-500 dark:text-yellow-400">{pendingTasks}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Due Today</h3>
        <p className="text-3xl font-bold text-red-500 dark:text-red-400">{dueToday}</p>
      </div>
    </div>
  );
};

export default TaskSummary; 
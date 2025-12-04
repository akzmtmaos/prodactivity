import React from 'react';
import { ClipboardList, CheckCircle2, Clock3, AlertCircle } from 'lucide-react';
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Tasks */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <ClipboardList size={24} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="ml-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{totalTasks}</h3>
            <p className="text-gray-600 dark:text-gray-400">Total Tasks</p>
          </div>
        </div>
      </div>

      {/* Completed Tasks */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 size={24} className="text-green-600 dark:text-green-400" />
          </div>
          <div className="ml-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{completedTasks}</h3>
            <p className="text-gray-600 dark:text-gray-400">Completed</p>
          </div>
        </div>
      </div>

      {/* Pending Tasks */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
            <Clock3 size={24} className="text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="ml-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{pendingTasks}</h3>
            <p className="text-gray-600 dark:text-gray-400">Pending</p>
          </div>
        </div>
      </div>

      {/* Due Today */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
            <AlertCircle size={24} className="text-red-600 dark:text-red-400" />
          </div>
          <div className="ml-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{dueToday}</h3>
            <p className="text-gray-600 dark:text-gray-400">Due Today</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskSummary;
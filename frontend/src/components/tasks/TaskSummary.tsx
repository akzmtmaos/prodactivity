import React from 'react';
import { Task } from '../../types/task';

interface TaskSummaryProps {
  tasks: Task[];
}

const TaskSummary: React.FC<TaskSummaryProps> = ({ tasks }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const highPriorityTasks = tasks.filter(task => task.priority === 'high' && !task.completed).length;
  
  // Calculate tasks due today
  const today = new Date().toISOString().split('T')[0];
  const dueToday = tasks.filter(task => task.dueDate === today && !task.completed).length;

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
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
  dueTodayCount,
}) => {
  // Use provided counts if available, otherwise calculate from current page tasks
  const totalTasks = totalCount || tasks.length;
  const completedTasks = completedCount !== undefined ? completedCount : tasks.filter(task => task.completed).length;
  const pendingTasks = pendingCount !== undefined ? pendingCount : (totalTasks - completedTasks);

  // Calculate tasks due today from current page (since we don't have total due today count)
  const today = getTodayDate();
  const dueToday = dueTodayCount !== undefined ? dueTodayCount : tasks.filter(task => task.dueDate === today && !task.completed).length;

  const items = [
    { label: 'Total', value: totalTasks, icon: ClipboardList, tone: 'text-gray-400 dark:text-gray-500' },
    { label: 'Completed', value: completedTasks, icon: CheckCircle2, tone: 'text-emerald-500 dark:text-emerald-400' },
    { label: 'Pending', value: pendingTasks, icon: Clock3, tone: 'text-amber-500 dark:text-amber-400' },
    { label: 'Due today', value: dueToday, icon: AlertCircle, tone: 'text-rose-500 dark:text-rose-400' },
  ];

  const cellBorders = [
    '',
    'border-l',
    'border-t sm:border-t-0 sm:border-l',
    'border-l border-t sm:border-t-0',
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 border border-gray-200 dark:border-[#2f2f2f] rounded-lg overflow-hidden bg-white dark:bg-[#1e1e1e] mb-4">
      {items.map(({ label, value, icon: Icon, tone }, index) => (
        <div
          key={label}
          className={`flex items-center gap-2 px-3.5 py-2.5 border-gray-200 dark:border-[#2f2f2f] ${cellBorders[index]}`}
        >
          <Icon size={14} className={`flex-shrink-0 ${tone}`} />
          <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{value}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</span>
        </div>
      ))}
    </div>
  );
};

export default TaskSummary;

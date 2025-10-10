import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { X, CheckSquare, Clock, Calendar } from 'lucide-react';

interface DailyBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  dailyPercentage: number;
  getProductivityColor: (status: string) => string;
}

interface TaskData {
  id: number;
  title: string;
  completed: boolean;
  completed_at: string | null;
  due_date: string;
  priority: string;
  category: string;
  task_category: string;
  time_spent_minutes: number;
}

const DailyBreakdownModal: React.FC<DailyBreakdownModalProps> = ({
  isOpen,
  onClose,
  date,
  dailyPercentage,
  getProductivityColor
}) => {
  const [completedTasks, setCompletedTasks] = useState<TaskData[]>([]);
  const [pendingTasks, setPendingTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDailyTasks();
    }
  }, [isOpen, date]);

  const fetchDailyTasks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get current user ID
      const userData = localStorage.getItem('user');
      if (!userData) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }
      
      const user = JSON.parse(userData);
      const userId = user.id || 11;
      
      // Fetch completed tasks for this day (by completion date)
      const { data: completedData, error: completedError } = await supabase
        .from('tasks')
        .select('id, title, completed, completed_at, due_date, priority, category, task_category, time_spent_minutes')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .eq('completed', true)
        .gte('completed_at', `${date}T00:00:00`)
        .lt('completed_at', `${date}T23:59:59`)
        .order('completed_at', { ascending: true });
      
      // Fetch pending tasks due on this day
      const { data: pendingData, error: pendingError } = await supabase
        .from('tasks')
        .select('id, title, completed, completed_at, due_date, priority, category, task_category, time_spent_minutes')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .eq('completed', false)
        .eq('due_date', date)
        .order('priority', { ascending: false });
      
      if (completedError || pendingError) {
        console.error('Error fetching tasks:', completedError || pendingError);
        setError('Failed to load tasks');
      } else {
        setCompletedTasks(completedData || []);
        setPendingTasks(pendingData || []);
      }
    } catch (err) {
      console.error('Error in fetchDailyTasks:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/20';
    }
  };

  const totalTasks = completedTasks.length + pendingTasks.length;
  const status = dailyPercentage >= 90 ? 'Highly Productive' : 
                dailyPercentage >= 70 ? 'Productive' : 
                dailyPercentage >= 40 ? 'Moderately Productive' : 
                'Low Productive';

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Daily Breakdown
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatDate(date)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading task breakdown...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchDailyTasks}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && totalTasks === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No tasks recorded for this day.</p>
            </div>
          )}

          {!loading && !error && totalTasks > 0 && (
            <>
              {/* Summary */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between gap-6">
                  {/* Left: Daily Completion Rate */}
                  <div className="flex-1 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Completion Rate</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {dailyPercentage.toFixed(2)}%
                    </p>
                  </div>
                  
                  {/* Right: Productivity Scale */}
                  <div className="flex-1 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Productivity Scale</p>
                    <span className={`inline-block text-lg font-bold px-4 py-1.5 rounded-full ${getProductivityColor(status)}`}>
                      {status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Task Breakdown */}
            <div className="space-y-6">
              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <CheckSquare size={20} className="text-green-500" />
                    Completed Tasks ({completedTasks.length})
                  </h3>
                  <div className="space-y-2">
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-green-50 dark:bg-green-900/10 rounded-lg p-4 border border-green-200 dark:border-green-800"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                              {task.title}
                            </h4>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                                {task.priority?.toUpperCase() || 'MEDIUM'}
                              </span>
                              {task.task_category && (
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                  {task.task_category}
                                </span>
                              )}
                              {task.category && (
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                                  {task.category}
                                </span>
                              )}
                              {task.time_spent_minutes > 0 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Clock size={12} />
                                  {task.time_spent_minutes} min
                                </span>
                              )}
                              {task.due_date !== date && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Calendar size={12} />
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              )}
                              {task.completed_at && (
                                <span className="text-xs text-green-600 dark:text-green-400">
                                  ✓ Completed at {new Date(task.completed_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Clock size={20} className="text-yellow-500" />
                    Pending Tasks ({pendingTasks.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingTasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                              {task.title}
                            </h4>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                                {task.priority?.toUpperCase() || 'MEDIUM'}
                              </span>
                              {task.task_category && (
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                  {task.task_category}
                                </span>
                              )}
                              {task.category && (
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                                  {task.category}
                                </span>
                              )}
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Calendar size={12} />
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DailyBreakdownModal;


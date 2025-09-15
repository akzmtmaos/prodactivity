import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';

interface WeeklyBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekStart: string;
  weekEnd: string;
  weekPercentage: number;
  getProductivityColor: (status: string) => string;
}

interface DailyData {
  date: string;
  completion_rate: number;
  status: string;
  total_tasks: number;
  completed_tasks: number;
}

const WeeklyBreakdownModal: React.FC<WeeklyBreakdownModalProps> = ({
  isOpen,
  onClose,
  weekStart,
  weekEnd,
  weekPercentage,
  getProductivityColor
}) => {
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDailyBreakdown();
    }
  }, [isOpen, weekStart, weekEnd]);

  const fetchDailyBreakdown = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const startDate = new Date(weekStart);
      const endDate = new Date(weekEnd);
      
      // Check if this is a future week
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (startDate > today) {
        setError('Cannot view breakdown for future weeks');
        setLoading(false);
        return;
      }
      
      // Get current user ID
      const userData = localStorage.getItem('user');
      if (!userData) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }
      
      const user = JSON.parse(userData);
      const userId = user.id || 11;
      
      // Fetch daily data from Supabase for each day in the week
      const dailyPromises = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        dailyPromises.push(
          supabase
            .from('productivity_logs')
            .select('completion_rate, status, total_tasks, completed_tasks')
            .eq('user_id', userId)
            .eq('period_type', 'daily')
            .eq('period_start', dateStr)
            .single()
            .then(({ data, error }) => {
              if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error(`Error fetching data for ${dateStr}:`, error);
              }
              
              return {
                date: dateStr,
                completion_rate: data?.completion_rate || 0,
                status: data?.status || 'No Tasks',
                total_tasks: data?.total_tasks || 0,
                completed_tasks: data?.completed_tasks || 0
              };
            })
        );
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      const results = await Promise.all(dailyPromises);
      setDailyData(results);
      
      console.log('📊 Weekly breakdown data from Supabase:', results);
    } catch (err) {
      console.error('Error fetching daily breakdown:', err);
      setError('Failed to fetch daily breakdown data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const calculateAverage = () => {
    if (dailyData.length === 0) return 0;
    const total = dailyData.reduce((sum, day) => sum + day.completion_rate, 0);
    return total / dailyData.length;
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Weekly Breakdown
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatDate(weekStart)} - {formatDate(weekEnd)}
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
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading daily breakdown...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchDailyBreakdown}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && dailyData.length > 0 && (
            <>
              {/* Summary */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Weekly Average</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {calculateAverage().toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Daily breakdown */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Daily Breakdown
                </h3>
                {dailyData.map((day, index) => (
                  <div key={day.date} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatDate(day.date)}
                        </span>
                        <span className={`text-sm font-semibold ${getProductivityColor(day.status)}`}>
                          {day.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="w-full h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                day.completion_rate >= 90 ? 'bg-green-600 dark:bg-green-400' :
                                day.completion_rate >= 70 ? 'bg-green-500 dark:bg-green-300' :
                                day.completion_rate >= 40 ? 'bg-yellow-500 dark:bg-yellow-400' :
                                'bg-red-500 dark:bg-red-400'
                              }`}
                              style={{ width: `${Math.min(day.completion_rate, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {day.completion_rate.toFixed(2)}%
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {day.completed_tasks}/{day.total_tasks} tasks
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && !error && dailyData.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No daily data available for this week.</p>
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};

export default WeeklyBreakdownModal;

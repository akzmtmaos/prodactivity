import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import DailyBreakdownModal from './DailyBreakdownModal';

interface MonthlyBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  month: number;
  year: number;
  monthPercentage: number;
  getProductivityColor: (status: string) => string;
}

interface DailyData {
  date: string;
  completion_rate: number;
  status: string;
  total_tasks: number;
  completed_tasks: number;
}

const MonthlyBreakdownModal: React.FC<MonthlyBreakdownModalProps> = ({
  isOpen,
  onClose,
  month,
  year,
  monthPercentage,
  getProductivityColor
}) => {
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDatePercentage, setSelectedDatePercentage] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      fetchDailyBreakdown();
    }
  }, [isOpen, month, year]);

  const fetchDailyBreakdown = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get the first and last day of the month
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0); // This gives us the last day of the current month
      
      
      // Check if this is a future month
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (firstDay > today) {
        setError('Cannot view breakdown for future months');
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
      
      // Fetch daily data from Supabase for each day in the month
      const dailyPromises = [];
      const currentDate = new Date(firstDay);
      
            while (currentDate <= lastDay) {
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

  const getMonthName = () => {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getMonthlyStatus = () => {
    if (monthPercentage >= 90) return 'Highly Productive';
    if (monthPercentage >= 70) return 'Productive';
    if (monthPercentage >= 40) return 'Moderately Productive';
    return 'Low Productive';
  };

  const handleDateClick = (date: string, percentage: number) => {
    setSelectedDate(date);
    setSelectedDatePercentage(percentage);
  };

  const closeDailyModal = () => {
    setSelectedDate(null);
    setSelectedDatePercentage(0);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Monthly Breakdown
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getMonthName()}
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
                <div className="flex items-center justify-between gap-6">
                  {/* Left: Monthly Average */}
                  <div className="flex-1 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Monthly Average</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {monthPercentage.toFixed(2)}%
                    </p>
                  </div>
                  
                  {/* Right: Productivity Scale */}
                  <div className="flex-1 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Productivity Scale</p>
                    <span className={`inline-block text-lg font-bold px-4 py-1.5 rounded-full ${getProductivityColor(getMonthlyStatus())}`}>
                      {getMonthlyStatus()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Daily breakdown */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Daily Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dailyData.map((day, index) => (
                    <div 
                      key={day.date} 
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => handleDateClick(day.date, day.completion_rate)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                          {formatDate(day.date)} 👁️
                        </span>
                        <span className={`text-xs font-semibold ${getProductivityColor(day.status)}`}>
                          {day.status}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="w-full h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
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
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {day.completion_rate.toFixed(2)}%
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {day.completed_tasks}/{day.total_tasks} tasks
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!loading && !error && dailyData.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No daily data available for this month.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Daily Breakdown Modal */}
      {selectedDate && (
        <DailyBreakdownModal
          isOpen={true}
          onClose={closeDailyModal}
          date={selectedDate}
          dailyPercentage={selectedDatePercentage}
          getProductivityColor={getProductivityColor}
        />
      )}
    </div>,
    document.body
  );
};

export default MonthlyBreakdownModal;

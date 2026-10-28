import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import BreakdownModalShell from './BreakdownModalShell';
import DailyRateChart, { dayOfMonth, getRateBarClass, weekdayShort } from './DailyRateChart';
import DailyBreakdownModal from './DailyBreakdownModal';
import { getStatusFromRate } from '../../utils/productivityScore';

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

      // Ensure we're working with local dates to avoid timezone issues
      currentDate.setHours(0, 0, 0, 0);
      lastDay.setHours(23, 59, 59, 999);

      while (currentDate <= lastDay) {
        // Use local date formatting to avoid timezone shifts
        const currentYear = currentDate.getFullYear();
        const currentMonthNum = currentDate.getMonth() + 1; // 1-12
        const currentDay = currentDate.getDate();
        const monthStr = String(currentMonthNum).padStart(2, '0');
        const dayStr = String(currentDay).padStart(2, '0');
        const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

        // Double-check that the date is actually in the selected month
        if (currentMonthNum !== month || currentYear !== year) {
          // Skip if date is not in the selected month (shouldn't happen, but safety check)
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

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

            // Filter out any dates that don't belong to the selected month (safety check)
            const filteredResults = results.filter(day => {
              if (!day.date) return false;
              const dayDate = new Date(day.date + 'T00:00:00');
              const dayMonth = dayDate.getMonth() + 1; // getMonth() returns 0-11
              const dayYear = dayDate.getFullYear();
              return dayMonth === month && dayYear === year;
            });

            setDailyData(filteredResults);
    } catch (err) {
      console.error('Error fetching daily breakdown:', err);
      setError('Failed to fetch daily breakdown data');
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = () => {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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

  const completedTotal = dailyData.reduce((sum, day) => sum + (day.completed_tasks || 0), 0);
  const tasksTotal = dailyData.reduce((sum, day) => sum + (day.total_tasks || 0), 0);
  const status = tasksTotal > 0 ? getStatusFromRate(monthPercentage) : 'No tasks';
  const ratedDays = dailyData.filter((day) => (day.total_tasks || 0) > 0);
  const activeDays = ratedDays.filter((day) => day.completed_tasks > 0).length;

  return (
    <BreakdownModalShell
      title="Monthly breakdown"
      subtitle={`${getMonthName()}${
        tasksTotal > 0 ? ` · ${completedTotal} of ${tasksTotal} tasks completed` : ' · nothing due'
      }`}
      onClose={onClose}
      maxWidth="max-w-3xl"
    >
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-b-indigo-500 dark:border-[#333333] dark:border-b-indigo-400" />
          <span className="text-[11px] text-gray-500 dark:text-gray-400">Loading daily breakdown…</span>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-2 py-8">
          <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={fetchDailyBreakdown}
            className="h-7 rounded-md border border-gray-200 bg-white px-2.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#333333] dark:bg-[#252525] dark:text-gray-300 dark:hover:bg-[#2d2d2d]"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && dailyData.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-md border border-gray-200 px-3 py-2 dark:border-[#2f2f2f]">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Completion
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                {monthPercentage.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-md border border-gray-200 px-3 py-2 dark:border-[#2f2f2f]">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Productivity
              </p>
              <p
                className={`mt-0.5 text-[13px] font-medium ${
                  tasksTotal > 0 ? getProductivityColor(status) : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {status}
              </p>
            </div>
            <div className="rounded-md border border-gray-200 px-3 py-2 dark:border-[#2f2f2f]">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Tasks
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                {completedTotal}
                <span className="text-[13px] font-normal text-gray-400 dark:text-gray-500">/{tasksTotal}</span>
              </p>
            </div>
            <div className="rounded-md border border-gray-200 px-3 py-2 dark:border-[#2f2f2f]">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Active days
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                {activeDays}
                <span className="text-[13px] font-normal text-gray-400 dark:text-gray-500">
                  /{ratedDays.length}
                </span>
              </p>
            </div>
          </div>

          <section className="mt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Daily completion
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                Click a bar to open that day
              </span>
            </div>
            <DailyRateChart days={dailyData} onSelectDay={handleDateClick} height={140} maxTicks={11} />
          </section>

          <section className="mt-4">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Days
            </span>
            <div className="mt-1.5 grid grid-cols-1 gap-0.5 sm:grid-cols-2 lg:grid-cols-3">
              {dailyData.map((day) => (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => handleDateClick(day.date, day.completion_rate)}
                  className="flex h-9 items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-[#242424]"
                >
                  <span className="w-12 flex-shrink-0 text-[11px] text-gray-500 dark:text-gray-400">
                    {weekdayShort(day.date)} {dayOfMonth(day.date)}
                  </span>
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-[#262626]">
                    <span
                      className={`block h-full rounded-full ${getRateBarClass(day.completion_rate, day.total_tasks > 0)}`}
                      style={{ width: `${Math.min(day.completion_rate, 100)}%` }}
                    />
                  </span>
                  <span className="w-10 flex-shrink-0 text-right text-[11px] font-medium tabular-nums text-gray-800 dark:text-gray-200">
                    {day.total_tasks > 0 ? `${day.completion_rate.toFixed(0)}%` : '—'}
                  </span>
                  <span className="w-12 flex-shrink-0 text-right text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                    {day.completed_tasks}/{day.total_tasks}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {!loading && !error && dailyData.length === 0 && (
        <p className="py-8 text-center text-[11px] text-gray-500 dark:text-gray-400">
          No daily data available for this month.
        </p>
      )}

      {selectedDate && (
        <DailyBreakdownModal
          isOpen={true}
          onClose={closeDailyModal}
          date={selectedDate}
          dailyPercentage={selectedDatePercentage}
          getProductivityColor={getProductivityColor}
        />
      )}
    </BreakdownModalShell>
  );
};

export default MonthlyBreakdownModal;

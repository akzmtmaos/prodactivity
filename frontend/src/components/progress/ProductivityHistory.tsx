import React, { useEffect, useState } from 'react';
import ProductivityRow from './ProductivityRow';
import WeeklyBreakdownModal from './WeeklyBreakdownModal';
import MonthlyBreakdownModal from './MonthlyBreakdownModal';
import DailyBreakdownModal from './DailyBreakdownModal';
import ProductivityLegend from './ProductivityLegend';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import TabBar from '../common/TabBar';

interface ProductivityHistoryProps {
  progressView: string;
  productivity: any;
  prodLogs: any[];
  /** True while the list for the navigated-to period is being fetched. */
  isLoading?: boolean;
  selectedDate: Date;
  handlePrev: () => void;
  handleNext: () => void;
  isPrevDisabled: boolean;
  isNextDisabled: boolean;
  getDateDisplay: () => string;
  getProductivityColor: (status: string) => string;
  setProgressView: (view: string) => void;
  tabs: string[];
}

const ProductivityHistory: React.FC<ProductivityHistoryProps> = ({
  progressView,
  productivity,
  prodLogs,
  isLoading = false,
  selectedDate,
  handlePrev,
  handleNext,
  isPrevDisabled,
  isNextDisabled,
  getDateDisplay,
  getProductivityColor,
  setProgressView,
  tabs
}) => {
  const [weeklyModalOpen, setWeeklyModalOpen] = useState(false);
  const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);
  const [dailyModalOpen, setDailyModalOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<{
    weekStart: string;
    weekEnd: string;
    percentage: number;
  } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<{
    month: number;
    year: number;
    percentage: number;
  } | null>(null);
  const [selectedDay, setSelectedDay] = useState<{
    date: string;
    percentage: number;
  } | null>(null);

  // A local Supabase query can resolve inside the same React batch as the click,
  // so `isLoading` alone may never paint. The chevrons set `navPending` locally,
  // which keeps the spinner up for a short minimum after every navigation.
  const [navPending, setNavPending] = useState(false);
  const showLoading = isLoading || navPending;
  useEffect(() => {
    if (isLoading || !navPending) return;
    const timer = setTimeout(() => setNavPending(false), 350);
    return () => clearTimeout(timer);
  }, [isLoading, navPending]);

  const goPrev = () => {
    setNavPending(true);
    handlePrev();
  };

  const goNext = () => {
    setNavPending(true);
    handleNext();
  };

  const handleWeekClick = (weekStart: string, weekEnd: string, percentage: number) => {
    setSelectedWeek({ weekStart, weekEnd, percentage });
    setWeeklyModalOpen(true);
  };

  const handleMonthClick = (month: number, year: number, percentage: number) => {
    setSelectedMonth({ month, year, percentage });
    setMonthlyModalOpen(true);
  };

  const handleDayClick = (date: string, percentage: number) => {
    setSelectedDay({ date, percentage });
    setDailyModalOpen(true);
  };

  const closeWeeklyModal = () => {
    setWeeklyModalOpen(false);
    setSelectedWeek(null);
  };

  const closeMonthlyModal = () => {
    setMonthlyModalOpen(false);
    setSelectedMonth(null);
  };

  const closeDailyModal = () => {
    setDailyModalOpen(false);
    setSelectedDay(null);
  };
  const renderDailyView = () => {
    // Find the productivity data for the selected date
    // Use local date formatting to avoid timezone issues
    const selectedDateStr = selectedDate.toLocaleDateString('en-CA'); // Format as YYYY-MM-DD in local timezone
    const selectedDateData = prodLogs.find(item => item.date === selectedDateStr);

    // Check if selected date is today
    const today = new Date();
    const isSelectedDateToday = selectedDate.toDateString() === today.toDateString();
    
    return (
    <>
      {/* Show productivity for the selected date if data exists AND it's today */}
      {selectedDateData && isSelectedDateToday && (
        <ProductivityRow
          date={selectedDateData.date}
          completionRate={selectedDateData.log.completion_rate}
          status={selectedDateData.log.status}
          isToday={isSelectedDateToday}
          getProductivityColor={getProductivityColor}
          onClick={() => handleDayClick(selectedDateData.date, selectedDateData.log.completion_rate)}
        />
      )}
      
      {/* Historical logs - include selected date if it's not today */}
      {prodLogs
        .filter(item => {
          if (!item || !item.date) {
            return false;
          }
          
          // Parse date properly to avoid timezone issues
          const dayDate = new Date(item.date + 'T00:00:00.000Z');
          if (isNaN(dayDate.getTime())) {
            return false;
          }
          
          const today = new Date();
          today.setHours(0,0,0,0);
          // dayDate is already set to midnight UTC
          
          // Filter by selected month and year
          const selectedMonth = selectedDate.getMonth();
          const selectedYear = selectedDate.getFullYear();
          const itemMonth = dayDate.getMonth();
          const itemYear = dayDate.getFullYear();
          
          const isInSelectedMonth = itemMonth === selectedMonth && itemYear === selectedYear;
          const isSelectedDate = item.date === selectedDateStr;
          const isToday = dayDate.toDateString() === today.toDateString();
          
          // Show if it's in the selected month and either:
          // 1. It's not the selected date (to avoid duplication), OR
          // 2. It's the selected date but not today (include it in historical list)
          // 3. It's today (include today's data in the history)
          const shouldShow = isInSelectedMonth && (!isSelectedDate || !isToday);
          return shouldShow;
        })
        .sort((a, b) => {
          const dateA = new Date(a.date + 'T00:00:00.000Z');
          const dateB = new Date(b.date + 'T00:00:00.000Z');
          return dateB.getTime() - dateA.getTime();
        })
        .map((item, idx) => {
          const dayDate = item.date ? new Date(item.date + 'T00:00:00.000Z') : null;
          if (!dayDate || isNaN(dayDate.getTime())) return null;
          return (
            <ProductivityRow
              key={item.date}
              date={item.date}
              completionRate={item.log.completion_rate}
              status={item.log.status}
              getProductivityColor={getProductivityColor}
              onClick={() => handleDayClick(item.date, item.log.completion_rate)}
            />
          );
        })}
    </>
    );
  };

  const renderWeeklyView = () => {
    // Reverse the array to show most recent weeks first
    const reversedProdLogs = [...prodLogs].reverse();

    // Remove duplicates based on week_start (in case aggregation created duplicates)
    const seenWeeks = new Set<string>();
    const uniqueWeeks = reversedProdLogs.filter(item => {
      if (seenWeeks.has(item.week_start)) return false;
      seenWeeks.add(item.week_start);
      return true;
    });

    // Only show weeks that belong to the currently selected year
    const selectedYear = selectedDate.getFullYear();
    const weeksForYear = uniqueWeeks.filter(item => {
      if (!item.week_start) return false;
      const d = new Date(item.week_start + 'T00:00:00');
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === selectedYear;
    });
    
    return (
    <>
      {weeksForYear.map((item, idx) => {
        // Parse dates in local timezone to avoid timezone shifts
        const weekStart = item.week_start ? new Date(item.week_start + 'T00:00:00') : null;
        const weekEnd = item.week_end ? new Date(item.week_end + 'T00:00:00') : null;
        if (!weekStart || isNaN(weekStart.getTime()) || !weekEnd || isNaN(weekEnd.getTime())) {
          return null;
        }
        
        // Check if this is a future week
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isFutureWeek = weekStart > today;
        
        return (
          <ProductivityRow
            key={item.week_start}
            label={`${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            completionRate={item.log.completion_rate}
            status={item.log.status}
            isFuture={isFutureWeek}
            getProductivityColor={getProductivityColor}
            onClick={() => handleWeekClick(item.week_start, item.week_end, item.log.completion_rate)}
          />
        );
      })}

      {/* Show message if no weekly data found */}
      {prodLogs.length === 0 && (
        <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900/40 rounded-lg px-6 py-8">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-2">No weekly data found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">This might be because:</p>
            <ul className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              <li>• No tasks were completed in any week</li>
              <li>• Data is still being processed</li>
              <li>• API is not returning weekly data</li>
            </ul>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Total logs received: {prodLogs.length}</p>
          </div>
        </div>
      )}
    </>
    );
  };

  const renderMonthlyView = () => {
    // Reverse the array to show most recent months first
    const reversedProdLogs = [...prodLogs].reverse();
    
    return (
    <>
      {reversedProdLogs.map((item, idx) => {
        if (!item.month || isNaN(item.month) || item.month < 1 || item.month > 12) {
          return null;
        }
        const monthDate = new Date(selectedDate.getFullYear(), item.month - 1, 1);
        if (isNaN(monthDate.getTime())) return null;
        
        // Check if this is a future month
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isFutureMonth = monthDate > today;
        
        return (
          <ProductivityRow
            key={item.month}
            label={monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            completionRate={item.log.completion_rate}
            status={item.log.status}
            isFuture={isFutureMonth}
            getProductivityColor={getProductivityColor}
            onClick={() => handleMonthClick(item.month, selectedDate.getFullYear(), item.log.completion_rate)}
          />
        );
      })}

      {/* Show message if no monthly data found */}
      {prodLogs.length === 0 && (
        <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900/40 rounded-lg px-6 py-8">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-2">No monthly data found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">This might be because:</p>
            <ul className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              <li>• No tasks were completed in any month</li>
              <li>• Data is still being processed</li>
              <li>• API is not returning monthly data</li>
            </ul>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Total logs received: {prodLogs.length}</p>
          </div>
        </div>
      )}
    </>
    );
  };

  // Summary stats for the current view. Periods with nothing due are left out:
  // counting them as 0% drags the average down without saying anything.
  const hasLogs = Array.isArray(prodLogs) && prodLogs.length > 0;
  const ratedLogs = (prodLogs || []).filter((item) => (item.log?.total_tasks || 0) > 0);
  const totalTasksInView = ratedLogs.reduce((sum, item) => sum + (item.log?.total_tasks || 0), 0);
  const completedTasksInView = ratedLogs.reduce((sum, item) => sum + (item.log?.completed_tasks || 0), 0);
  const avgRate = totalTasksInView > 0 ? (completedTasksInView / totalTasksInView) * 100 : 0;
  const bestRate = ratedLogs.length > 0
    ? Math.max(...ratedLogs.map((item) => item.log?.completion_rate || 0))
    : 0;

  return (
    <>
      {/* View switcher + legend */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <TabBar
          bare
          ariaLabel="Productivity range"
          value={progressView}
          onChange={setProgressView}
          items={tabs.map((tab) => ({ id: tab, label: tab }))}
        />
        <ProductivityLegend getProductivityColor={getProductivityColor} />
      </div>

      <div className="w-full mb-4">
        <div
          aria-busy={showLoading}
          className="flex w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-[#2f2f2f] dark:bg-[#1e1e1e]"
          style={{ height: 460 }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3.5 py-2.5 dark:border-[#2f2f2f]">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Productivity history
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={goPrev}
                disabled={isPrevDisabled}
                aria-label="Previous period"
                className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-[#242424] dark:hover:text-gray-200"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="min-w-[128px] text-center text-[11px] font-medium tabular-nums text-gray-900 dark:text-white">
                {getDateDisplay()}
              </span>
              <button
                type="button"
                onClick={goNext}
                disabled={isNextDisabled}
                aria-label="Next period"
                className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-[#242424] dark:hover:text-gray-200"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          {/* Scrollable list of productivity logs */}
          <div className="relative flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto px-3.5 py-3">
            {hasLogs && (
              <div className="mb-2 flex flex-wrap gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1 dark:border-[#2f2f2f]">
                  <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{avgRate.toFixed(1)}%</span>
                  avg
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1 dark:border-[#2f2f2f]">
                  <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{bestRate.toFixed(1)}%</span>
                  best
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1 dark:border-[#2f2f2f]"
                  title="Periods that actually had tasks due"
                >
                  <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{ratedLogs.length}</span>
                  with tasks
                </span>
              </div>
            )}
            {progressView === 'Daily' && renderDailyView()}
            {progressView === 'Weekly' && renderWeeklyView()}
            {progressView === 'Monthly' && renderMonthlyView()}
          </div>
            {showLoading && (
              <div
                aria-live="polite"
                className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-white/75 backdrop-blur-[1px] dark:bg-[#1e1e1e]/80"
              >
                <Loader2 size={14} className="animate-spin text-indigo-500 dark:text-indigo-400" />
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  Loading {getDateDisplay()}…
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Breakdown Modal */}
      {selectedWeek && (
        <WeeklyBreakdownModal
          isOpen={weeklyModalOpen}
          onClose={closeWeeklyModal}
          weekStart={selectedWeek.weekStart}
          weekEnd={selectedWeek.weekEnd}
          weekPercentage={selectedWeek.percentage}
          getProductivityColor={getProductivityColor}
        />
      )}

      {/* Monthly Breakdown Modal */}
      {selectedMonth && (
        <MonthlyBreakdownModal
          isOpen={monthlyModalOpen}
          onClose={closeMonthlyModal}
          month={selectedMonth.month}
          year={selectedMonth.year}
          monthPercentage={selectedMonth.percentage}
          getProductivityColor={getProductivityColor}
        />
      )}

      {/* Daily Breakdown Modal */}
      {selectedDay && (
        <DailyBreakdownModal
          isOpen={dailyModalOpen}
          onClose={closeDailyModal}
          date={selectedDay.date}
          dailyPercentage={selectedDay.percentage}
          getProductivityColor={getProductivityColor}
        />
      )}
    </>
  );
};

export default ProductivityHistory; 
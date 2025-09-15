import React, { useState } from 'react';
import ProductivityRow from './ProductivityRow';
import WeeklyBreakdownModal from './WeeklyBreakdownModal';
import MonthlyBreakdownModal from './MonthlyBreakdownModal';
import ProductivityLegend from './ProductivityLegend';

interface ProductivityHistoryProps {
  progressView: string;
  productivity: any;
  prodLogs: any[];
  selectedDate: Date;
  handlePrev: () => void;
  handleNext: () => void;
  isPrevDisabled: boolean;
  isNextDisabled: boolean;
  getDateDisplay: () => string;
  getProductivityColor: (status: string) => string;
}

const ProductivityHistory: React.FC<ProductivityHistoryProps> = ({
  progressView,
  productivity,
  prodLogs,
  selectedDate,
  handlePrev,
  handleNext,
  isPrevDisabled,
  isNextDisabled,
  getDateDisplay,
  getProductivityColor
}) => {
  const [weeklyModalOpen, setWeeklyModalOpen] = useState(false);
  const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);
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

  const handleWeekClick = (weekStart: string, weekEnd: string, percentage: number) => {
    setSelectedWeek({ weekStart, weekEnd, percentage });
    setWeeklyModalOpen(true);
  };

  const handleMonthClick = (month: number, year: number, percentage: number) => {
    setSelectedMonth({ month, year, percentage });
    setMonthlyModalOpen(true);
  };

  const closeWeeklyModal = () => {
    setWeeklyModalOpen(false);
    setSelectedWeek(null);
  };

  const closeMonthlyModal = () => {
    setMonthlyModalOpen(false);
    setSelectedMonth(null);
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
      {/* Show productivity for the selected date ONLY if it's today */}
      {selectedDateData && isSelectedDateToday && (
        <ProductivityRow
          date={selectedDateData.date}
          completionRate={selectedDateData.log.completion_rate}
          status={selectedDateData.log.status}
          isToday={isSelectedDateToday}
          getProductivityColor={getProductivityColor}
        />
      )}
      
      {/* If no data found for selected date and it's not today, show a message */}
      {!selectedDateData && !isSelectedDateToday && (
        <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-6 py-8 mb-4">
          <div className="text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">No activity recorded for {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">This means no tasks were created or completed on this date.</p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-3">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">💡 This is normal!</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Productivity data only appears when you create or complete tasks on a specific date.</p>
            </div>
          </div>
        </div>
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
            />
          );
        })}
      
      {/* Show message if no historical data found - only for non-today dates */}
      {!isSelectedDateToday && prodLogs.filter(item => {
        if (!item || !item.date) return false;
        // Parse date properly to avoid timezone issues
        const dayDate = new Date(item.date + 'T00:00:00.000Z');
        if (isNaN(dayDate.getTime())) return false;
        const today = new Date();
        today.setHours(0,0,0,0);
        // dayDate is already set to midnight UTC
        
        // Filter by selected month and year
        const selectedMonth = selectedDate.getMonth();
        const selectedYear = selectedDate.getFullYear();
        const itemMonth = dayDate.getMonth();
        const itemYear = dayDate.getFullYear();
        
        const isInSelectedMonth = itemMonth === selectedMonth && itemYear === selectedYear;
        return dayDate < today && isInSelectedMonth;
      }).length === 0 && selectedDateData && (
        <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-6 py-8">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-2">No historical daily data found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">This might be because:</p>
            <ul className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              <li>• No tasks were completed on previous days</li>
              <li>• Data is still being processed</li>
              <li>• API is not returning historical data</li>
            </ul>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Total logs received: {prodLogs.length}</p>
          </div>
        </div>
      )}
    </>
    );
  };

  const renderWeeklyView = () => {
    console.log('renderWeeklyView called with:', {
      prodLogsLength: prodLogs.length,
      prodLogs: prodLogs
    });
    
    return (
    <>
      {prodLogs.map((item, idx) => {
        const weekStart = item.week_start ? new Date(item.week_start) : null;
        const weekEnd = item.week_end ? new Date(item.week_end) : null;
        if (!weekStart || isNaN(weekStart.getTime()) || !weekEnd || isNaN(weekEnd.getTime())) {
          console.log('Invalid week dates for item:', item);
          return null;
        }
        
        // Check if this is a future week
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isFutureWeek = weekStart > today;
        
        return (
          <div 
            key={item.week_start} 
            className={`grid grid-cols-3 gap-4 items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-6 py-4 mb-2 transition-colors duration-200 ${
              isFutureWeek 
                ? 'cursor-not-allowed opacity-50' 
                : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50'
            }`}
            onClick={() => {
              if (!isFutureWeek) {
                handleWeekClick(item.week_start, item.week_end, item.log.completion_rate);
              }
            }}
          >
            <div className="text-left">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {isFutureWeek && <span className="ml-2 text-xs text-orange-500">(Future Week)</span>}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {isFutureWeek ? 'Future week - no data available' : 'Click to view daily breakdown'}
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-lg">
                <div className="w-full h-6 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.log.completion_rate >= 90 ? 'bg-green-600 dark:bg-green-400' :
                      item.log.completion_rate >= 70 ? 'bg-green-500 dark:bg-green-300' :
                      item.log.completion_rate >= 40 ? 'bg-yellow-500 dark:bg-yellow-400' :
                      'bg-red-500 dark:bg-red-400'
                    }`}
                    style={{ width: `${Math.min(item.log.completion_rate, 100)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white pointer-events-none">
                    {item.log.completion_rate % 1 === 0 ? item.log.completion_rate.toFixed(0) : item.log.completion_rate.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-base font-bold ${getProductivityColor(item.log.status)}`}>{item.log.status}</span>
            </div>
          </div>
        );
      })}
      
      {/* Show message if no weekly data found */}
      {prodLogs.length === 0 && (
        <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-6 py-8">
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
    console.log('renderMonthlyView called with:', {
      prodLogsLength: prodLogs.length,
      prodLogs: prodLogs
    });
    
    return (
    <>
      {prodLogs.map((item, idx) => {
        if (!item.month || isNaN(item.month) || item.month < 1 || item.month > 12) {
          console.log('Invalid month for item:', item);
          return null;
        }
        const monthDate = new Date(selectedDate.getFullYear(), item.month - 1, 1);
        if (isNaN(monthDate.getTime())) return null;
        
        // Check if this is a future month
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isFutureMonth = monthDate > today;
        
        return (
          <div 
            key={item.month} 
            className={`grid grid-cols-3 gap-4 items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-6 py-4 mb-2 transition-colors duration-200 ${
              isFutureMonth 
                ? 'cursor-not-allowed opacity-50' 
                : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50'
            }`}
            onClick={() => {
              if (!isFutureMonth) {
                handleMonthClick(item.month, selectedDate.getFullYear(), item.log.completion_rate);
              }
            }}
          >
            <div className="text-left">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {monthDate.toLocaleDateString('en-US', { month: 'long' })}
                {isFutureMonth && <span className="ml-2 text-xs text-orange-500">(Future Month)</span>}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {isFutureMonth ? 'Future month - no data available' : 'Click to view daily breakdown'}
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-lg">
                <div className="w-full h-6 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.log.completion_rate >= 90 ? 'bg-green-600 dark:bg-green-400' :
                      item.log.completion_rate >= 70 ? 'bg-green-500 dark:bg-green-300' :
                      item.log.completion_rate >= 40 ? 'bg-yellow-500 dark:bg-yellow-400' :
                      'bg-red-500 dark:bg-red-400'
                    }`}
                    style={{ width: `${Math.min(item.log.completion_rate, 100)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white pointer-events-none">
                    {item.log.completion_rate % 1 === 0 ? item.log.completion_rate.toFixed(0) : item.log.completion_rate.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-base font-bold ${getProductivityColor(item.log.status)}`}>{item.log.status}</span>
            </div>
          </div>
        );
      })}
      
      {/* Show message if no monthly data found */}
      {prodLogs.length === 0 && (
        <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-6 py-8">
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

  return (
    <>
      {/* Productivity Legend - Outside Container */}
      <ProductivityLegend getProductivityColor={getProductivityColor} />
      
      <div className="w-full mb-4">
        <div className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 rounded-xl w-full flex flex-col" style={{ height: 520 }}>
          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-t-xl px-12 py-2 border-b border-gray-200 dark:border-gray-600">
            <span className="text-base font-semibold text-gray-900 dark:text-white">Productivity Scale History</span>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handlePrev} 
                className={`px-2 py-1 rounded ${isPrevDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                disabled={isPrevDisabled}
              >
                &#60;
              </button>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{getDateDisplay()}</span>
              <button
                onClick={handleNext}
                className={`px-2 py-1 rounded ${isNextDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                disabled={isNextDisabled}
              >
                &#62;
              </button>
            </div>
          </div>
          {/* Scrollable list of productivity logs */}
          <div className="flex-1 overflow-y-scroll px-12 py-4">
            {progressView === 'Daily' && renderDailyView()}
            {progressView === 'Weekly' && renderWeeklyView()}
            {progressView === 'Monthly' && renderMonthlyView()}
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
    </>
  );
};

export default ProductivityHistory; 
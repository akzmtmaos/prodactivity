import React from 'react';
import ProductivityRow from './ProductivityRow';

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
  const renderDailyView = () => {
    console.log('renderDailyView called with:', {
      prodLogsLength: prodLogs.length,
      selectedDate: selectedDate.toISOString(),
      selectedMonth: selectedDate.getMonth(),
      selectedYear: selectedDate.getFullYear()
    });
    
    // Find the productivity data for the selected date
    // Use local date formatting to avoid timezone issues
    const selectedDateStr = selectedDate.toLocaleDateString('en-CA'); // Format as YYYY-MM-DD in local timezone
    const selectedDateData = prodLogs.find(item => item.date === selectedDateStr);
    
    // Check if selected date is today
    const today = new Date();
    const isSelectedDateToday = selectedDate.toDateString() === today.toDateString();
    
    console.log('Debug info:', {
      selectedDateStr,
      isSelectedDateToday,
      selectedDateData: selectedDateData ? 'Found' : 'Not found',
      allDates: prodLogs.map(item => item.date).slice(0, 10), // Show first 10 dates for debugging
      selectedDateISO: selectedDate.toISOString(),
      selectedDateString: selectedDate.toString(),
      todayISO: today.toISOString(),
      todayString: today.toString(),
      selectedDateLocal: selectedDate.toLocaleDateString('en-CA'),
      todayLocal: today.toLocaleDateString('en-CA')
    });
    
    return (
    <>
      {/* Show productivity for the selected date (not always today) */}
      {selectedDateData && (
        <ProductivityRow
          date={selectedDateData.date}
          completionRate={selectedDateData.log.completion_rate}
          status={selectedDateData.log.status}
          isToday={isSelectedDateToday}
          getProductivityColor={getProductivityColor}
        />
      )}
      
      {/* If no data found for selected date, show a message */}
      {!selectedDateData && (
        <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-6 py-8 mb-4">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-2">No data found for {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">This might be because:</p>
            <ul className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              <li>• No tasks were completed on this date</li>
              <li>• Data is still being processed</li>
              <li>• API is not returning data for this date</li>
            </ul>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Total logs received: {prodLogs.length}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Looking for date: {selectedDateStr}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Is today: {isSelectedDateToday ? 'Yes' : 'No'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Available dates: {prodLogs.map(item => item.date).slice(0, 5).join(', ')}</p>
          </div>
        </div>
      )}
      
      {/* Historical logs */}
      {console.log('All prodLogs:', prodLogs)} {/* Debug log */}
      {prodLogs
        .filter(item => {
          if (!item || !item.date) {
            console.log('Item missing date:', item);
            return false;
          }
          
          // Parse date properly to avoid timezone issues
          const dayDate = new Date(item.date + 'T00:00:00.000Z');
          if (isNaN(dayDate.getTime())) {
            console.log('Invalid date for item:', item);
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
          const shouldShow = dayDate < today && isInSelectedMonth && !isSelectedDate;
          console.log(`Date ${dayDate.toISOString()}: selectedMonth=${selectedMonth}, selectedYear=${selectedYear}, itemMonth=${itemMonth}, itemYear=${itemYear}, isInSelectedMonth=${isInSelectedMonth}, shouldShow=${shouldShow}, item:`, item);
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
        return (
          <div key={item.week_start} className="grid grid-cols-3 gap-4 items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-6 py-4 mb-2">
            <div className="text-left">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
        return (
          <div key={item.month} className="grid grid-cols-3 gap-4 items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-6 py-4 mb-2">
            <div className="text-left">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {monthDate.toLocaleDateString('en-US', { month: 'long' })}
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
    <div className="w-full mb-4">
      <div className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 rounded-xl w-full flex flex-col" style={{ height: 440 }}>
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
  );
};

export default ProductivityHistory; 
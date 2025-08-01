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
  const renderDailyView = () => (
    <>
      {/* Today's productivity as topmost entry */}
      {productivity && (
        <ProductivityRow
          date={new Date().toISOString()}
          completionRate={productivity.completion_rate || 0}
          status={productivity.status || 'No Tasks'}
          isToday={true}
          getProductivityColor={getProductivityColor}
        />
      )}
      
      {/* Historical logs */}
      {console.log('All prodLogs:', prodLogs)} {/* Debug log */}
      {prodLogs
        .filter(item => {
          if (!item || !item.date) {
            console.log('Item missing date:', item);
            return false;
          }
          
          const dayDate = new Date(item.date);
          if (isNaN(dayDate.getTime())) {
            console.log('Invalid date for item:', item);
            return false;
          }
          
          const today = new Date();
          today.setHours(0,0,0,0);
          dayDate.setHours(0,0,0,0);
          
          if (dayDate.getTime() === today.getTime()) {
            console.log('Skipping today:', dayDate.toISOString());
            return false;
          }
          
          const shouldShow = dayDate < today;
          console.log(`Date ${dayDate.toISOString()}: today=${today.toISOString()}, shouldShow=${shouldShow}`);
          return shouldShow;
        })
        .sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB.getTime() - dateA.getTime();
        })
        .map((item, idx) => {
          const dayDate = item.date ? new Date(item.date) : null;
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
      
      {/* Show message if no historical data found */}
      {prodLogs.filter(item => {
        if (!item || !item.date) return false;
        const dayDate = new Date(item.date);
        if (isNaN(dayDate.getTime())) return false;
        const today = new Date();
        today.setHours(0,0,0,0);
        dayDate.setHours(0,0,0,0);
        return dayDate.getTime() !== today.getTime() && dayDate < today;
      }).length === 0 && (
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

  const renderWeeklyView = () => (
    <>

      {prodLogs
        .filter(item => {
          // Filter to only show data for the selected year
          const weekStart = item.week_start ? new Date(item.week_start) : null;
          if (!weekStart || weekStart.getFullYear() !== selectedDate.getFullYear()) {
            return false;
          }
          return true;
        })
        .map((item, idx) => {
          const weekStart = item.week_start ? new Date(item.week_start) : null;
          const weekEnd = item.week_end ? new Date(item.week_end) : null;
          if (!weekStart || isNaN(weekStart.getTime()) || !weekEnd || isNaN(weekEnd.getTime())) return null;
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
                      {item.log.completion_rate}%
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
      
      {/* Show message if no data for selected year */}
      {prodLogs.filter(item => {
        const weekStart = item.week_start ? new Date(item.week_start) : null;
        return weekStart && weekStart.getFullYear() === selectedDate.getFullYear();
      }).length === 0 && (
        <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-6 py-8">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400">No productivity data available for {selectedDate.getFullYear()}</p>
          </div>
        </div>
      )}
    </>
  );

  const renderMonthlyView = () => (
    <>

      {prodLogs
        .filter(item => {
          // Filter to only show data for the selected year
          if (!item.year || item.year !== selectedDate.getFullYear()) {
            return false;
          }
          return true;
        })
        .map((item, idx) => {
          if (!item.month || isNaN(item.month) || item.month < 1 || item.month > 12) return null;
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
                      {item.log.completion_rate}%
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
      
      {/* Show message if no data for selected year */}
      {prodLogs.filter(item => item.year === selectedDate.getFullYear()).length === 0 && (
        <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-6 py-8">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400">No productivity data available for {selectedDate.getFullYear()}</p>
          </div>
        </div>
      )}
    </>
  );

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
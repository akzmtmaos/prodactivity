import React, { useEffect, useState } from 'react';
import LevelLeague from './LevelLeague';
import StreaksCalendar from './StreaksCalendar';
import DailyBreakdownModal from './DailyBreakdownModal';
import { List } from 'lucide-react';

interface ProgressOverviewProps {
  userLevel: {
    currentLevel: number;
    currentXP: number;
    xpToNextLevel: number;
  };
  todaysProductivity: any;
  streakData: any[];
  currentStreak?: number;
  longestStreak?: number;
  refreshProductivity: () => void;
  getProductivityColor?: (status: string) => string;
  username?: string;
  avatar?: string | null;
}

const ProgressOverview: React.FC<ProgressOverviewProps> = ({
  userLevel,
  todaysProductivity,
  streakData,
  currentStreak = 0,
  longestStreak = 0,
  refreshProductivity,
  getProductivityColor
}) => {
  const [showTodayBreakdown, setShowTodayBreakdown] = useState(false);
  
  // Default productivity color function if not provided
  const defaultGetProductivityColor = (status: string) => {
    switch (status) {
      case 'Highly Productive':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'Productive':
        return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300';
      case 'Moderately Productive':
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400';
      case 'Low Productive':
        return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
      default:
        return 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
    }
  };
  
  // Debug: Log the props received
  console.log('🔍 ProgressOverview received props:', {
    userLevel,
    todaysProductivity,
    streakData: streakData?.length || 0,
    refreshProductivity: typeof refreshProductivity
  });
  
  // Force re-render when todaysProductivity changes
  useEffect(() => {
    console.log('🔄 ProgressOverview: todaysProductivity changed:', todaysProductivity);
  }, [todaysProductivity]);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-4 lg:items-stretch">
      {/* Left column: Level League + Streaks card, then Today's Productivity Bar (stretches to match calendar height) */}
      <div className="flex flex-col w-full min-h-0 lg:min-h-full">
        {/* Level League + Streaks info (one container: League left, Streaks right) */}
        <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333333] rounded-lg shadow p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-6 min-h-[180px] flex-shrink-0">
          <div className="flex-1 w-full flex justify-center">
            <LevelLeague currentLevel={userLevel.currentLevel} />
          </div>
          <div className="flex-1 w-full flex flex-row sm:flex-col justify-center items-center gap-6 sm:gap-4 border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-[#333333] pt-6 sm:pt-0 sm:pl-6">
            <div className="text-center">
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{currentStreak}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Current Streak</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{longestStreak}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Longest Streak</div>
            </div>
          </div>
        </div>

        {/* Today's Productivity Bar - grows to fill space when calendar is taller */}
        <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333333] rounded-lg shadow p-6 flex-1 flex flex-col items-start min-h-0">
          <div className="flex items-center justify-between w-full mb-3">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Today's Productivity</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <button 
                onClick={() => setShowTodayBreakdown(true)}
                className="text-xs bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors flex items-center gap-1"
                title="View today's breakdown"
              >
                <List size={12} />
                Breakdown
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between w-full mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {(() => {
                const status = (todaysProductivity && todaysProductivity.status !== undefined) ? todaysProductivity.status : 'No Tasks';
                const rate = (todaysProductivity && todaysProductivity.completion_rate !== undefined) ? todaysProductivity.completion_rate : 0;
                console.log('🔍 ProgressOverview displaying productivity:', { status, rate, todaysProductivity });
                return `${status} (${rate}%)`;
              })()}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                todaysProductivity && todaysProductivity.completion_rate >= 90 ? 'bg-green-500 dark:bg-green-400' :
                todaysProductivity && todaysProductivity.completion_rate >= 70 ? 'bg-green-500 dark:bg-green-300' :
                todaysProductivity && todaysProductivity.completion_rate >= 40 ? 'bg-yellow-500 dark:bg-yellow-400' :
                todaysProductivity && todaysProductivity.completion_rate > 0 ? 'bg-red-500 dark:bg-red-400' :
                'bg-gray-300 dark:bg-gray-600'
              }`}
              style={{ width: `${(todaysProductivity && todaysProductivity.completion_rate !== undefined) ? Math.min(todaysProductivity.completion_rate, 100) : 0}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Right column: Streaks Calendar (grid row keeps both columns equal height for any month) */}
      <div className="w-full flex flex-col min-h-0">
        <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333333] rounded-lg shadow p-6 w-full h-full min-h-0 flex flex-col items-center">
          <h3 className="text-base font-semibold mb-4 text-gray-900 dark:text-white">Streaks Calendar</h3>
          <StreaksCalendar streakData={streakData} todaysProductivity={todaysProductivity} />
        </div>
      </div>
      
      {/* Today's Daily Breakdown Modal */}
      <DailyBreakdownModal
        isOpen={showTodayBreakdown}
        onClose={() => setShowTodayBreakdown(false)}
        date={new Date().toLocaleDateString('en-CA')}
        dailyPercentage={todaysProductivity?.completion_rate || 0}
        getProductivityColor={getProductivityColor || defaultGetProductivityColor}
      />
    </div>
  );
};

export default ProgressOverview; 
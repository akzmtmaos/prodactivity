import React, { useEffect } from 'react';
import LevelProgressRing from './LevelProgressRing';
import StreaksCalendar from './StreaksCalendar';

interface ProgressOverviewProps {
  userLevel: {
    currentLevel: number;
    currentXP: number;
    xpToNextLevel: number;
  };
  todaysProductivity: any;
  streakData: any[];
  refreshProductivity: () => void;
}

const ProgressOverview: React.FC<ProgressOverviewProps> = ({
  userLevel,
  todaysProductivity,
  streakData,
  refreshProductivity
}) => {
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
  
  // Progress bar for LevelProgress
  const progressPercentage = Math.min(userLevel.currentXP / userLevel.xpToNextLevel, 1) * 100;

  return (
    <div className="flex flex-col md:flex-row md:space-x-8 items-center mb-4">
      {/* Left column: LevelProgressRing, XP Bar, Today's Productivity Bar */}
      <div className="flex flex-col w-full md:w-1/2 mb-6 md:mb-0">
        {/* LevelProgressRing */}
        <div className="flex justify-center w-full mb-4">
          <LevelProgressRing
            currentLevel={userLevel.currentLevel}
            currentXP={userLevel.currentXP}
            xpToNextLevel={userLevel.xpToNextLevel}
            size={200}
          />
        </div>
        {/* Level XP Bar */}
        <div className="w-full max-w-2xl mx-auto mt-2 mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-200">Level XP</span>
            <span className="text-sm font-bold">{userLevel.currentXP} / {userLevel.xpToNextLevel} XP</span>
          </div>
          <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        {/* Today's Productivity Bar (in its own container, always visible, uses todaysProductivity) */}
        <div className="w-full max-w-2xl mx-auto mt-2 mb-4 bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-400 dark:border-indigo-500 rounded-lg shadow-md p-4 flex flex-col items-start">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-base font-semibold text-indigo-700 dark:text-indigo-200">Today's Productivity</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <button 
                onClick={refreshProductivity}
                className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                title="Refresh productivity data"
              >
                🔄
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Status:</span>
            <span className="text-sm font-bold">
              {(() => {
                const status = (todaysProductivity && todaysProductivity.status !== undefined) ? todaysProductivity.status : 'No Tasks';
                const rate = (todaysProductivity && todaysProductivity.completion_rate !== undefined) ? todaysProductivity.completion_rate : 0;
                console.log('🔍 ProgressOverview displaying productivity:', { status, rate, todaysProductivity });
                return `${status} (${rate}%)`;
              })()}
            </span>
          </div>
          <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                todaysProductivity && todaysProductivity.completion_rate >= 90 ? 'bg-green-600 dark:bg-green-400' :
                todaysProductivity && todaysProductivity.completion_rate >= 70 ? 'bg-green-500 dark:bg-green-300' :
                todaysProductivity && todaysProductivity.completion_rate >= 40 ? 'bg-yellow-500 dark:bg-yellow-400' :
                todaysProductivity && todaysProductivity.completion_rate > 0 ? 'bg-red-500 dark:bg-red-400' :
                'bg-gray-300 dark:bg-gray-700'
              }`}
              style={{ width: `${(todaysProductivity && todaysProductivity.completion_rate !== undefined) ? Math.min(todaysProductivity.completion_rate, 100) : 0}%` }}
            />
          </div>
        </div>
      </div>
      {/* Right column: Streaks Calendar */}
      <div className="w-full md:w-1/2 flex justify-center items-center">
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 w-full flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Streaks</h3>
          <StreaksCalendar streakData={streakData} todaysProductivity={todaysProductivity} />
        </div>
      </div>
    </div>
  );
};

export default ProgressOverview; 
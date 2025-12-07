import React, { useEffect, useState } from 'react';
import LevelProgressRing from './LevelProgressRing';
import StreaksCalendar from './StreaksCalendar';
import DailyBreakdownModal from './DailyBreakdownModal';
import { List } from 'lucide-react';
import { getAvatarUrl } from '../chat/utils';

interface ProgressOverviewProps {
  userLevel: {
    currentLevel: number;
    currentXP: number;
    xpToNextLevel: number;
  };
  todaysProductivity: any;
  streakData: any[];
  refreshProductivity: () => void;
  getProductivityColor?: (status: string) => string;
  username?: string;
  avatar?: string | null;
}

const ProgressOverview: React.FC<ProgressOverviewProps> = ({
  userLevel,
  todaysProductivity,
  streakData,
  refreshProductivity,
  getProductivityColor,
  username = 'User',
  avatar
}) => {
  const [showTodayBreakdown, setShowTodayBreakdown] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const avatarUrl = avatar ? getAvatarUrl(avatar) : null;
  
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
  
  // Progress bar for LevelProgress
  const progressPercentage = Math.min(userLevel.currentXP / userLevel.xpToNextLevel, 1) * 100;

  return (
    <div className="flex flex-col lg:flex-row lg:space-x-8 items-center mb-4">
      {/* Left column: LevelProgressRing, XP Bar, Today's Productivity Bar */}
      <div className="flex flex-col w-full lg:w-1/2 mb-6 lg:mb-0">
        {/* LevelProgressRing Container */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-100 dark:border-gray-700/50 rounded-3xl shadow-lg dark:shadow-indigo-500/10 p-8 mb-6 flex justify-center">
          <LevelProgressRing
            currentLevel={userLevel.currentLevel}
            currentXP={userLevel.currentXP}
            xpToNextLevel={userLevel.xpToNextLevel}
            size={200}
          />
        </div>
        
        {/* Level XP Bar - Discord Rank Card Style */}
        <div className="bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 backdrop-blur-sm border-2 border-indigo-300/50 dark:border-indigo-400/30 rounded-2xl shadow-2xl dark:shadow-indigo-500/20 p-5 mb-4">
          <div className="flex items-center gap-4">
            {/* Profile Picture */}
            <div className="flex-shrink-0 relative">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-indigo-400/60 dark:border-indigo-400/50 shadow-lg ring-4 ring-indigo-400/20 dark:ring-indigo-400/20">
                {avatarUrl && !imageError ? (
                  <img
                    src={avatarUrl}
                    alt={username}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
              {/* Level Badge */}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-lg">
                <span className="text-xs font-bold text-white">{userLevel.currentLevel}</span>
              </div>
            </div>
            
            {/* Progress Bar Section */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 dark:text-gray-100 font-bold text-base truncate">{username}</span>
                </div>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                  {userLevel.currentXP} / {userLevel.xpToNextLevel} XP
                </span>
              </div>
              <div className="w-full h-4 bg-gray-200/70 dark:bg-gray-800/70 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 dark:from-indigo-400 dark:via-purple-400 dark:to-indigo-400 transition-all duration-500 rounded-full shadow-lg relative overflow-hidden"
                  style={{ width: `${progressPercentage}%` }}
                >
                  {/* Animated shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>
              </div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Level {userLevel.currentLevel} • {userLevel.xpToNextLevel - userLevel.currentXP} XP to Level {userLevel.currentLevel + 1}
              </div>
            </div>
          </div>
        </div>
        
        {/* Today's Productivity Bar */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-100 dark:border-gray-700/50 rounded-2xl shadow-lg dark:shadow-indigo-500/10 p-6 flex flex-col items-start">
          <div className="flex items-center justify-between w-full mb-3">
            <span className="text-base font-semibold text-indigo-700 dark:text-indigo-300">Today's Productivity</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <button 
                onClick={() => setShowTodayBreakdown(true)}
                className="text-xs bg-blue-500/90 text-white px-3 py-1.5 rounded-xl hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200 flex items-center gap-1 shadow-sm"
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
      
      {/* Right column: Streaks Calendar */}
      <div className="w-full lg:w-1/2 flex justify-center items-center">
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-100 dark:border-gray-700/50 rounded-2xl shadow-lg dark:shadow-indigo-500/10 p-6 w-full flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Streaks Calendar</h3>
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
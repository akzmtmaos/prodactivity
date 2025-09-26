import React, { useEffect } from 'react';
import { Flame, Target, Clock, TrendingUp } from 'lucide-react';

interface WeeklyStats {
  totalTasksCompleted: number;
  totalStudyTime: number;
  averageProductivity: number;
  streak: number;
  streakData?: any[];
}

interface StatsCardsProps {
  stats: WeeklyStats;
  todaysProductivity?: {
    completion_rate: number;
    total_tasks: number;
    completed_tasks: number;
    status?: string;
  } | null;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats, todaysProductivity }) => {
  // Debug: Log the stats received
  useEffect(() => {
    console.log('📊 StatsCards received stats:', stats);
    console.log('🔥 Day Streak value:', stats.streak);
  }, [stats]);

  // Calculate current streak using the same logic as StreaksCalendar
  const calculateCurrentStreak = () => {
    console.log('🔥 StatsCards calculateCurrentStreak DEBUG:');
    console.log('🔥 stats.streakData:', stats.streakData);
    console.log('🔥 stats.streakData length:', stats.streakData?.length);
    console.log('🔥 stats.streakData sample:', stats.streakData?.slice(0, 3));
    console.log('🔥 todaysProductivity:', todaysProductivity);
    
    if (!stats.streakData || stats.streakData.length === 0) {
      console.log('🔥 No streakData available, returning 0');
      return 0;
    }
    
    const sortedData = [...stats.streakData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Use the same date logic as Progress.tsx (local timezone)
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD format (local date)
    
    console.log('🔥 StatsCards timezone debug:');
    console.log('🔥 Full date object:', now);
    console.log('🔥 ISO string (UTC):', now.toISOString());
    console.log('🔥 Local date string:', todayStr);
    console.log('🔥 Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log('🔥 Sorted data sample:', sortedData.slice(0, 3));
    
    // Check if we have data for today
    let todayData = sortedData.find(day => day.date === todayStr);
    console.log('🔥 Today data found:', todayData);
    
    // Fallback to todaysProductivity if streakData doesn't include today
    if ((!todayData || !todayData.streak) && todaysProductivity) {
      const fallbackStreak = (todaysProductivity.total_tasks > 0 && todaysProductivity.completed_tasks > 0);
      console.log('🔥 Using todaysProductivity fallback:', todaysProductivity, '-> streak:', fallbackStreak);
      if (fallbackStreak) {
        todayData = {
          date: todayStr,
          streak: true,
          productivity: todaysProductivity.completion_rate,
          total_tasks: todaysProductivity.total_tasks,
          completed_tasks: todaysProductivity.completed_tasks,
        } as any;
        // Ensure today is considered at the front
        sortedData.unshift(todayData);
      }
    }
    
    if (!todayData || !todayData.streak) {
      console.log('🔥 No streak for today after fallback, returning 0');
      return 0; // No streak if today is not productive
    }
    
    console.log('🔥 Today has streak, calculating current streak...');
    let currentStreak = 1; // Start with today
    let currentDate = new Date();
    
    // Go backwards day by day to check for consecutive productive days
    for (let i = 1; i < 365; i++) { // Check up to 1 year back
      currentDate.setDate(currentDate.getDate() - 1);
      const dateStr = currentDate.toLocaleDateString('en-CA'); // Use local date format
      
      const dayData = sortedData.find(day => day.date === dateStr);
      
      if (dayData && dayData.streak) {
        currentStreak++;
        console.log(`🔥 Day ${i}: ${dateStr} has streak, current streak: ${currentStreak}`);
      } else {
        console.log(`🔥 Day ${i}: ${dateStr} no streak, breaking at ${currentStreak}`);
        // If no data for this day or day is not productive, streak is broken
        break;
      }
    }
    
    console.log('🔥 Final current streak:', currentStreak);
    return currentStreak;
  };

  const currentStreak = calculateCurrentStreak();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Streak Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
            <Flame size={24} className="text-orange-600 dark:text-orange-400" />
          </div>
          <div className="ml-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentStreak}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Current Streak</p>
          </div>
        </div>
      </div>

      {/* Tasks Completed Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <Target size={24} className="text-green-600 dark:text-green-400" />
          </div>
          <div className="ml-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalTasksCompleted}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Tasks Completed</p>
          </div>
        </div>
      </div>

      {/* Study Time Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Clock size={24} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="ml-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.floor(stats.totalStudyTime / 60)}h {stats.totalStudyTime % 60}m
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Study Time</p>
          </div>
        </div>
      </div>

      {/* Productivity Score Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
            <TrendingUp size={24} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div className="ml-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.averageProductivity}%
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Productivity Score</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards; 
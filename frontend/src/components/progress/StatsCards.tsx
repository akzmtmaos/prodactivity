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
    
    // NEW LOGIC: If today has no completed tasks yet, maintain yesterday's streak
    // Grace period: streak persists through midnight and only breaks if user doesn't complete tasks by end of day
    
    const todayHasStreak = todayData && todayData.streak;
    
    let currentStreak = 0;
    let startFromDate: Date;
    
    if (!todayHasStreak) {
      console.log('🔥 StatsCards: Today has no completed tasks yet - checking yesterday to maintain streak');
      // Get yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA');
      const yesterdayData = sortedData.find(day => day.date === yesterdayStr);
      
      console.log('🔥 StatsCards: Yesterday:', yesterdayStr);
      console.log('🔥 StatsCards: Yesterday data:', yesterdayData);
      
      // If yesterday had NO streak, the streak is broken
      if (!yesterdayData || !yesterdayData.streak) {
        console.log('🔥 StatsCards: Yesterday had no completed tasks - streak is broken, returning 0');
        return 0;
      }
      
      // Yesterday had a streak - count from yesterday (not including today since it has no tasks yet)
      console.log('🔥 StatsCards: ✅ Yesterday had a streak! Counting from yesterday backwards...');
      currentStreak = 1; // Count yesterday as day 1 of streak
      startFromDate = yesterday; // Start traversing from yesterday
    } else {
      console.log('🔥 StatsCards: Today has completed tasks - counting from today');
      currentStreak = 1; // Count today as day 1 of streak
      startFromDate = new Date(); // Start traversing from today
    }
    
    // Count backwards from the start date to find consecutive streak days
    for (let i = 1; i < 365; i++) {
      // Create a new Date object to avoid mutation issues
      const checkDate = new Date(startFromDate);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toLocaleDateString('en-CA');
      const dayData = sortedData.find(day => day.date === dateStr);
      
      if (dayData && dayData.streak) {
        currentStreak++;
        console.log(`🔥 StatsCards: Day -${i} (${dateStr}): ✅ Consecutive day found! Total streak now: ${currentStreak}`);
      } else {
        console.log(`🔥 StatsCards: Day -${i} (${dateStr}): ❌ Streak broken. Final streak: ${currentStreak}`);
        break;
      }
    }
    
    console.log('🔥 StatsCards: Final current streak:', currentStreak, todayHasStreak ? '(counting from today)' : '(counting from yesterday - grace period)');
    return currentStreak;
  };

  const currentStreak = calculateCurrentStreak();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Streak Card */}
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-100 dark:border-gray-800/50 rounded-2xl p-6 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 group">
        <div className="flex items-center">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 transition-colors">
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
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-100 dark:border-gray-800/50 rounded-2xl p-6 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 group">
        <div className="flex items-center">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl group-hover:bg-green-50 dark:group-hover:bg-green-900/20 transition-colors">
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
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-100 dark:border-gray-800/50 rounded-2xl p-6 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 group">
        <div className="flex items-center">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
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
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-100 dark:border-gray-800/50 rounded-2xl p-6 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 group">
        <div className="flex items-center">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl group-hover:bg-purple-50 dark:group-hover:bg-purple-900/20 transition-colors">
            <TrendingUp size={24} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div className="ml-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.averageProductivity}%
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Overall Productivity</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards; 
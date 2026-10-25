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

    const studyTime =
    stats.totalStudyTime >= 60
      ? (() => {
          const hours = Math.floor(stats.totalStudyTime / 60);
          const minutes = stats.totalStudyTime % 60;
          return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        })()
      : `${stats.totalStudyTime}m`;

  const summaryItems = [
    {
      label: 'Current streak',
      value: `${currentStreak}`,
      icon: Flame,
      tone: 'text-orange-500 dark:text-orange-400',
    },
    {
      label: 'Tasks completed',
      value: `${stats.totalTasksCompleted}`,
      icon: Target,
      tone: 'text-emerald-500 dark:text-emerald-400',
    },
    {
      label: 'Study time',
      value: studyTime,
      icon: Clock,
      tone: 'text-blue-500 dark:text-blue-400',
    },
    {
      label: 'Avg. completion',
      value: `${stats.averageProductivity}%`,
      icon: TrendingUp,
      tone: 'text-violet-500 dark:text-violet-400',
    },
  ];

  return (
    <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-[#2f2f2f] dark:bg-[#1e1e1e] sm:grid-cols-4">
      {summaryItems.map((item, index) => {
        const Icon = item.icon;
        const borderClasses = [
          index % 2 === 1 ? 'border-l' : '',
          index >= 2 ? 'border-t sm:border-t-0' : '',
          index >= 1 ? 'sm:border-l' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div
            key={item.label}
            className={`flex min-w-0 items-center gap-2 border-gray-200 px-3.5 py-2.5 dark:border-[#2f2f2f] ${borderClasses}`}
          >
            <Icon size={14} className={`flex-shrink-0 ${item.tone}`} />
            <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
              {item.value}
            </span>
            <span className="min-w-0 truncate text-xs text-gray-500 dark:text-gray-400">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards; 
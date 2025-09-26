import React, { useState, useEffect } from 'react';

interface StreakDay {
  date: string;
  streak: boolean;
  productivity?: number;
  status?: string;
}

interface StreaksCalendarProps {
  streakData: StreakDay[];
  todaysProductivity?: {
    completion_rate: number;
    total_tasks: number;
    completed_tasks: number;
    status?: string;
  } | null;
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthMatrix(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const matrix = [];
  let week: (Date | null)[] = [];
  let day = 1;
  // Fill first week
  for (let i = 0; i < 7; i++) {
    if (i < firstDay.getDay()) {
      week.push(null);
    } else {
      week.push(new Date(year, month, day++));
    }
  }
  matrix.push(week);
  // Fill remaining weeks
  while (day <= lastDay.getDate()) {
    week = [];
    for (let i = 0; i < 7; i++) {
      if (day > lastDay.getDate()) {
        week.push(null);
      } else {
        week.push(new Date(year, month, day++));
      }
    }
    matrix.push(week);
  }
  return matrix;
}

const getStreakColor = (streak: boolean, productivity?: number) => {
  if (!streak) {
    return 'bg-gray-200 dark:bg-gray-700';
  }
  
  // Simple: Just green for any streak day
  return 'bg-green-500 dark:bg-green-400';
};

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const StreaksCalendar: React.FC<StreaksCalendarProps> = ({ streakData, todaysProductivity }) => {
  const today = new Date();
  const [displayedYear, setDisplayedYear] = useState(today.getFullYear());
  const [displayedMonth, setDisplayedMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const matrix = getMonthMatrix(displayedYear, displayedMonth);

  // Debug: Log streak data
  useEffect(() => {
    console.log('📅 StreaksCalendar received data:', streakData.length, 'days');
    const streakDays = streakData.filter(d => d.streak);
    console.log('📅 Streak days in calendar:', streakDays.length);
    if (streakDays.length > 0) {
      console.log('📅 Recent streak days:', streakDays.slice(-5));
    }
  }, [streakData]);

  // Calculate streak statistics
  const calculateCurrentStreak = () => {
    // Sort by date (most recent first)
    const sortedData = [...streakData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (sortedData.length === 0) return 0;
    
    // Use the same date logic as Progress.tsx (local timezone)
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD format (local date)
    
    console.log('🔥 StreaksCalendar timezone debug:');
    console.log('🔥 Full date object:', now);
    console.log('🔥 ISO string (UTC):', now.toISOString());
    console.log('🔥 Local date string:', todayStr);
    console.log('🔥 Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    // Check if we have data for today
    let todayData = sortedData.find(day => day.date === todayStr);
    
    // Fallback to todaysProductivity if streakData doesn't include today
    if ((!todayData || !todayData.streak) && todaysProductivity) {
      const fallbackStreak = (todaysProductivity.total_tasks > 0 && todaysProductivity.completed_tasks > 0);
      console.log('🔥 StreaksCalendar using todaysProductivity fallback:', todaysProductivity, '-> streak:', fallbackStreak);
      if (fallbackStreak) {
        todayData = {
          date: todayStr,
          streak: true,
          productivity: todaysProductivity.completion_rate,
        };
        // Ensure today is considered at the front
        sortedData.unshift(todayData);
      }
    }
    
    if (!todayData || !todayData.streak) {
      return 0; // No streak if today is not productive
    }
    
    let currentStreak = 1; // Start with today
    let currentDate = new Date();
    
    // Go backwards day by day to check for consecutive productive days
    for (let i = 1; i < 365; i++) { // Check up to 1 year back
      currentDate.setDate(currentDate.getDate() - 1);
      const dateStr = currentDate.toLocaleDateString('en-CA'); // Use local date format
      
      const dayData = sortedData.find(day => day.date === dateStr);
      
      if (dayData && dayData.streak) {
        currentStreak++;
      } else {
        // If no data for this day or day is not productive, streak is broken
        break;
      }
    }
    
    return currentStreak;
  };

  const calculateLongestStreak = () => {
    // Create a set of productive dates for quick lookup
    const productiveDates = new Set();
    streakData.forEach(day => {
      if (day.streak) {
        productiveDates.add(day.date);
      }
    });
    
    if (productiveDates.size === 0) return 0;
    
    // Find all consecutive streaks by checking every day
    const streaks = [];
    let currentStreak = [];
    
    // Get date range from streak data
    const dates = Array.from(productiveDates).sort() as string[];
    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[dates.length - 1]);
    
    // Check every day in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      if (productiveDates.has(dateStr)) {
        currentStreak.push(dateStr);
      } else {
        if (currentStreak.length > 0) {
          streaks.push(currentStreak);
          currentStreak = [];
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Don't forget the last streak
    if (currentStreak.length > 0) {
      streaks.push(currentStreak);
    }
    
    // Find the longest streak
    const longestStreak = Math.max(...streaks.map(streak => streak.length), 0);
    
    console.log('🔥 Streak calculation:', {
      totalProductiveDays: productiveDates.size,
      consecutiveStreaks: streaks.length,
      streakLengths: streaks.map(s => s.length),
      longestStreak
    });
    
    return longestStreak;
  };

  const currentStreak = calculateCurrentStreak();
  const longestStreak = calculateLongestStreak();

  const handlePrevMonth = () => {
    if (displayedMonth === 0) {
      setDisplayedYear(displayedYear - 1);
      setDisplayedMonth(11);
    } else {
      setDisplayedMonth(displayedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (displayedMonth === 11) {
      setDisplayedYear(displayedYear + 1);
      setDisplayedMonth(0);
    } else {
      setDisplayedMonth(displayedMonth + 1);
    }
  };

  return (
    <div className="w-full">
      {/* Streak Statistics */}
      <div className="flex justify-between items-center mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{currentStreak}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Current Streak</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{longestStreak}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Longest Streak</div>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          aria-label="Previous Month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {monthNames[displayedMonth]} {displayedYear}
        </h3>
        <button
          onClick={handleNextMonth}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          aria-label="Next Month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-xs font-semibold text-center text-gray-500 dark:text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {matrix.flat().map((date, index) => {
          if (!date) {
            return <div key={index} className="h-12" />;
          }
          
          // Format date as YYYY-MM-DD without timezone issues
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const dayData = streakData.find(d => d.date === dateStr);
          const streak = dayData?.streak || false;
          const productivity = dayData?.productivity;
          const isToday = date.toDateString() === today.toDateString();
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          
          return (
            <div
              key={index}
              className={`
                h-12 rounded-lg flex items-center justify-center font-semibold text-sm cursor-pointer transition-all duration-200
                ${getStreakColor(streak, productivity)}
                ${isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
                ${isSelected ? 'ring-2 ring-orange-500 dark:ring-orange-400' : ''}
                hover:scale-105 hover:shadow-md
                ${streak ? 'text-white' : 'text-gray-600 dark:text-gray-400'}
              `}
              onClick={() => setSelectedDate(date)}
              title={`${dateStr}${productivity !== undefined ? ` - ${productivity}%` : ''}${streak ? ' - Streak Day' : ''}`}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default StreaksCalendar; 
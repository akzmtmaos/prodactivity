import React, { useState, useEffect } from 'react';

interface StreakDay {
  date: string;
  streak: boolean;
  productivity?: number;
  status?: string;
}

interface StreaksCalendarProps {
  streakData: StreakDay[];
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

const StreaksCalendar: React.FC<StreaksCalendarProps> = ({ streakData }) => {
  const today = new Date();
  const [displayedYear, setDisplayedYear] = useState(today.getFullYear());
  const [displayedMonth, setDisplayedMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const matrix = getMonthMatrix(displayedYear, displayedMonth);

  // Calculate streak statistics
  const calculateCurrentStreak = () => {
    // Sort by date (most recent first)
    const sortedData = [...streakData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let currentStreak = 0;
    for (const day of sortedData) {
      if (day.streak) {
        currentStreak++;
      } else {
        break; // Streak broken
      }
    }
    return currentStreak;
  };

  const calculateLongestStreak = () => {
    let longestStreak = 0;
    let currentStreak = 0;
    
    // Sort by date (oldest first)
    const sortedData = [...streakData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (const day of sortedData) {
      if (day.streak) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
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
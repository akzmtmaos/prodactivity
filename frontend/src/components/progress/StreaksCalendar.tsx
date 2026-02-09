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
    // Light: light gray tile; dark: darker tile so each cell is distinct from card background
    return 'bg-gray-200 dark:bg-[#1e1e1e]';
  }
  // Streak day: green
  return 'bg-green-500 dark:bg-green-500/90';
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
      {/* Calendar Header (Current/Longest Streak are shown in the Level League + Streaks card above) */}
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
          const isToday = date.toDateString() === today.toDateString();
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          
          // Use todaysProductivity for today if available
          let streak = dayData?.streak || false;
          let productivity = dayData?.productivity;
          
          if (isToday && todaysProductivity) {
            streak = todaysProductivity.total_tasks > 0 && todaysProductivity.completed_tasks > 0;
            productivity = todaysProductivity.completion_rate;
          }
          
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
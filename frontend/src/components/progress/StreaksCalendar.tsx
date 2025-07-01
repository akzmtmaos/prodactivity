import React, { useState } from 'react';

interface StreakDay {
  date: string;
  streak: boolean;
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

const getColor = (streak: boolean) =>
  streak ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-700';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const StreaksCalendar: React.FC<StreaksCalendarProps> = ({ streakData }) => {
  const today = new Date();
  const [displayedYear, setDisplayedYear] = useState(today.getFullYear());
  const [displayedMonth, setDisplayedMonth] = useState(today.getMonth());
  const matrix = getMonthMatrix(displayedYear, displayedMonth);

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
    <div className="w-full" style={{ marginBottom: 0 }}>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={handlePrevMonth}
          className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          aria-label="Previous Month"
        >
          &lt;
        </button>
        <span className="font-semibold text-gray-900 dark:text-white">
          {monthNames[displayedMonth]} {displayedYear}
        </span>
        <button
          onClick={handleNextMonth}
          className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          aria-label="Next Month"
        >
          &gt;
        </button>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-xs font-semibold text-center text-gray-500 dark:text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1 w-full mx-auto min-h-[384px] justify-center" style={{maxWidth: '504px'}}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-7 gap-1">
            {(matrix[i] || Array(7).fill(null)).map((date, j) => {
              if (!date) {
                return <div key={j} className="w-12 h-12" />;
              }
              const dateStr = date.toISOString().split('T')[0];
              const streak = streakData.find(d => d.date === dateStr)?.streak || false;
              return (
                <div
                  key={j}
                  className={`w-12 h-12 rounded flex items-center justify-center font-semibold text-base ${getColor(streak)} text-white`}
                  title={dateStr}
                >
                  {date.getDate()}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StreaksCalendar; 
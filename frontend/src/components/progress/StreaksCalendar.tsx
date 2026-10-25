import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getMonthMatrix(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const matrix: (Date | null)[][] = [];
  let week: (Date | null)[] = [];
  let day = 1;
  for (let i = 0; i < 7; i++) {
    if (i < firstDay.getDay()) {
      week.push(null);
    } else {
      week.push(new Date(year, month, day++));
    }
  }
  matrix.push(week);
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
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-gray-400 dark:hover:bg-[#242424] dark:hover:text-gray-200"
          aria-label="Previous month"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-medium tabular-nums text-gray-900 dark:text-white">
          {monthNames[displayedMonth]} {displayedYear}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-gray-400 dark:hover:bg-[#242424] dark:hover:text-gray-200"
          aria-label="Next month"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {weekDays.map((day, index) => (
          <div
            key={`${day}-${index}`}
            className="py-1 text-center text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {matrix.flat().map((date, index) => {
          if (!date) {
            return <div key={index} className="h-8" />;
          }

          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const dayData = streakData.find(d => d.date === dateStr);
          const isToday = date.toDateString() === today.toDateString();
          const isSelected = selectedDate?.toDateString() === date.toDateString();

          let streak = dayData?.streak || false;
          let productivity = dayData?.productivity;

          if (isToday && todaysProductivity) {
            streak = todaysProductivity.total_tasks > 0 && todaysProductivity.completed_tasks > 0;
            productivity = todaysProductivity.completion_rate;
          }

          return (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedDate(date)}
              title={`${dateStr}${productivity !== undefined ? ` · ${productivity}%` : ''}${streak ? ' · streak day' : ''}`}
              className={`flex h-8 items-center justify-center rounded-md text-[11px] font-medium tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                streak
                  ? 'bg-green-500 text-white hover:bg-green-600 dark:bg-green-500/90 dark:hover:bg-green-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#262626] dark:text-gray-400 dark:hover:bg-[#2f2f2f]'
              } ${isToday ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-white dark:ring-indigo-400 dark:ring-offset-[#1e1e1e]' : ''} ${
                isSelected && !isToday ? 'ring-2 ring-gray-900 dark:ring-gray-200' : ''
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StreaksCalendar;

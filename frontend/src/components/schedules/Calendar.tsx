import React from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ScheduleEvent } from '../../types/schedule';

interface CalendarProps {
  currentDate: Date;
  events: ScheduleEvent[];
  onDateChange: (date: Date) => void;
  onDeleteEvent: (id: string) => void;
}

const Calendar: React.FC<CalendarProps> = ({
  currentDate,
  events,
  onDateChange,
  onDeleteEvent,
}) => {
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfWeek(currentDate, { weekStartsOn: 0 }), i);
    return {
      date,
      dayName: format(date, 'EEE'),
      dayNumber: format(date, 'd'),
      isToday: isSameDay(date, new Date())
    };
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'study': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'assignment': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'exam': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'meeting': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.date), date)
    ).sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Calendar header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {format(weekDays[0].date, 'MMMM yyyy')}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => onDateChange(addDays(currentDate, -7))}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            &larr; Previous Week
          </button>
          <button
            onClick={() => onDateChange(new Date())}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            Today
          </button>
          <button
            onClick={() => onDateChange(addDays(currentDate, 7))}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            Next Week &rarr;
          </button>
        </div>
      </div>

      {/* Days of the week */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {weekDays.map((day, index) => (
          <div key={index} className="text-center py-3">
            <div className="text-sm text-gray-600 dark:text-gray-300">{day.dayName}</div>
            <div className={`mt-1 font-semibold text-lg ${day.isToday ? 'bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' : 'text-gray-900 dark:text-white'}`}>
              {day.dayNumber}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 min-h-[500px]">
        {weekDays.map((day, dayIndex) => (
          <div key={dayIndex} className="border-r border-b border-gray-200 dark:border-gray-700 p-2 h-full overflow-y-auto">
            {getEventsForDate(day.date).length > 0 ? (
              getEventsForDate(day.date).map((event, eventIndex) => (
                <div
                  key={eventIndex}
                  className={`mb-2 p-2 rounded ${getCategoryColor(event.category)} relative`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-sm">{event.title}</h3>
                    <button
                      onClick={() => onDeleteEvent(event.id)}
                      className="text-xs hover:text-red-600 dark:hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                  <div className="text-xs mt-1">
                    {event.startTime} - {event.endTime}
                  </div>
                  {event.description && (
                    <div className="text-xs mt-1 text-gray-600 dark:text-gray-300">
                      {event.description.length > 40
                        ? `${event.description.substring(0, 40)}...`
                        : event.description}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                No events
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar; 
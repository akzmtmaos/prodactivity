import React, { useState } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ScheduleEvent } from '../../types/schedule';
import EventDetailsModal from './EventDetailsModal';

interface CalendarProps {
  currentDate: Date;
  events: ScheduleEvent[];
  onDateChange: (date: Date) => void;
  onDeleteEvent: (id: string) => void;
  onEventClick?: (event: ScheduleEvent) => void;
}

const Calendar: React.FC<CalendarProps> = ({
  currentDate,
  events,
  onDateChange,
  onDeleteEvent,
  onEventClick,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
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
    // Helper to zero out the time part
    const toMidnight = (d: Date) => {
      const nd = new Date(d);
      nd.setHours(0, 0, 0, 0);
      return nd;
    };
    const dayMid = toMidnight(date).getTime();
    return events.filter(event => {
      const start = toMidnight(new Date(event.date)).getTime();
      const end = event.endDate ? toMidnight(new Date(event.endDate)).getTime() : start;
      return dayMid >= start && dayMid <= end;
    }).sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    );
  };
  
  const isEventPast = (event: ScheduleEvent) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate < now;
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
        {weekDays.map((day, index) => {
          const dayEvents = getEventsForDate(day.date);
          const hasEvents = dayEvents.length > 0;
          
          return (
            <div key={index} className="text-center py-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">{day.dayName}</div>
              <button
                onClick={() => {
                  if (hasEvents && dayEvents.length > 0) {
                    // Show first event when clicking on date
                    setSelectedEvent(dayEvents[0]);
                  }
                }}
                className={`mt-1 font-semibold text-lg transition-all ${
                  day.isToday 
                    ? 'bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' 
                    : hasEvents
                    ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full w-8 h-8 flex items-center justify-center mx-auto cursor-pointer'
                    : 'text-gray-900 dark:text-white'
                }`}
                title={hasEvents ? `${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''} on this day - Click to view` : ''}
              >
                {day.dayNumber}
              </button>
              {hasEvents && (
                <div className="mt-1 flex justify-center gap-1">
                  {dayEvents.slice(0, 3).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full ${
                        day.isToday ? 'bg-white' : 'bg-indigo-500'
                      }`}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 min-h-[500px]">
        {weekDays.map((day, dayIndex) => (
          <div key={dayIndex} className="border-r border-b border-gray-200 dark:border-gray-700 p-2 h-full overflow-y-auto">
            {getEventsForDate(day.date).length > 0 ? (
              getEventsForDate(day.date).map((event, eventIndex) => {
                const isPast = isEventPast(event);
                return (
                  <div
                    key={eventIndex}
                    onClick={() => {
                      setSelectedEvent(event);
                      if (onEventClick) {
                        onEventClick(event);
                      }
                    }}
                    className={`mb-2 p-2 rounded ${getCategoryColor(event.category)} relative cursor-pointer hover:opacity-80 transition-opacity ${
                      isPast ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{event.title}</h3>
                        {isPast && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0" title="Past event">
                            📅
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteEvent(event.id);
                        }}
                        className="text-xs hover:text-red-600 dark:hover:text-red-400 flex-shrink-0 ml-1"
                        title="Delete event"
                      >
                        ×
                      </button>
                    </div>
                    <div className="text-xs mt-1">
                      {event.startTime} - {event.endTime}
                    </div>
                    {event.description && (
                      <div className="text-xs mt-1 text-gray-600 dark:text-gray-300 line-clamp-2">
                        {event.description}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                No events
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Event Details Modal */}
      <EventDetailsModal
        isOpen={selectedEvent !== null}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onDelete={onDeleteEvent}
      />
    </div>
  );
};

export default Calendar; 
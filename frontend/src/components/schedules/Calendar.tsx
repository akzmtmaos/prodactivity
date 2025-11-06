import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { ScheduleEvent } from '../../types/schedule';
import EventDetailsModal from './EventDetailsModal';

type CalendarView = 'weekly' | 'monthly';

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
  const [view, setView] = useState<CalendarView>(() => {
    const saved = localStorage.getItem('calendarView');
    return (saved === 'weekly' || saved === 'monthly') ? saved : 'weekly';
  });

  // Save view preference to localStorage
  useEffect(() => {
    localStorage.setItem('calendarView', view);
  }, [view]);

  // Weekly view days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfWeek(currentDate, { weekStartsOn: 0 }), i);
    return {
      date,
      dayName: format(date, 'EEE'),
      dayNumber: format(date, 'd'),
      isToday: isSameDay(date, new Date())
    };
  });

  // Monthly view days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = getDay(monthStart);
  // Create array with empty cells for days before month starts
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => null);
  const allMonthDays = [...emptyDays, ...monthDays];

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

  const renderWeeklyView = () => (
    <>
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
    </>
  );

  const renderMonthlyView = () => {
    const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <>
        {/* Days of the week header */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {weekDayNames.map((dayName, index) => (
            <div key={index} className="text-center py-2 text-sm font-medium text-gray-600 dark:text-gray-300">
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 min-h-[600px]">
          {allMonthDays.map((day, index) => {
            if (!day) {
              return (
                <div key={`empty-${index}`} className="border-r border-b border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900/50"></div>
              );
            }

            const dayEvents = getEventsForDate(day);
            const hasEvents = dayEvents.length > 0;
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();

            return (
              <div 
                key={day.toISOString()} 
                className={`border-r border-b border-gray-200 dark:border-gray-700 p-2 min-h-[100px] overflow-y-auto ${
                  !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900/30' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <button
                    onClick={() => {
                      if (hasEvents && dayEvents.length > 0) {
                        setSelectedEvent(dayEvents[0]);
                      }
                    }}
                    className={`text-sm font-semibold transition-all ${
                      isToday
                        ? 'bg-indigo-600 text-white rounded-full w-7 h-7 flex items-center justify-center'
                        : hasEvents
                        ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full w-7 h-7 flex items-center justify-center cursor-pointer'
                        : isCurrentMonth
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                    title={hasEvents ? `${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''} on this day - Click to view` : ''}
                  >
                    {format(day, 'd')}
                  </button>
                  {hasEvents && (
                    <div className="flex gap-1">
                      {dayEvents.slice(0, 2).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            isToday ? 'bg-white' : 'bg-indigo-500'
                          }`}
                        />
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{dayEvents.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Events list */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event, eventIndex) => {
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
                        className={`p-1.5 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity ${getCategoryColor(event.category)} ${
                          isPast ? 'opacity-60' : ''
                        }`}
                        title={event.title}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="text-xs mt-0.5">{event.startTime}</div>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Calendar header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {view === 'weekly' 
            ? format(weekDays[0].date, 'MMMM yyyy')
            : format(currentDate, 'MMMM yyyy')
          }
        </h2>
        <div className="flex items-center space-x-3">
          {/* View Toggle */}
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setView('weekly')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                view === 'weekly'
                  ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('monthly')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                view === 'monthly'
                  ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Month
            </button>
          </div>
          
          {/* Navigation buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => onDateChange(view === 'weekly' ? addDays(currentDate, -7) : subMonths(currentDate, 1))}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              &larr; {view === 'weekly' ? 'Previous Week' : 'Previous Month'}
            </button>
            <button
              onClick={() => onDateChange(new Date())}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              Today
            </button>
            <button
              onClick={() => onDateChange(view === 'weekly' ? addDays(currentDate, 7) : addMonths(currentDate, 1))}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              {view === 'weekly' ? 'Next Week' : 'Next Month'} &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Calendar content */}
      {view === 'weekly' ? renderWeeklyView() : renderMonthlyView()}

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
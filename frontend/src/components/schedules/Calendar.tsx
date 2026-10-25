import React, { useState, useEffect } from 'react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ScheduleEvent } from '../../types/schedule';
import { getCategoryStyle } from '../../utils/scheduleCategories';
import HeaderTooltip from '../common/HeaderTooltip';
import EventDetailsModal from './EventDetailsModal';
import DateEventsModal from './DateEventsModal';

type CalendarView = 'weekly' | 'monthly';

interface CalendarProps {
  currentDate: Date;
  events: ScheduleEvent[];
  onDateChange: (date: Date) => void;
  onDeleteEvent: (id: string) => void;
  onEventClick?: (event: ScheduleEvent) => void;
}

const toMidnight = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

/** Real end of an event (date + end time), used to dim finished blocks. */
const eventEnd = (event: ScheduleEvent) => {
  const end = new Date(event.endDate ?? event.date);
  const [hours, minutes] = event.endTime.split(':').map(Number);
  if (Number.isFinite(hours) && Number.isFinite(minutes)) {
    end.setHours(hours, minutes, 0, 0);
  }
  return end;
};

const eventStartsOnOrBefore = (event: ScheduleEvent, day: Date) =>
  toMidnight(new Date(event.date)).getTime() <= toMidnight(day).getTime();

const eventEndsOnOrAfter = (event: ScheduleEvent, day: Date) =>
  toMidnight(new Date(event.endDate ?? event.date)).getTime() >= toMidnight(day).getTime();

const Calendar: React.FC<CalendarProps> = ({
  currentDate,
  events,
  onDateChange,
  onDeleteEvent,
  onEventClick,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<CalendarView>(() => {
    const saved = localStorage.getItem('calendarView');
    return saved === 'weekly' || saved === 'monthly' ? saved : 'weekly';
  });

  useEffect(() => {
    localStorage.setItem('calendarView', view);
  }, [view]);

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(startOfWeek(currentDate, { weekStartsOn: 0 }), index);
    return {
      date,
      isWeekend: getDay(date) === 0 || getDay(date) === 6,
    };
  });

  const monthStart = startOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: endOfMonth(currentDate) });
  const monthCells: (Date | null)[] = [
    ...Array.from({ length: getDay(monthStart) }, () => null),
    ...monthDays,
  ];
  while (monthCells.length % 7 !== 0) monthCells.push(null);

  const getEventsForDate = (date: Date) =>
    events
      .filter((event) => eventStartsOnOrBefore(event, date) && eventEndsOnOrAfter(event, date))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const isEventOver = (event: ScheduleEvent) => eventEnd(event).getTime() < Date.now();

  const openEvent = (event: ScheduleEvent) => {
    setSelectedEvent(event);
    onEventClick?.(event);
  };

  const weekRangeLabel =
    weekDays[0].date.getFullYear() === weekDays[6].date.getFullYear()
      ? `${format(weekDays[0].date, 'MMM d')} – ${format(weekDays[6].date, 'MMM d')}`
      : `${format(weekDays[0].date, 'MMM d, yyyy')} – ${format(weekDays[6].date, 'MMM d, yyyy')}`;

  const renderDayNumber = (date: Date, size: 'sm' | 'md') => {
    const today = isSameDay(date, new Date());
    const sizeClasses = size === 'md' ? 'h-7 w-7 text-[12px]' : 'h-6 w-6 text-[11px]';
    return (
      <button
        type="button"
        onClick={() => setSelectedDate(date)}
        className={`flex items-center justify-center rounded-full font-medium tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${sizeClasses} ${
          today
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#2d2d2d]'
        }`}
        aria-label={`View events on ${format(date, 'EEEE, MMM d')}`}
      >
        {format(date, 'd')}
      </button>
    );
  };

  const renderWeekView = () => (
    <div className="overflow-x-auto">
    <div className="grid min-w-[720px] grid-cols-7 divide-x divide-gray-200 dark:divide-[#2b2b2b]">
      {weekDays.map((day) => {
        const dayEvents = getEventsForDate(day.date);
        return (
          <div
            key={day.date.toISOString()}
            className={`flex min-h-[420px] min-w-0 flex-col ${
              day.isWeekend ? 'bg-gray-50/60 dark:bg-[#232323]/50' : ''
            }`}
          >
            <div className="flex flex-col items-center gap-1 border-b border-gray-200 px-1 py-2 dark:border-[#2b2b2b]">
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {format(day.date, 'EEE')}
              </span>
              {renderDayNumber(day.date, 'md')}
            </div>
            <div className="flex-1 space-y-1 p-1.5">
              {dayEvents.map((event) => {
                const style = getCategoryStyle(event.category);
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => openEvent(event)}
                    className={`block w-full rounded-md border border-transparent px-1.5 py-1 text-left transition-colors hover:border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:hover:border-[#3a3a3a] ${style.chip} ${
                      isEventOver(event) ? 'opacity-55' : ''
                    }`}
                    aria-label={`${event.title}, ${event.startTime} to ${event.endTime}`}
                  >
                    <span className="block truncate text-[11px] font-medium leading-tight">{event.title}</span>
                    <span className="mt-0.5 block truncate text-[10px] tabular-nums opacity-75">
                      {event.startTime}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );

  const renderMonthView = () => (
    <>
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-[#2b2b2b]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, index) => (
          <div
            key={dayName}
            className={`px-2 py-1.5 text-center text-[10px] font-medium uppercase tracking-wider ${
              index === 0 || index === 6 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {dayName}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthCells.map((day, index) => {
          if (!day) {
            return (
              <div
                key={`blank-${index}`}
                className="min-h-[104px] border-b border-r border-gray-200 bg-gray-50/50 dark:border-[#2b2b2b] dark:bg-[#1b1b1b]"
              />
            );
          }

          const dayEvents = getEventsForDate(day);
          const weekend = getDay(day) === 0 || getDay(day) === 6;
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[104px] border-b border-r border-gray-200 p-1.5 dark:border-[#2b2b2b] ${
                weekend ? 'bg-gray-50/60 dark:bg-[#232323]/50' : ''
              } ${isSameMonth(day, currentDate) ? '' : 'opacity-70'}`}
            >
              <div className="mb-1 flex items-center justify-between">
                {renderDayNumber(day, 'sm')}
                {dayEvents.length > 0 && (
                  <span className="text-[10px] tabular-nums text-gray-400 dark:text-gray-500">
                    {dayEvents.length}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((event) => {
                  const style = getCategoryStyle(event.category);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => openEvent(event)}
                      title={`${event.title} · ${event.startTime} – ${event.endTime}`}
                      className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${style.chip} ${
                        isEventOver(event) ? 'opacity-55' : ''
                      }`}
                    >
                      <span className="tabular-nums opacity-70">{event.startTime}</span> {event.title}
                    </button>
                  );
                })}
                {dayEvents.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className="w-full rounded px-1 text-left text-[10px] font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    +{dayEvents.length - 2} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-[#2f2f2f] dark:bg-[#1e1e1e]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-2.5 dark:border-[#2f2f2f]">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <span className="hidden text-[11px] tabular-nums text-gray-500 dark:text-gray-400 sm:inline">
            {view === 'weekly' ? weekRangeLabel : `${monthDays.length} days`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div
            className="flex items-center gap-0.5 rounded-md border border-gray-200 bg-gray-50 p-0.5 dark:border-[#333333] dark:bg-[#252525]"
            role="group"
            aria-label="Calendar view"
          >
            {(['weekly', 'monthly'] as CalendarView[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                aria-pressed={view === option}
                className={`rounded px-2 py-1 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                  view === option
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-[#333333] dark:text-white'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {option === 'weekly' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-0.5">
            <HeaderTooltip label={view === 'weekly' ? 'Previous week' : 'Previous month'} fixed>
              <button
                type="button"
                onClick={() =>
                  onDateChange(view === 'weekly' ? addDays(currentDate, -7) : subMonths(currentDate, 1))
                }
                className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-[#333333] dark:bg-[#252525] dark:text-gray-400 dark:hover:bg-[#2d2d2d] dark:hover:text-gray-200"
                aria-label={view === 'weekly' ? 'Previous week' : 'Previous month'}
              >
                <ChevronLeft size={14} />
              </button>
            </HeaderTooltip>
            <button
              type="button"
              onClick={() => onDateChange(new Date())}
              className="h-7 rounded-md border border-gray-200 bg-white px-2.5 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-[#333333] dark:bg-[#252525] dark:text-gray-300 dark:hover:bg-[#2d2d2d] dark:hover:text-white"
            >
              Today
            </button>
            <HeaderTooltip label={view === 'weekly' ? 'Next week' : 'Next month'} fixed>
              <button
                type="button"
                onClick={() =>
                  onDateChange(view === 'weekly' ? addDays(currentDate, 7) : addMonths(currentDate, 1))
                }
                className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-[#333333] dark:bg-[#252525] dark:text-gray-400 dark:hover:bg-[#2d2d2d] dark:hover:text-gray-200"
                aria-label={view === 'weekly' ? 'Next week' : 'Next month'}
              >
                <ChevronRight size={14} />
              </button>
            </HeaderTooltip>
          </div>
        </div>
      </div>

      {view === 'weekly' ? renderWeekView() : renderMonthView()}

      <EventDetailsModal
        isOpen={selectedEvent !== null}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onDelete={onDeleteEvent}
      />

      <DateEventsModal
        isOpen={selectedDate !== null}
        date={selectedDate}
        events={selectedDate ? getEventsForDate(selectedDate) : []}
        onClose={() => setSelectedDate(null)}
        onEventClick={(event) => {
          setSelectedDate(null);
          openEvent(event);
        }}
        onDelete={onDeleteEvent}
      />
    </div>
  );
};

export default Calendar;

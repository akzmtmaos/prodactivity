import React, { useMemo, useState } from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import { CalendarPlus, Trash2 } from 'lucide-react';
import { ScheduleEvent } from '../../types/schedule';
import { getCategoryLabel, getCategoryStyle } from '../../utils/scheduleCategories';
import HeaderTooltip from '../common/HeaderTooltip';
import EventDetailsModal from './EventDetailsModal';

interface UpcomingEventsProps {
  events: ScheduleEvent[];
  onDeleteEvent: (id: string) => void;
  onEventClick?: (event: ScheduleEvent) => void;
  onCreate?: () => void;
}

const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');

const dayLabel = (date: Date) => {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE');
};

const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ events, onDeleteEvent, onEventClick, onCreate }) => {
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

  const groups = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.startTime.localeCompare(b.startTime)
    );
    const grouped = new Map<string, { date: Date; events: ScheduleEvent[] }>();
    sorted.forEach((event) => {
      const date = new Date(event.date);
      const key = dayKey(date);
      const existing = grouped.get(key);
      if (existing) {
        existing.events.push(event);
      } else {
        grouped.set(key, { date, events: [event] });
      }
    });
    return Array.from(grouped.values());
  }, [events]);

  const openEvent = (event: ScheduleEvent) => {
    setSelectedEvent(event);
    onEventClick?.(event);
  };

  if (groups.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 px-6 py-14 text-center dark:border-[#333333]">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-[#2b2b2b]">
            <CalendarPlus size={18} className="text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Nothing on the horizon</p>
          <p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
            Events you add show up here until they finish, then they move to Past.
          </p>
          {onCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
            >
              <CalendarPlus size={13} />
              Add event
            </button>
          )}
        </div>
        <EventDetailsModal
          isOpen={selectedEvent !== null}
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={onDeleteEvent}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {groups.map((group) => (
          <section key={dayKey(group.date)}>
            <div className="mb-1.5 flex items-baseline gap-2 px-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {dayLabel(group.date)}
              </h3>
              <span className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
                {format(group.date, 'MMM d')} · {group.events.length} event{group.events.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white dark:divide-[#2b2b2b] dark:border-[#2f2f2f] dark:bg-[#1e1e1e]">
              {group.events.map((event) => {
                const style = getCategoryStyle(event.category);
                return (
                  <div
                    key={event.id}
                    className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-[#242424]"
                  >
                    <span className="w-[86px] shrink-0 text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                      {event.startTime}
                      <span className="block text-[10px] text-gray-400 dark:text-gray-500">{event.endTime}</span>
                    </span>
                    <span className={`h-8 w-0.5 shrink-0 rounded-full ${style.bar}`} aria-hidden />
                    <button
                      type="button"
                      onClick={() => openEvent(event)}
                      className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-gray-900 dark:text-white">
                          {event.title}
                        </span>
                        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${style.chip}`}>
                          {getCategoryLabel(event.category)}
                        </span>
                      </span>
                      {event.description && (
                        <span className="mt-0.5 block truncate text-[11px] text-gray-500 dark:text-gray-400">
                          {event.description}
                        </span>
                      )}
                    </button>
                    <HeaderTooltip label="Delete event" fixed>
                      <button
                        type="button"
                        onClick={() => onDeleteEvent(event.id)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 dark:text-gray-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        aria-label={`Delete ${event.title}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </HeaderTooltip>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <EventDetailsModal
        isOpen={selectedEvent !== null}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onDelete={onDeleteEvent}
      />
    </>
  );
};

export default UpcomingEvents;

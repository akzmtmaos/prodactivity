import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Archive, ChevronDown, ChevronUp, Clock, Repeat, Trash2 } from 'lucide-react';
import { PastEvent } from '../../types/schedule';
import { getCategoryLabel, getCategoryStyle } from '../../utils/scheduleCategories';
import HeaderTooltip from '../common/HeaderTooltip';

interface PastEventsProps {
  pastEvents: PastEvent[];
  onRecurEvent?: (event: PastEvent) => void;
  onDeleteEvent?: (id: string) => void;
  currentPage?: number;
  itemsPerPage?: number;
}

const PastEvents: React.FC<PastEventsProps> = ({
  pastEvents,
  onRecurEvent,
  onDeleteEvent,
  currentPage = 1,
  itemsPerPage = 8,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pageEvents = useMemo(() => {
    const sorted = [...pastEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sorted.slice(startIndex, startIndex + itemsPerPage);
  }, [pastEvents, currentPage, itemsPerPage]);

  const monthGroups = useMemo(() => {
    const grouped = new Map<string, PastEvent[]>();
    pageEvents.forEach((event) => {
      const key = format(new Date(event.date), 'MMMM yyyy');
      const existing = grouped.get(key);
      if (existing) {
        existing.push(event);
      } else {
        grouped.set(key, [event]);
      }
    });
    return Array.from(grouped.entries());
  }, [pageEvents]);

  if (pastEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 px-6 py-14 text-center dark:border-[#333333]">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-[#2b2b2b]">
          <Archive size={18} className="text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">Nothing archived yet</p>
        <p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
          Events move here once their end time has passed, so you can look back or repeat them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {monthGroups.map(([month, monthEvents]) => (
        <section key={month}>
          <div className="mb-1.5 flex items-baseline gap-2 px-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {month}
            </h3>
            <span className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
              {monthEvents.length} event{monthEvents.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white dark:divide-[#2b2b2b] dark:border-[#2f2f2f] dark:bg-[#1e1e1e]">
            {monthEvents.map((event) => {
              const style = getCategoryStyle(event.category);
              const isExpanded = expandedId === event.id;
              const date = new Date(event.date);
              return (
                <div key={event.id} className="group px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-[#242424]">
                  <div className="flex items-center gap-3">
                    <div className="flex w-10 shrink-0 flex-col items-center rounded-md bg-gray-50 py-1 dark:bg-[#252525]">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        {format(date, 'MMM')}
                      </span>
                      <span className="text-[15px] font-semibold leading-none tabular-nums text-gray-800 dark:text-gray-200">
                        {format(date, 'd')}
                      </span>
                    </div>

                    <span className={`h-8 w-0.5 shrink-0 rounded-full ${style.bar}`} aria-hidden />

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : event.id)}
                      className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      aria-expanded={isExpanded}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-gray-900 dark:text-white">
                          {event.title}
                        </span>
                        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${style.chip}`}>
                          {getCategoryLabel(event.category)}
                        </span>
                        {event.wasRecurring && (
                          <span className="shrink-0 rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300">
                            Recurring
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                        <Clock size={11} />
                        {event.startTime} – {event.endTime}
                        {event.description && !isExpanded && (
                          <span className="ml-1 truncate text-gray-400 dark:text-gray-500">· {event.description}</span>
                        )}
                      </span>
                    </button>

                    <div className="flex shrink-0 items-center gap-0.5">
                      {onRecurEvent && (
                        <HeaderTooltip label="Repeat this event" fixed>
                          <button
                            type="button"
                            onClick={() => onRecurEvent(event)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-violet-50 hover:text-violet-600 dark:text-gray-500 dark:hover:bg-violet-900/20 dark:hover:text-violet-400"
                            aria-label={`Repeat ${event.title}`}
                          >
                            <Repeat size={13} />
                          </button>
                        </HeaderTooltip>
                      )}
                      {onDeleteEvent && (
                        <HeaderTooltip label="Delete event" fixed>
                          <button
                            type="button"
                            onClick={() => onDeleteEvent(event.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            aria-label={`Delete ${event.title}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </HeaderTooltip>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : event.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-[#2d2d2d] dark:hover:text-gray-300"
                        aria-label={isExpanded ? 'Hide details' : 'Show details'}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-2 space-y-2 border-t border-gray-100 pl-[3.25rem] pt-2 dark:border-[#2b2b2b]">
                      {event.description ? (
                        <p className="text-xs text-gray-600 dark:text-gray-300">{event.description}</p>
                      ) : (
                        <p className="text-xs text-gray-400 dark:text-gray-500">No description.</p>
                      )}
                      {event.notes && (
                        <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                          <span className="font-medium">Notes:</span> {event.notes}
                        </p>
                      )}
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        {format(new Date(event.date), 'EEEE, MMM d, yyyy')} · {event.startTime} – {event.endTime}
                        {event.completedAt && ` · completed ${format(new Date(event.completedAt), 'MMM d, HH:mm')}`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

export default PastEvents;

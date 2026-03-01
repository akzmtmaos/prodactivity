import React from 'react';
import { X, Calendar, Clock, Tag, FileText } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { ScheduleEvent } from '../../types/schedule';

interface DateEventsModalProps {
  isOpen: boolean;
  date: Date | null;
  events: ScheduleEvent[];
  onClose: () => void;
  onEventClick?: (event: ScheduleEvent) => void;
  onDelete?: (id: string) => void;
}

const DateEventsModal: React.FC<DateEventsModalProps> = ({
  isOpen,
  date,
  events,
  onClose,
  onEventClick,
  onDelete,
}) => {
  if (!isOpen || !date) return null;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'study': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'assignment': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'exam': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'meeting': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const isEventPast = (event: ScheduleEvent) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate < now;
  };

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => 
    a.startTime.localeCompare(b.startTime)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-2xl rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1e1e1e] shadow-xl text-left"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header – compact */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Events for {format(date, 'EEEE, MMM dd, yyyy')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {events.length} {events.length === 1 ? 'event' : 'events'} scheduled
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
            {sortedEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No events scheduled for this date.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedEvents.map((event) => {
                  const isPast = isEventPast(event);
                  return (
                    <div
                      key={event.id}
                      className={`rounded-lg border p-3 transition-colors ${
                        isPast
                          ? 'opacity-60 border-gray-200 dark:border-[#333333] bg-gray-50/50 dark:bg-[#252525]/50'
                          : 'border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {event.title}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${getCategoryColor(event.category)}`}>
                              {getCategoryLabel(event.category)}
                            </span>
                            {isPast && (
                              <span className="text-xs text-gray-500 dark:text-gray-400" title="Past event">
                                📅
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>{event.startTime} – {event.endTime}</span>
                          </div>
                          {!isSameDay(new Date(event.date), date) && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                {format(new Date(event.date), 'MMM dd, yyyy')}
                                {event.endDate && !isSameDay(new Date(event.date), new Date(event.endDate)) && (
                                  <> – {format(new Date(event.endDate), 'MMM dd, yyyy')}</>
                                )}
                              </span>
                            </div>
                          )}
                          {event.description && (
                            <div className="mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex items-start gap-2">
                                <FileText className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                                <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap line-clamp-2">
                                  {event.description}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          {onEventClick && (
                            <button
                              onClick={() => {
                                onEventClick(event);
                                onClose();
                              }}
                              className="h-7 px-3 text-xs font-medium rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                            >
                              View
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(event.id);
                              }}
                              className="h-7 px-3 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer – compact */}
          <div className="flex justify-end px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-[#333333] text-gray-700 dark:text-gray-300 bg-white dark:bg-[#252525] hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateEventsModal;


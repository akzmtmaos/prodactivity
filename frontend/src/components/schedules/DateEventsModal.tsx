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
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/60 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Events for {format(date, 'EEEE, MMMM dd, yyyy')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {events.length} {events.length === 1 ? 'event' : 'events'} scheduled
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {sortedEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No events scheduled for this date.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedEvents.map((event, index) => {
                  const isPast = isEventPast(event);
                  return (
                    <div
                      key={event.id}
                      className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                        isPast ? 'opacity-60 border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Title and Category */}
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {event.title}
                            </h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(event.category)}`}>
                              {getCategoryLabel(event.category)}
                            </span>
                            {isPast && (
                              <span className="text-xs text-gray-500 dark:text-gray-400" title="Past event">
                                📅
                              </span>
                            )}
                          </div>

                          {/* Time */}
                          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 mb-2">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">{event.startTime} - {event.endTime}</span>
                          </div>

                          {/* Date (if different from modal date) */}
                          {!isSameDay(new Date(event.date), date) && (
                            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 mb-2">
                              <Calendar className="h-4 w-4" />
                              <span className="text-sm">
                                {format(new Date(event.date), 'MMMM dd, yyyy')}
                                {event.endDate && !isSameDay(new Date(event.date), new Date(event.endDate)) && (
                                  <span> - {format(new Date(event.endDate), 'MMMM dd, yyyy')}</span>
                                )}
                              </span>
                            </div>
                          )}

                          {/* Description */}
                          {event.description && (
                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex items-start space-x-2">
                                <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                  {event.description}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 ml-4">
                          {onEventClick && (
                            <button
                              onClick={() => {
                                onEventClick(event);
                                onClose();
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors"
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
                              className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
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

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
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


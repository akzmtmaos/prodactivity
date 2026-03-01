import React from 'react';
import { X, Calendar, Clock, Tag, FileText } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { ScheduleEvent } from '../../types/schedule';

interface EventDetailsModalProps {
  isOpen: boolean;
  event: ScheduleEvent | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  isOpen,
  event,
  onClose,
  onDelete,
}) => {
  if (!isOpen || !event) return null;

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1e1e1e] shadow-xl text-left"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header – compact */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Event Details</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content – compact */}
          <div className="px-4 py-3 space-y-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {event.title}
            </h3>

            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${getCategoryColor(event.category)}`}>
                {getCategoryLabel(event.category)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>
                {format(new Date(event.date), 'EEEE, MMM dd, yyyy')}
                {event.endDate && !isSameDay(new Date(event.date), new Date(event.endDate)) && (
                  <> – {format(new Date(event.endDate), 'MMM dd, yyyy')}</>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{event.startTime} – {event.endTime}</span>
            </div>

            {event.description && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}
          </div>

          {/* Footer – compact buttons */}
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            {onDelete && (
              <button
                onClick={() => {
                  onDelete(event.id);
                  onClose();
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-md"
              >
                Delete Event
              </button>
            )}
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

export default EventDetailsModal;


import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { PastEvent } from '../../types/schedule';
import { Calendar, Clock, CheckCircle, Circle, FileText, Repeat, ChevronDown, ChevronUp } from 'lucide-react';

interface PastEventsProps {
  pastEvents: PastEvent[];
  onViewEvent: (event: PastEvent) => void;
  onMarkCompleted?: (eventId: string, completed: boolean) => void;
  onRecurEvent?: (event: PastEvent) => void;
  currentPage?: number;
  itemsPerPage?: number;
}

const PastEvents: React.FC<PastEventsProps> = ({ 
  pastEvents, 
  onViewEvent, 
  onMarkCompleted, 
  onRecurEvent,
  currentPage = 1,
  itemsPerPage = 8
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      study: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
      assignment: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
      exam: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
      meeting: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
      other: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    };
    return colors[category] || colors.other;
  };

  const getCompletionStatus = (event: PastEvent) => {
    if (event.completedAt) {
      return {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        text: 'Completed',
        color: 'text-green-600 dark:text-green-400',
      };
    } else {
      return {
        icon: <Circle className="h-4 w-4 text-gray-400" />,
        text: 'Pending',
        color: 'text-gray-500 dark:text-gray-400',
      };
    }
  };

  // Sort and paginate events
  const { sortedEvents, paginatedEvents } = useMemo(() => {
    const sorted = [...pastEvents].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = sorted.slice(startIndex, endIndex);
    
    return { sortedEvents: sorted, paginatedEvents: paginated };
  }, [pastEvents, currentPage, itemsPerPage]);

  if (pastEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No past events</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Past events will appear here once they're completed or archived.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {paginatedEvents.map((event) => {
        const status = getCompletionStatus(event);
        const isExpanded = expandedId === event.id;
        
        return (
          <div
            key={event.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 shadow-sm hover:shadow"
          >
            {/* Compact Card Header */}
            <div className="p-3">
              <div className="flex items-start justify-between gap-3">
                {/* Left side - Main content */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Title and Category Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {status.icon}
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {event.title}
                      </h3>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getCategoryColor(event.category)} whitespace-nowrap`}>
                      {event.category}
                    </span>
                    {event.wasRecurring && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700 whitespace-nowrap">
                        <Repeat className="h-3 w-3 mr-1" />
                        Recurring
                      </span>
                    )}
                  </div>

                  {/* Date, Time, and Status Row */}
                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{format(new Date(event.date), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{event.startTime} - {event.endTime}</span>
                    </div>
                    <span className={status.color}>{status.text}</span>
                  </div>

                  {/* Description - Collapsed by default */}
                  {event.description && !isExpanded && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1">
                      {event.description}
                    </p>
                  )}

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="pt-2 space-y-2 border-t border-gray-100 dark:border-gray-700">
                      {event.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {event.description}
                        </p>
                      )}
                      {event.notes && (
                        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded text-xs text-yellow-800 dark:text-yellow-200">
                          <strong>Notes:</strong> {event.notes}
                        </div>
                      )}
                      {event.completedAt && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Completed at: {format(new Date(event.completedAt), 'MMM dd, yyyy HH:mm')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right side - Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {onRecurEvent && (
                    <button
                      onClick={() => onRecurEvent(event)}
                      className="px-2 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 dark:text-purple-400 rounded-md transition-colors flex items-center gap-1"
                      title="Create a recurring event with same details"
                    >
                      <Repeat className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Recur</span>
                    </button>
                  )}
                  {onMarkCompleted && (
                    <button
                      onClick={() => onMarkCompleted(event.id, !event.completedAt)}
                      className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        event.completedAt
                          ? 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400'
                          : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 dark:text-green-400'
                      }`}
                      title={event.completedAt ? 'Mark as not completed' : 'Mark as completed'}
                    >
                      {event.completedAt ? 'Undo' : 'Complete'}
                    </button>
                  )}
                  <button
                    onClick={() => onViewEvent(event)}
                    className="px-2 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 dark:text-indigo-400 rounded-md transition-colors"
                  >
                    View
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : event.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PastEvents;

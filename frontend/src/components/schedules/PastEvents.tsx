import React, { useState } from 'react';
import { format } from 'date-fns';
import { PastEvent } from '../../types/schedule';
import { Calendar, Clock, CheckCircle, Circle, FileText, Repeat } from 'lucide-react';

interface PastEventsProps {
  pastEvents: PastEvent[];
  onViewEvent: (event: PastEvent) => void;
}

const PastEvents: React.FC<PastEventsProps> = ({ pastEvents, onViewEvent }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      study: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      assignment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      exam: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      meeting: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return colors[category] || colors.other;
  };

  const getCompletionStatus = (event: PastEvent) => {
    if (event.completedAt) {
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        text: 'Completed',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20'
      };
    } else {
      return {
        icon: <Circle className="h-5 w-5 text-gray-400" />,
        text: 'Not completed',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-50 dark:bg-gray-900/20'
      };
    }
  };

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

  // Sort events by date (most recent first)
  const sortedEvents = [...pastEvents].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-4">
      {sortedEvents.map((event) => {
        const status = getCompletionStatus(event);
        return (
          <div
            key={event.id}
            className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow ${status.bgColor}`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      {status.icon}
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                        {event.title}
                      </h3>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(event.category)}`}>
                      {event.category}
                    </span>
                    {event.wasRecurring && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        <Repeat className="h-3 w-3 mr-1" />
                        Recurring
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(event.date), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{event.startTime} - {event.endTime}</span>
                    </div>
                    <span className={status.color}>{status.text}</span>
                  </div>

                  {event.description && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  {event.notes && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Notes:</strong> {event.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => onViewEvent(event)}
                    className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-md transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>

              {expandedId === event.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Date:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {format(new Date(event.date), 'EEEE, MMMM dd, yyyy')}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Time:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {event.startTime} - {event.endTime}
                      </span>
                    </div>
                    {event.completedAt && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Completed at:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {format(new Date(event.completedAt), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                    )}
                    {event.wasRecurring && event.originalRecurringId && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Original Schedule:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          ID: {event.originalRecurringId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                className="mt-3 text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
              >
                {expandedId === event.id ? 'Show less' : 'Show more'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PastEvents;

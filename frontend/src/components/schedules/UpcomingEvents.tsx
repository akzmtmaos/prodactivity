import React from 'react';
import { format } from 'date-fns';
import { ScheduleEvent } from '../../types/schedule';

interface UpcomingEventsProps {
  events: ScheduleEvent[];
  onDeleteEvent: (id: string) => void;
}

const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ events, onDeleteEvent }) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'study': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'assignment': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'exam': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'meeting': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const upcomingEvents = events
    .filter(event => new Date(event.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Upcoming Events
        </h2>
      </div>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {upcomingEvents.length > 0 ? (
          upcomingEvents.map((event, index) => (
            <div key={index} className="px-6 py-4 flex justify-between items-center">
              <div className="flex items-start space-x-4">
                <div className={`w-3 h-3 rounded-full mt-1.5 ${getCategoryColor(event.category).replace('bg-', 'bg-').replace('text-', '')}`}></div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{event.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {format(new Date(event.date), 'MMM d, yyyy')} • {event.startTime} - {event.endTime}
                  </p>
                  {event.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => onDeleteEvent(event.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          ))
        ) : (
          <div className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
            No upcoming events. Click "Add Event" to create one.
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingEvents; 
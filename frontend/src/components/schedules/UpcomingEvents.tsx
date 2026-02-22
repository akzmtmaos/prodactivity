import React, { useState } from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { ScheduleEvent } from '../../types/schedule';
import EventDetailsModal from './EventDetailsModal';

interface UpcomingEventsProps {
  events: ScheduleEvent[];
  onDeleteEvent: (id: string) => void;
  onEventClick?: (event: ScheduleEvent) => void;
}

const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ events, onDeleteEvent, onEventClick }) => {
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const getCategoryDot = (category: string) => {
    switch (category) {
      case 'study': return 'bg-blue-500';
      case 'assignment': return 'bg-green-500';
      case 'exam': return 'bg-red-500';
      case 'meeting': return 'bg-purple-500';
      default: return 'bg-gray-400';
    }
  };

  const upcomingEvents = events
    .filter(event => new Date(event.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (upcomingEvents.length === 0) {
    return (
      <>
        <div className="text-center py-10">
          <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming events.</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Click &quot;Add Event&quot; to create one.</p>
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
      <div className="space-y-1.5">
        {upcomingEvents.map((event) => (
          <div
            key={event.id}
            onClick={() => {
              setSelectedEvent(event);
              onEventClick?.(event);
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1e1e1e] hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer transition-colors min-h-[52px]"
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getCategoryDot(event.category)}`} />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">{event.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {format(new Date(event.date), 'MMM d, yyyy')} · {event.startTime} – {event.endTime}
              </p>
              {event.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{event.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteEvent(event.id);
              }}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
              title="Delete event"
              aria-label="Delete event"
            >
              <Trash2 size={14} />
            </button>
          </div>
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
import React, { useEffect, useState } from 'react';
import { isValid } from 'date-fns';
import PageLayout from '../components/PageLayout';
import Calendar from '../components/schedules/Calendar';
import UpcomingEvents from '../components/schedules/UpcomingEvents';
import AddEventModal from '../components/schedules/AddEventModal';
import { ScheduleEvent } from '../types/schedule';

const Schedule = () => {
  const [user, setUser] = useState<any | null>(null);
  const [greeting, setGreeting] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser && parsedUser.username) {
          setUser(parsedUser);
        } else {
          setUser({ username: 'User' });
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
        setUser({ username: 'User' });
      }
    } else {
      setUser({ username: 'User' });
    }

    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
    
    // Load events from localStorage
    loadEvents();
  }, []);

  const loadEvents = () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        setEvents([]);
        return;
      }

      const { username } = JSON.parse(userData);
      const savedEvents = localStorage.getItem(`scheduleEvents_${username}`);
      if (savedEvents) {
        const parsedEvents = JSON.parse(savedEvents).map((event: any) => {
          const date = new Date(event.date);
          if (!isValid(date)) {
            throw new Error('Invalid date found in saved events');
          }
          return {
            ...event,
            date
          };
        });
        setEvents(parsedEvents);
        setError(null);
      } else {
        setEvents([]);
      }
    } catch (e) {
      console.error('Error loading events:', e);
      setError('Failed to load events. Some data may be corrupted.');
      setEvents([]);
    }
  };

  const saveEvents = (updatedEvents: ScheduleEvent[]) => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        setError('User data not found. Please log in again.');
        return;
      }

      const { username } = JSON.parse(userData);
      localStorage.setItem(`scheduleEvents_${username}`, JSON.stringify(updatedEvents));
      setEvents(updatedEvents);
      setError(null);
    } catch (e) {
      console.error('Error saving events:', e);
      setError('Failed to save events. Please try again.');
    }
  };

  const handleAddEvent = (eventData: Omit<ScheduleEvent, 'id'>) => {
    try {
      const eventToAdd: ScheduleEvent = {
        id: Date.now().toString(),
        ...eventData
      };

      const updatedEvents = [...events, eventToAdd];
      saveEvents(updatedEvents);
    } catch (e) {
      console.error('Error adding event:', e);
      setError('Failed to add event. Please try again.');
    }
  };

  const deleteEvent = (id: string) => {
    try {
      const updatedEvents = events.filter(event => event.id !== id);
      saveEvents(updatedEvents);
    } catch (e) {
      console.error('Error deleting event:', e);
      setError('Failed to delete event. Please try again.');
    }
  };

  // Show loading state while waiting for user data
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="flex flex-col h-full">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Schedule
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              {greeting}, {user.username}. Here's your upcoming schedule.
            </p>
          </div>
          <button
            onClick={() => setShowAddEvent(true)}
            className="mt-4 md:mt-0 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            Add Event
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:text-red-200 dark:border-red-700 px-4 py-3 rounded relative mt-4 mx-4" role="alert">
            <span className="block sm:inline">{error}</span>
            <button
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setError(null)}
            >
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <title>Close</title>
                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
              </svg>
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`${
                activeTab === 'calendar'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Calendar
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`${
                activeTab === 'upcoming'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Upcoming Events
            </button>
          </nav>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'calendar' && (
            <Calendar
              currentDate={currentDate}
              events={events}
              onDateChange={setCurrentDate}
              onDeleteEvent={deleteEvent}
            />
          )}
          {activeTab === 'upcoming' && (
            <UpcomingEvents
              events={events}
              onDeleteEvent={deleteEvent}
            />
          )}
        </div>

        {/* Add Event Modal */}
        <AddEventModal
          isOpen={showAddEvent}
          onClose={() => setShowAddEvent(false)}
          onAddEvent={handleAddEvent}
        />
      </div>
    </PageLayout>
  );
};

export default Schedule;
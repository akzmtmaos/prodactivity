import React, { useEffect, useState } from 'react';
import { isValid } from 'date-fns';
import PageLayout from '../components/PageLayout';
import HelpButton from '../components/HelpButton';
import Calendar from '../components/schedules/Calendar';
import UpcomingEvents from '../components/schedules/UpcomingEvents';
import PastEvents from '../components/schedules/PastEvents';
import AddEventModal from '../components/schedules/AddEventModal';
import { ScheduleEvent, PastEvent } from '../types/schedule';
import { supabase } from '../lib/supabase';

const Schedule = () => {
  const [user, setUser] = useState<any | null>(null);
  const [greeting, setGreeting] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [recurringEvent, setRecurringEvent] = useState<PastEvent | null>(null);
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
    
    // Load all data from localStorage
    loadAllData();
    
    // Check for past events every time the component mounts
    checkAndMovePastEvents();
  }, []);
  
  // Also check for past events when events change
  useEffect(() => {
    checkAndMovePastEvents();
  }, [events]);

  const loadAllData = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        setEvents([]);
        setPastEvents([]);
        return;
      }

      const user = JSON.parse(userData);
      const userId = user.id;

      if (!userId) {
        console.error('No user ID found');
        setEvents([]);
        setPastEvents([]);
        return;
      }

      console.log('📅 Fetching events from Supabase for user:', userId);

      // Fetch all events from Supabase
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: true });

      if (eventsError) {
        console.error('Error fetching events from Supabase:', eventsError);
        setError('Failed to load events from database.');
        setEvents([]);
        setPastEvents([]);
        return;
      }

      console.log('✅ Fetched events:', eventsData);

      // Split into upcoming and past events
      const now = new Date();
      const upcoming: ScheduleEvent[] = [];
      const past: PastEvent[] = [];

      eventsData?.forEach((event: any) => {
        const eventDate = new Date(event.start_time);
        const endDate = new Date(event.end_time);
        
        if (endDate < now) {
          // Past event
          past.push({
            id: event.id.toString(),
            title: event.title,
            description: event.description || '',
            date: eventDate,
            endDate: endDate,
            startTime: eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            endTime: endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            category: '' // Can be added to the table later if needed
          });
        } else {
          // Upcoming event
          upcoming.push({
            id: event.id.toString(),
            title: event.title,
            description: event.description || '',
            date: eventDate,
            endDate: endDate,
            startTime: eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            endTime: endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            category: '' // Can be added to the table later if needed
          });
        }
      });

      setEvents(upcoming);
      setPastEvents(past);
      setError(null);
    } catch (e) {
      console.error('Error loading data:', e);
      setError('Failed to load data. Please try again.');
      setEvents([]);
      setPastEvents([]);
    }
  };

  const handleAddEvent = async (eventData: Omit<ScheduleEvent, 'id'>) => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        setError('User not authenticated');
        return;
      }

      const user = JSON.parse(userData);
      const userId = user.id;

      // Parse startTime string to get hours and minutes
      const [hours, minutes] = eventData.startTime.split(':').map(Number);
      const startDate = new Date(eventData.date);
      startDate.setHours(hours, minutes, 0, 0);

      // Parse endTime to calculate end date
      const [endHours, endMinutes] = eventData.endTime.split(':').map(Number);
      const endDate = new Date(eventData.endDate || eventData.date);
      endDate.setHours(endHours, endMinutes, 0, 0);

      // Insert into Supabase
      const { data, error } = await supabase
        .from('events')
        .insert([{
          user_id: userId,
          title: eventData.title,
          description: eventData.description,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding event to Supabase:', error);
        setError('Failed to add event. Please try again.');
        return;
      }

      console.log('✅ Event added to Supabase:', data);
      
      // Reload data to refresh the list
      await loadAllData();
    } catch (e) {
      console.error('Error adding event:', e);
      setError('Failed to add event. Please try again.');
    }
  };

  const handleRecurEvent = (pastEvent: PastEvent) => {
    // Pre-fill the form with the past event's data
    setRecurringEvent(pastEvent);
    setShowAddEvent(true);
  };

  const deleteEvent = async (id: string) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting event from Supabase:', error);
        setError('Failed to delete event. Please try again.');
        return;
      }

      console.log('✅ Event deleted from Supabase');
      
      // Reload data to refresh the list
      await loadAllData();
    } catch (e) {
      console.error('Error deleting event:', e);
      setError('Failed to delete event. Please try again.');
    }
  };


  const handleViewPastEvent = (event: PastEvent) => {
    // For now, just log the event. You could open a modal with more details
    console.log('Viewing past event:', event);
  };
  
  const handleMarkPastEventCompleted = async (eventId: string, completed: boolean) => {
    // Note: Completion status for events is not yet implemented in Supabase
    // This would require adding a 'completed' field to the events table
    console.log('Mark as completed clicked for event:', eventId, completed);
    // TODO: Implement when completed field is added to events table
  };

  // No longer needed - Supabase query automatically separates past and upcoming events
  const checkAndMovePastEvents = () => {
    // This is now handled automatically in loadAllData()
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
      <div className="flex h-full">
        <div className="flex-1 space-y-6">
          {/* Header section */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                Schedule
                <HelpButton 
                  content={
                    <div>
                      <p className="font-semibold mb-2">Schedule Management</p>
                      <ul className="space-y-1 text-xs">
                        <li>• <strong>Add Events:</strong> Create one-time events with details</li>
                        <li>• <strong>Calendar View:</strong> Visual monthly calendar display</li>
                        <li>• <strong>Upcoming Events:</strong> See what's coming next</li>
                        <li>• <strong>Past Events:</strong> Review completed activities</li>
                        <li>• <strong>Recur Events:</strong> Quickly recreate past events using the "Recur" button</li>
                        <li>• <strong>Event Details:</strong> Add time, category, and descriptions</li>
                        <li>• <strong>Delete:</strong> Remove events as needed</li>
                      </ul>
                    </div>
                  } 
                  title="Schedule Help" 
                />
              </h1>
              <p className="mt-1 text-lg text-gray-600 dark:text-gray-400">
                Here's your upcoming schedule.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setRecurringEvent(null);
                  setShowAddEvent(true);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
              >
                Add Event
              </button>
            </div>
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

          {/* Tabs styled like Settings */}
          <div>
            <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-8">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                  activeTab === 'calendar'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                  activeTab === 'upcoming'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                Upcoming Events
              </button>
              <button
                onClick={() => setActiveTab('past')}
                className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                  activeTab === 'past'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                Past Events
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-auto">
              {/* Tab content */}
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
              {activeTab === 'past' && (
                <PastEvents
                  pastEvents={pastEvents}
                  onViewEvent={handleViewPastEvent}
                  onMarkCompleted={handleMarkPastEventCompleted}
                  onRecurEvent={handleRecurEvent}
                />
              )}
            </div>
          </div>

          {/* Add Event Modal */}
          <AddEventModal
            isOpen={showAddEvent}
            onClose={() => {
              setShowAddEvent(false);
              setRecurringEvent(null);
            }}
            onAddEvent={handleAddEvent}
            recurringEvent={recurringEvent}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default Schedule;
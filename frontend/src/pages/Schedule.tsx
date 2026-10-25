import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CalendarRange, Clock, Plus } from 'lucide-react';
import {
  endOfWeek,
  format,
  isSameDay,
  isToday,
  isTomorrow,
  startOfWeek,
} from 'date-fns';
import PageLayout from '../components/PageLayout';
import Calendar from '../components/schedules/Calendar';
import UpcomingEvents from '../components/schedules/UpcomingEvents';
import PastEvents from '../components/schedules/PastEvents';
import AddEventModal from '../components/schedules/AddEventModal';
import DeleteConfirmationModal from '../components/common/DeleteConfirmationModal';
import Toast from '../components/common/Toast';
import Pagination from '../components/common/Pagination';
import { ScheduleEvent, PastEvent } from '../types/schedule';
import { supabase } from '../lib/supabase';
import { scheduleNotificationService } from '../services/scheduleNotificationService';

const TABS = [
  { key: 'calendar', label: 'Calendar' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const relativeDay = (date: Date) => {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
};

const Schedule = () => {
  const [user, setUser] = useState<any | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [recurringEvent, setRecurringEvent] = useState<PastEvent | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('calendar');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const notificationCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedNotificationCheck = useRef(false);

  // Pagination state for Past Events
  const [pastEventsCurrentPage, setPastEventsCurrentPage] = useState(1);
  const [pastEventsPerPage] = useState(8);

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    eventId: string | null;
    eventTitle: string;
  }>({
    isOpen: false,
    eventId: null,
    eventTitle: '',
  });

  useEffect(() => {
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

    loadAllData();

    if (!hasStartedNotificationCheck.current) {
      hasStartedNotificationCheck.current = true;
      notificationCheckIntervalRef.current = scheduleNotificationService.startPeriodicCheck();
    }

    return () => {
      if (notificationCheckIntervalRef.current) {
        scheduleNotificationService.stopPeriodicCheck(notificationCheckIntervalRef.current);
        notificationCheckIntervalRef.current = null;
        hasStartedNotificationCheck.current = false;
      }
    };
  }, []);

  // Reset pagination when past events change or tab switches
  useEffect(() => {
    setPastEventsCurrentPage(1);
  }, [pastEvents, activeTab]);

  const loadAllData = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        setEvents([]);
        setPastEvents([]);
        setIsLoading(false);
        return;
      }

      const parsedUser = JSON.parse(userData);
      const userId = parsedUser.id;

      if (!userId) {
        setEvents([]);
        setPastEvents([]);
        setIsLoading(false);
        return;
      }

      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: true });

      if (eventsError) {
        console.error('Error fetching events from Supabase:', eventsError);
        setToast({ message: 'Failed to load events from database.', type: 'error' });
        setEvents([]);
        setPastEvents([]);
        setIsLoading(false);
        return;
      }

      const now = new Date();
      const upcoming: ScheduleEvent[] = [];
      const past: PastEvent[] = [];

      eventsData?.forEach((event: any) => {
        const eventDate = new Date(event.start_time);
        const endDate = new Date(event.end_time);
        const startTime = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const endTime = endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const normalized = {
          id: String(event.id),
          title: event.title,
          description: event.description || '',
          date: eventDate,
          endDate,
          startTime,
          endTime,
          category: event.category || 'study',
        };

        if (endDate < now) {
          past.push(normalized);
        } else {
          upcoming.push(normalized);
        }
      });

      setEvents(upcoming);
      setPastEvents(past);
    } catch (e) {
      console.error('Error loading data:', e);
      setToast({ message: 'Failed to load data. Please try again.', type: 'error' });
      setEvents([]);
      setPastEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEvent = async (eventData: Omit<ScheduleEvent, 'id'>) => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        setToast({ message: 'User not authenticated', type: 'error' });
        return;
      }

      const parsedUser = JSON.parse(userData);
      const userId = parsedUser.id;

      const [hours, minutes] = eventData.startTime.split(':').map(Number);
      const startDate = new Date(eventData.date);
      startDate.setHours(hours, minutes, 0, 0);

      const [endHours, endMinutes] = eventData.endTime.split(':').map(Number);
      const endDate = new Date(eventData.endDate || eventData.date);
      endDate.setHours(endHours, endMinutes, 0, 0);

      const { error } = await supabase
        .from('events')
        .insert([
          {
            user_id: userId,
            title: eventData.title,
            description: eventData.description,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            category: eventData.category,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error adding event to Supabase:', error);
        setToast({ message: 'Failed to add event. Please try again.', type: 'error' });
        return;
      }

      setToast({ message: 'Event created successfully!', type: 'success' });
      setCurrentDate(startDate);
      await loadAllData();
      await scheduleNotificationService.checkUpcomingEvents();
    } catch (e) {
      console.error('Error adding event:', e);
      setToast({ message: 'Failed to add event. Please try again.', type: 'error' });
    }
  };

  const handleRecurEvent = (pastEvent: PastEvent) => {
    setRecurringEvent(pastEvent);
    setShowAddEvent(true);
  };

  const handleDeleteClick = (id: string) => {
    const event = events.find((entry) => entry.id === id) || pastEvents.find((entry) => entry.id === id);
    if (event) {
      setDeleteModal({ isOpen: true, eventId: id, eventTitle: event.title });
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.eventId) return;

    try {
      const { error } = await supabase.from('events').delete().eq('id', deleteModal.eventId);

      if (error) {
        console.error('Error deleting event from Supabase:', error);
        setToast({ message: 'Failed to delete event. Please try again.', type: 'error' });
        setDeleteModal({ isOpen: false, eventId: null, eventTitle: '' });
        return;
      }

      setToast({ message: 'Event deleted successfully!', type: 'success' });
      await loadAllData();
    } catch (e) {
      console.error('Error deleting event:', e);
      setToast({ message: 'Failed to delete event. Please try again.', type: 'error' });
    } finally {
      setDeleteModal({ isOpen: false, eventId: null, eventTitle: '' });
    }
  };

  const allEvents = useMemo(() => [...events, ...pastEvents], [events, pastEvents]);

  const todayCount = useMemo(
    () => allEvents.filter((event) => isSameDay(new Date(event.date), new Date())).length,
    [allEvents]
  );

  const weekCount = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
    return allEvents.filter((event) => {
      const date = new Date(event.date);
      return date >= weekStart && date <= weekEnd;
    }).length;
  }, [allEvents]);

  const nextEvent = events.length > 0
    ? [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
    : null;

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="flex min-h-0 flex-col">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Schedule</h1>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Plan study blocks, deadlines and meetings — they stay on the calendar and in Upcoming.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setRecurringEvent(null);
              setShowAddEvent(true);
            }}
            className="inline-flex h-7 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500"
          >
            <Plus size={14} />
            Add event
          </button>
        </div>

        {/* Summary strip */}
        <div className="mb-4 grid grid-cols-1 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-[#2f2f2f] dark:bg-[#1e1e1e] sm:grid-cols-3">
          <div className="flex items-center gap-2 px-3.5 py-2.5">
            <CalendarDays size={14} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
            <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{todayCount}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {todayCount === 1 ? 'event today' : 'events today'}
            </span>
          </div>
          <div className="flex items-center gap-2 border-t border-gray-200 px-3.5 py-2.5 dark:border-[#2f2f2f] sm:border-l sm:border-t-0">
            <CalendarRange size={14} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
            <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{weekCount}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">this week</span>
          </div>
          <div className="flex min-w-0 items-center gap-2 border-t border-gray-200 px-3.5 py-2.5 dark:border-[#2f2f2f] sm:border-l sm:border-t-0">
            <Clock size={14} className="flex-shrink-0 text-indigo-500 dark:text-indigo-400" />
            {nextEvent ? (
              <>
                <span className="min-w-0 truncate text-xs font-medium text-gray-900 dark:text-white">
                  {nextEvent.title}
                </span>
                <span className="flex-shrink-0 text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                  {relativeDay(new Date(nextEvent.date))} · {nextEvent.startTime}
                </span>
              </>
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400">Nothing scheduled</span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-[#2f2f2f]">
          <div className="flex items-center gap-0.5" role="tablist" aria-label="Schedule views">
            {TABS.map((tab) => {
              const count = tab.key === 'upcoming' ? events.length : tab.key === 'past' ? pastEvents.length : null;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                    activeTab === tab.key
                      ? 'bg-gray-100 text-gray-900 dark:bg-[#2b2b2b] dark:text-white'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#242424] dark:hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                  {count !== null && (
                    <span
                      className={`text-[11px] tabular-nums ${
                        activeTab === tab.key
                          ? 'text-gray-500 dark:text-gray-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <span className="hidden pb-1.5 text-[11px] tabular-nums text-gray-400 dark:text-gray-500 sm:inline">
            {format(currentDate, 'MMMM yyyy')}
          </span>
        </div>

        <div className="min-h-0 flex-1">
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((row) => (
                <div
                  key={row}
                  className="h-12 animate-pulse rounded-lg border border-gray-200 bg-gray-50 dark:border-[#2f2f2f] dark:bg-[#242424]"
                />
              ))}
            </div>
          ) : (
            <>
              {activeTab === 'calendar' && (
                <Calendar
                  currentDate={currentDate}
                  events={allEvents}
                  onDateChange={setCurrentDate}
                  onDeleteEvent={handleDeleteClick}
                />
              )}
              {activeTab === 'upcoming' && (
                <UpcomingEvents
                  events={events}
                  onDeleteEvent={handleDeleteClick}
                  onCreate={() => {
                    setRecurringEvent(null);
                    setShowAddEvent(true);
                  }}
                />
              )}
              {activeTab === 'past' && (
                <>
                  <PastEvents
                    pastEvents={pastEvents}
                    onRecurEvent={handleRecurEvent}
                    onDeleteEvent={handleDeleteClick}
                    currentPage={pastEventsCurrentPage}
                    itemsPerPage={pastEventsPerPage}
                  />
                  {pastEvents.length > pastEventsPerPage && (
                    <div className="mt-4">
                      <Pagination
                        currentPage={pastEventsCurrentPage}
                        totalPages={Math.ceil(pastEvents.length / pastEventsPerPage)}
                        onPageChange={setPastEventsCurrentPage}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <AddEventModal
          isOpen={showAddEvent}
          onClose={() => {
            setShowAddEvent(false);
            setRecurringEvent(null);
          }}
          onAddEvent={handleAddEvent}
          recurringEvent={recurringEvent}
        />

        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, eventId: null, eventTitle: '' })}
          onConfirm={confirmDelete}
          title="Delete Event"
          message={`Are you sure you want to delete "${deleteModal.eventTitle}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
        />

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </PageLayout>
  );
};

export default Schedule;

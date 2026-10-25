// Home dashboard with theme-aware cards and compact, scrollable activity lists.
import React, { useEffect, useState, useRef } from 'react';
import {
  Clock, Calendar, BookOpen, FileText, CheckSquare, Inbox, Archive,
  ArrowUpRight, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { Task } from '../types/task';
import { ScheduleEvent } from '../types/schedule';
import { supabase } from '../lib/supabase';
import axiosInstance from '../utils/axiosConfig';

interface User {
  username: string;
  email?: string;
  id?: number;
  [key: string]: any;
}

interface Note {
  id: number;
  title: string;
  content: string;
  notebook: number;
  notebook_name: string;
  created_at: string;
  updated_at: string;
  last_visited?: string;
  is_deleted: boolean;
  is_archived?: boolean;
  archived_at?: string | null;
}

const formatCompact = (date: Date | string) => format(new Date(date), 'MMM d, yyyy');
const SCROLLBAR_CLASSES = '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:bg-[#2a2a2a] dark:hover:[&::-webkit-scrollbar-thumb]:bg-[#3a3a3a] [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-white dark:[&::-webkit-scrollbar-thumb]:border-[#161616]';

const Heading: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h2 className={`text-sm font-semibold text-gray-900 dark:text-[#f2f2f2] flex items-center gap-2 ${className}`}>
    {children}
  </h2>
);

const RecentActivitiesList: React.FC<{ notes: any[]; onOpenNote: (id: number) => void }> = ({ notes, onOpenNote }) => {
  return (
    <div className={`w-full min-h-0 flex-1 overflow-y-auto ${SCROLLBAR_CLASSES}`}>
      {notes.length === 0 ? (
        <div className="p-6 text-center">
          <Inbox size={24} className="mx-auto mb-2 text-gray-400 dark:text-[#6b7280]" />
          <p className="text-sm text-gray-600 dark:text-[#9ca3af]">No recent notes yet</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-[#6b7280]">Your recent activity will appear here</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
          {notes.slice(0, 15).map((note: any) => (
            <div
              key={note.id}
              className="group flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-[#242424] sm:px-4"
              onClick={() => onOpenNote(note.id)}
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-[#2a2a2a]">
                <FileText size={16} className="text-gray-500 dark:text-[#9ca3af]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-sm font-medium text-gray-900 dark:text-[#f2f2f2]">{note.title || 'Untitled'}</h4>
                  {note.is_archived && <Archive size={11} className="flex-shrink-0 text-gray-400 dark:text-[#6b7280]" />}
                </div>
                {note.notebook_name && <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-[#6b7280]">{note.notebook_name}</p>}
                <p className="mt-0.5 text-xs text-gray-600 dark:text-[#9ca3af]">{formatCompact(note.updated_at)}</p>
              </div>
              <div className="flex-shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-[#6b7280]">
                <ChevronRight size={16} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Home: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(true);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [notesCount, setNotesCount] = useState<number>(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auth check
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    const userData = localStorage.getItem('user');
    if (userData && userData !== 'undefined') {
      try {
        const parsed = JSON.parse(userData);
        if (parsed && typeof parsed === 'object') {
          if (parsed.username) { setUser(parsed); setLoading(false); return; }
          if (parsed.user && parsed.user.username) { setUser(parsed.user); setLoading(false); return; }
        }
        console.error('Home: User data missing required fields');
      } catch (e) {
        console.error('Home: Error parsing user data:', e);
      }
    } else {
      console.log('Home: No user data found');
    }
  }, []);

  // Debounced refresh
  const debouncedRefresh = () => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = setTimeout(() => {
      if (user && !loading) {
        fetchRecentNotes();
        fetchTasks();
        fetchCompletedTasksCount();
        loadEvents();
        fetchNotesCount();
      }
    }, 800);
  };

  // Data fetching
  const fetchRecentNotes = async () => {
    try {
      const response = await axiosInstance.get(`/notes/`);
      const notesData = response.data.results || response.data;
      if (!Array.isArray(notesData)) return;
      const sortedNotes = notesData
        .filter((note: Note) => !note.is_deleted)
        .sort((a: Note, b: Note) => {
          const dateA = Math.max(new Date(a.updated_at).getTime(), a.last_visited ? new Date(a.last_visited).getTime() : 0);
          const dateB = Math.max(new Date(b.updated_at).getTime(), b.last_visited ? new Date(b.last_visited).getTime() : 0);
          return dateB - dateA;
        })
        .slice(0, 15);
      setRecentNotes(sortedNotes);
    } catch (error) {
      console.error('Failed to fetch recent notes:', error);
    }
  };

  const fetchTasks = async () => {
    setTasksLoading(true);
    try {
      const userData = localStorage.getItem('user');
      if (!userData) { setTasks([]); return; }
      const user = JSON.parse(userData);
      const userId = user.id || 11;
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', false)
        .eq('is_deleted', false)
        .order('due_date', { ascending: true });
      if (error) return;
      const mappedTasks = (data || []).map((task: any) => ({ ...task, dueDate: task.due_date }));
      setTasks(mappedTasks.slice(0, 5));
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchCompletedTasksCount = async () => {
    try {
      const response = await axiosInstance.get(`/tasks/?completed=true`);
      const tasksData = response.data.results || response.data;
      setNotesCount(tasksData.length);
    } catch (err) {
      console.error('Error fetching completed tasks:', err);
      setNotesCount(0);
    }
  };

  const loadEvents = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) { setEvents([]); return; }
      const user = JSON.parse(userData);
      const userId = user.id;
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(5);
      if (error) return;
      const mappedEvents = (data || []).map((event: any) => ({
        id: event.id, title: event.title, description: event.description || '',
        date: new Date(event.start_time), startTime: format(new Date(event.start_time), 'h:mm a'),
        endTime: format(new Date(event.end_time), 'h:mm a'), category: event.category || 'other',
        endDate: event.end_time ? new Date(event.end_time) : undefined,
      }));
      setEvents(mappedEvents);
    } catch (e) {
      console.error('Error fetching events:', e);
    }
  };

  const fetchNotesCount = async () => {
    try {
      const response = await axiosInstance.get(`/notes/`);
      if (response.data && typeof response.data.count === 'number') setNotesCount(response.data.count);
      else if (Array.isArray(response.data)) setNotesCount(response.data.length);
      else if (response.data && Array.isArray(response.data.results)) setNotesCount(response.data.results.length);
    } catch (err) {
      setNotesCount(0);
    }
  };

  // Auto-refresh
  useEffect(() => {
    fetchRecentNotes();
    fetchTasks();
    fetchCompletedTasksCount();
    loadEvents();
    fetchNotesCount();
    const interval = setInterval(() => {
      if (user && !loading) {
        fetchRecentNotes();
        fetchTasks();
        fetchCompletedTasksCount();
        loadEvents();
        fetchNotesCount();
      }
    }, 120000);
    window.addEventListener('noteUpdated', debouncedRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('noteUpdated', debouncedRefresh);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, []);

  const handleOpenNote = async (noteId: number) => {
    try {
      await axiosInstance.patch(`/notes/${noteId}/`, { last_visited: new Date().toISOString() });
    } catch (error) {
      console.error('Failed to update note visit timestamp:', error);
    }
    localStorage.setItem('openNoteId', noteId.toString());
    navigate('/notebooks');
    window.dispatchEvent(new Event('noteUpdated'));
    fetchRecentNotes();
  };

  // Clean up unused task state references
  // (tasks state was removed; this prevents dangling references)

  // Today's study time
  const [todaysStudyTime, setTodaysStudyTime] = useState(0);
  useEffect(() => {
    const fetchTodaysStudyTime = async () => {
      try {
        const userData = localStorage.getItem('user');
        if (!userData) { setTodaysStudyTime(0); return; }
        const { data: { user: supabaseAuthUser } } = await supabase.auth.getUser();
        const supabaseUserId = supabaseAuthUser?.id;
        if (!supabaseUserId) {
          const response = await axiosInstance.get('/tasks/study-timer-sessions/');
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayEnd = new Date(today);
          todayEnd.setHours(23, 59, 59, 999);
          const todaySessions = (response.data || []).filter((s: any) => {
            if (s.session_type !== 'Study') return false;
            const startTime = new Date(s.start_time);
            return startTime >= today && startTime <= todayEnd;
          });
          const totalSeconds = todaySessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
          setTodaysStudyTime(Math.round(totalSeconds / 60));
          return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        const { data: sessions, error } = await supabase
          .from('study_timer_sessions')
          .select('duration, session_type, start_time')
          .eq('user_id', supabaseUserId)
          .eq('session_type', 'Study')
          .gte('start_time', today.toISOString())
          .lte('start_time', todayEnd.toISOString());
        if (error) {
          const response = await axiosInstance.get('/tasks/study-timer-sessions/');
          const todaySessions = (response.data || []).filter((s: any) => {
            if (s.session_type !== 'Study') return false;
            const startTime = new Date(s.start_time);
            return startTime >= today && startTime <= todayEnd;
          });
          const totalSeconds = todaySessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
          setTodaysStudyTime(Math.round(totalSeconds / 60));
          return;
        }
        const totalSeconds = (sessions || []).reduce((sum, s) => sum + (s.duration || 0), 0);
        setTodaysStudyTime(Math.round(totalSeconds / 60));
      } catch (e) {
        console.error('Error calculating study time:', e);
        setTodaysStudyTime(0);
      }
    };
    fetchTodaysStudyTime();
    const interval = setInterval(fetchTodaysStudyTime, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-6 text-gray-600 shadow-sm dark:border-[#2a2a2a] dark:bg-[#1c1c1c] dark:text-[#9ca3af]">
          Unable to load user data. Please try logging in again.
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Today's Study", icon: Clock, value: todaysStudyTime >= 60 ? `${Math.floor(todaysStudyTime / 60)}h ${todaysStudyTime % 60}m` : `${todaysStudyTime}m`, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300', onClick: () => navigate('/study-timer') },
    { label: 'Tasks', icon: CheckSquare, value: tasks.length, color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300', onClick: () => navigate('/tasks') },
    { label: 'Notes', icon: FileText, value: notesCount, color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300', onClick: () => navigate('/notebooks') },
    { label: 'Upcoming Events', icon: Calendar, value: events.length, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', onClick: () => navigate('/schedule') },
  ];

  return (
    <PageLayout>
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden bg-gray-50 pointer-events-none dark:bg-[#0e0e0e]">
          <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-indigo-100 opacity-60 blur-3xl dark:bg-indigo-500/10" />
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-slate-200/70 opacity-70 blur-3xl dark:bg-slate-800/30" />
          <div className="absolute right-10 top-20 h-64 w-64 rounded-full bg-indigo-100/80 opacity-50 blur-3xl dark:bg-indigo-500/15" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-slate-200/70 opacity-60 blur-3xl dark:bg-slate-800/30" />
          <div className="absolute -bottom-10 -right-10 h-80 w-80 rounded-full bg-indigo-100 opacity-50 blur-3xl dark:bg-indigo-500/10" />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-indigo-100/40 dark:to-indigo-500/5" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-[#f2f2f2] sm:text-3xl">
          {greeting}, <span className="text-indigo-600 dark:text-indigo-400">{user?.username}</span>!
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-[#6b7280]">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group cursor-pointer rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-180 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-[#2a2a2a] dark:bg-[#161616] dark:hover:border-indigo-500/30 dark:hover:shadow-lg dark:hover:shadow-indigo-500/5"
            onClick={stat.onClick}
          >
            <div className="p-3 sm:p-4">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${stat.color}`}>
                  <stat.icon size={16} className="sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-gray-500 dark:text-[#9ca3af] sm:text-sm">{stat.label}</p>
                  <p className="truncate text-lg font-semibold text-gray-900 dark:text-[#f2f2f2] sm:text-2xl">{stat.value}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        <section className="flex h-[516px] min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-[#2a2a2a] dark:bg-[#161616] lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-[#2a2a2a]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/10">
                <BookOpen size={15} className="text-indigo-600 dark:text-indigo-400" />
              </span>
              <div>
                <Heading>Recent Activities</Heading>
              </div>
            </div>
            <button
              onClick={() => navigate('/notebooks')}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-[#9ca3af] dark:hover:bg-[#242424] dark:hover:text-[#f2f2f2]"
            >
              View all <ArrowUpRight size={12} />
            </button>
          </div>
          <RecentActivitiesList notes={recentNotes} onOpenNote={handleOpenNote} />
        </section>

        <div className="grid min-h-0 grid-cols-1 gap-4">
          <section className="flex h-[250px] w-full min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-[#2a2a2a] dark:bg-[#161616]">
            <div className="flex items-center justify-between border-b border-gray-200 px-3.5 py-2.5 dark:border-[#2a2a2a]">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/10">
                  <Calendar size={14} className="text-indigo-600 dark:text-indigo-400" />
                </span>
                <Heading>Upcoming</Heading>
              </div>
              <button
                onClick={() => navigate('/schedule')}
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-[#9ca3af] dark:hover:bg-[#242424] dark:hover:text-[#f2f2f2]"
              >
                View all <ArrowUpRight size={12} />
              </button>
            </div>
            {events.length > 0 ? (
              <div className={`min-h-0 flex-1 space-y-1 overflow-y-auto p-2.5 ${SCROLLBAR_CLASSES}`}>
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-[#202020]"
                    onClick={() => navigate('/schedule')}
                  >
                    <div className="h-2 w-2 flex-shrink-0 rounded-full bg-indigo-400/70 group-hover:bg-indigo-500 dark:bg-indigo-400/60 dark:group-hover:bg-indigo-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-800 dark:text-[#e5e7eb]">{event.title}</p>
                      <p className="truncate text-[10px] text-gray-500 dark:text-[#6b7280]">{event.description}</p>
                    </div>
                    <div className="flex-shrink-0 text-right text-[10px] text-gray-600 dark:text-[#9ca3af]">
                      <p>{formatCompact(event.date)}</p>
                      <p className="text-gray-500 dark:text-[#6b7280]">{event.startTime}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-xs text-gray-500 dark:text-[#6b7280]">No upcoming events</div>
            )}
          </section>

          <section className="flex h-[250px] w-full min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-[#2a2a2a] dark:bg-[#161616]">
            <div className="flex items-center justify-between border-b border-gray-200 px-3.5 py-2.5 dark:border-[#2a2a2a]">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-500/10">
                  <CheckSquare size={14} className="text-orange-600 dark:text-orange-400" />
                </span>
                <Heading>Tasks</Heading>
              </div>
              <button
                onClick={() => navigate('/tasks')}
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-[#9ca3af] dark:hover:bg-[#242424] dark:hover:text-[#f2f2f2]"
              >
                Open <ArrowUpRight size={12} />
              </button>
            </div>
            <div className={`min-h-0 flex-1 overflow-y-auto p-2.5 ${SCROLLBAR_CLASSES}`}>
              {tasksLoading ? (
                <div className="flex h-full items-center justify-center text-xs text-gray-500 dark:text-[#6b7280]">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <CheckSquare size={18} className="mb-1.5 text-gray-400 dark:text-[#6b7280]" />
                  <p className="text-xs text-gray-600 dark:text-[#9ca3af]">No pending tasks</p>
                  <p className="mt-0.5 text-[10px] text-gray-500 dark:text-[#6b7280]">Your tasks will appear here</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-[#202020]"
                      onClick={() => navigate('/tasks')}
                    >
                      <div className={`h-2 w-2 flex-shrink-0 rounded-full ${task.priority === 'high' ? 'bg-red-500 dark:bg-red-400' : task.priority === 'medium' ? 'bg-yellow-500 dark:bg-yellow-400' : 'bg-emerald-500 dark:bg-emerald-400'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-gray-800 dark:text-[#e5e7eb]">{task.title}</p>
                        <p className="truncate text-[10px] text-gray-500 dark:text-[#6b7280]">{task.task_category}</p>
                      </div>
                      <div className="flex-shrink-0 text-[10px] text-gray-500 dark:text-[#6b7280]">{format(new Date(task.dueDate), 'MMM d')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      </div>
    </PageLayout>
  );
};

export default Home;

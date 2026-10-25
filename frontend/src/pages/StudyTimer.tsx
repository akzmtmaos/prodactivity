import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, RotateCcw, Clock, Target, TrendingUp, X, Trash2, Maximize2, Minimize2, Search, Settings2 } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Pagination from '../components/common/Pagination';
import HeaderTooltip from '../components/common/HeaderTooltip';
import { useTimer } from '../context/TimerContext';
import axiosInstance from '../utils/axiosConfig';
import { supabase } from '../lib/supabase';

// SessionLogs component
interface SessionLogEntry {
  type: 'Study' | 'Break' | 'Long Break';
  start: Date;
  end: Date;
  duration: number; // in seconds
  title?: string;
  subject?: string;
  backendId?: number;
  supabaseId?: number;
}

const SessionLogs: React.FC<{
  logs: SessionLogEntry[];
  onDeleteSession: (log: SessionLogEntry) => void;
}> = ({ logs, onDeleteSession }) => {
  // Filter state
  const [filter, setFilter] = useState<'All' | 'Study' | 'Break' | 'Long Break'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Sort logs by start date (newest first) before filtering
  const sortedLogs = [...logs].sort((a, b) => {
    return new Date(b.start).getTime() - new Date(a.start).getTime();
  });
  
  // Filter logs by type and by name/tag search
  const filteredLogs = (filter === 'All'
    ? sortedLogs
    : sortedLogs.filter(log => log.type === filter)
  ).filter((log) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      (log.title || '').toLowerCase().includes(term) ||
      (log.subject || '').toLowerCase().includes(term) ||
      log.type.toLowerCase().includes(term)
    );
  });
  
  // Reset to page 1 when the filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;

  // Keep the pager in range when a page empties out (delete, search, filter)
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex); // Already sorted newest first

  // Calculate statistics (using all logs, not filtered)
  const studySessions = logs.filter(log => log.type === 'Study');
  const totalStudyTime = studySessions.reduce((total, log) => total + log.duration, 0);
  const totalStudyMinutes = Math.floor(totalStudyTime / 60);
  const totalStudyHours = Math.floor(totalStudyMinutes / 60);
  const remainingStudyMinutes = totalStudyMinutes % 60;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayLogs = logs.filter(log => {
    const logDate = new Date(log.start);
    logDate.setHours(0, 0, 0, 0);
    return logDate.getTime() === today.getTime();
  });
  const todayStudyTime = todayLogs.filter(log => log.type === 'Study').reduce((total, log) => total + log.duration, 0);
  const todayStudyMinutes = Math.floor(todayStudyTime / 60);

  // Last seven days of focus time, oldest first
  const weekDays = Array.from({ length: 7 }).map((_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    return day;
  });
  const weekMinutes = weekDays.map((day) => {
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);
    const seconds = logs
      .filter((log) => log.type === 'Study' && new Date(log.start) >= day && new Date(log.start) < nextDay)
      .reduce((total, log) => total + log.duration, 0);
    return Math.floor(seconds / 60);
  });
  const weekMax = Math.max(1, ...weekMinutes);
  const weekTotal = weekMinutes.reduce((total, minutes) => total + minutes, 0);

  return (
    <div className="space-y-4">
      {/* Statistics strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border border-gray-200 dark:border-[#2f2f2f] rounded-lg overflow-hidden bg-white dark:bg-[#1e1e1e]">
        <div className="flex items-center gap-2 px-3.5 py-2.5">
          <Target size={14} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
          <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{studySessions.length}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Sessions</span>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2.5 border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-[#2f2f2f]">
          <Clock size={14} className="flex-shrink-0 text-emerald-500 dark:text-emerald-400" />
          <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
            {totalStudyHours > 0 ? `${totalStudyHours}h ${remainingStudyMinutes}m` : `${totalStudyMinutes}m`}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Total study</span>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2.5 border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-[#2f2f2f]">
          <TrendingUp size={14} className="flex-shrink-0 text-indigo-500 dark:text-indigo-400" />
          <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{todayStudyMinutes}m</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Today</span>
        </div>
      </div>

      {/* Weekly focus */}
      <div className="rounded-lg border border-gray-200 dark:border-[#2f2f2f] bg-white dark:bg-[#1e1e1e] p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-[13px] font-semibold text-gray-900 dark:text-white">This week</h2>
          <span className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
            {weekTotal >= 60 ? `${Math.floor(weekTotal / 60)}h ${weekTotal % 60}m` : `${weekTotal}m`} focused
          </span>
        </div>
        <div className="flex h-24 items-end gap-2">
          {weekDays.map((day, index) => (
            <div key={day.toISOString()} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-full w-full items-end">
                <div
                  title={`${weekMinutes[index]}m`}
                  className={`w-full rounded-sm transition-[height] duration-300 motion-reduce:transition-none ${
                    index === 6 ? 'bg-indigo-500' : 'bg-indigo-200 dark:bg-indigo-900/60'
                  }`}
                  style={{ height: `${Math.max(4, (weekMinutes[index] / weekMax) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {day.toLocaleDateString(undefined, { weekday: 'narrow' })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Session Logs */}
      <div className="rounded-lg border border-gray-200 dark:border-[#2f2f2f] bg-white dark:bg-[#1e1e1e]">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 dark:border-[#2f2f2f] px-4 py-2.5">
          <h2 className="text-[13px] font-semibold text-gray-900 dark:text-white">Recent sessions</h2>
          <div className="flex items-center gap-1.5">
          <div className="relative w-32 sm:w-40">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search sessions"
              aria-label="Search sessions"
              className="w-full h-6 pl-6 pr-2 text-[11px] rounded-md border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#404040]"
            />
          </div>
          <div className="flex items-center gap-0.5 rounded-md border border-gray-200 dark:border-[#333333] p-0.5 bg-gray-50 dark:bg-[#252525]">
            {(['All', 'Study', 'Break', 'Long Break'] as const).map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                  filter === filterType
                    ? 'bg-white dark:bg-[#333333] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {filterType}
              </button>
            ))}
          </div>
          </div>
        </div>
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-[#2b2b2b]">
              <Clock size={18} className="text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">No sessions yet</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {logs.length === 0
                ? 'Start a timer and your sessions will show up here.'
                : searchTerm.trim()
                  ? `Nothing matches “${searchTerm.trim()}”.`
                  : `No ${filter === 'All' ? '' : filter.toLowerCase()} sessions found.`}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-[#2b2b2b]">
              {paginatedLogs.map((log, idx) => (
                <div
                  key={startIndex + idx}
                  className="group flex items-center justify-between gap-4 px-4 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-[#242424]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2 w-2 flex-shrink-0 rounded-full ${
                        log.type === 'Study' ? 'bg-indigo-500' : log.type === 'Break' ? 'bg-emerald-500' : 'bg-violet-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-gray-900 dark:text-gray-100">
                          {log.title || log.type}
                        </span>
                        {log.title && (
                          <span className="flex-shrink-0 text-[11px] text-gray-400 dark:text-gray-500">{log.type}</span>
                        )}
                        {log.subject && (
                          <span className="max-w-[7rem] flex-shrink-0 truncate rounded bg-gray-100 dark:bg-[#2b2b2b] px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300">
                            {log.subject}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                        {log.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {log.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–{log.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="text-[11px] font-medium tabular-nums text-gray-700 dark:text-gray-300">
                      {Math.floor(log.duration / 60)}m {log.duration % 60}s
                    </span>
                    <HeaderTooltip label="Delete session" fixed>
                      <button
                        type="button"
                        onClick={() => onDeleteSession(log)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 dark:text-gray-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        aria-label="Delete session"
                      >
                        <Trash2 size={13} />
                      </button>
                    </HeaderTooltip>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 border-t border-gray-200 dark:border-[#2f2f2f] px-4 py-2 bg-gray-50/60 dark:bg-[#242424]">
                <span className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                  {startIndex + 1}–{Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length}
                </span>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const StudyTimer: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [sessionLogs, setSessionLogs] = useState<SessionLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'timer' | 'sessions'>('timer');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(() => {
    const saved = Number(localStorage.getItem('studyTimerDailyGoalMinutes'));
    return saved > 0 ? saved : 120;
  });
  const [goalMenuOpen, setGoalMenuOpen] = useState(false);

  // Use the timer context
  const { 
    timerState, 
    startTimer, 
    pauseTimer, 
    resetTimer, 
    refreshSessionsCount,
    stopwatchMode,
    setStopwatchMode,
    pomodoroMode,
    sessionTitle,
    sessionTag,
    setSessionTitle,
    setSessionTag
  } = useTimer();
  const [sessionToDelete, setSessionToDelete] = useState<SessionLogEntry | null>(null);


  // Load session logs from backend and Supabase, merging both sources
  const loadSessionLogs = async () => {
    const readCachedLogs = (): SessionLogEntry[] => {
      try {
        const raw = localStorage.getItem('studyTimerLogs');
        if (!raw) return [];
        return JSON.parse(raw).map((log: any) => ({
          ...log,
          start: new Date(log.start),
          end: new Date(log.end),
        }));
      } catch (e) {
        console.error('Error parsing cached session logs:', e);
        return [];
      }
    };

    try {
      const cachedLogs = readCachedLogs();
      const userData = localStorage.getItem('user');
      if (!userData) {
        if (cachedLogs.length > 0) setSessionLogs(cachedLogs);
        return;
      }

      // Backend (Django) sessions – failure or an empty result must not hide Supabase rows
      let backendLogs: SessionLogEntry[] = [];
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const response = await axiosInstance.get('/tasks/study-timer-sessions/');
          const rows = response.data?.results ?? response.data ?? [];
          backendLogs = (Array.isArray(rows) ? rows : []).map((log: any) => ({
            type: log.session_type,
            start: new Date(log.start_time),
            end: new Date(log.end_time),
            duration: log.duration,
            title: log.title || '',
            subject: log.subject || '',
            backendId: log.id,
          }));
        } catch (apiError) {
          console.warn('Failed to fetch sessions from backend, continuing with Supabase:', apiError);
        }
      }

      // Supabase sessions
      let supabaseLogs: SessionLogEntry[] = [];
      try {
        const { data: { user: supabaseAuthUser } } = await supabase.auth.getUser();
        if (supabaseAuthUser?.id) {
          const { data, error } = await supabase
            .from('study_timer_sessions')
            .select('*')
            .eq('user_id', supabaseAuthUser.id)
            .order('start_time', { ascending: false });

          if (error) {
            console.warn('Failed to fetch sessions from Supabase:', error);
          } else if (data) {
            supabaseLogs = data.map((log: any) => ({
              type: log.session_type,
              start: new Date(log.start_time),
              end: new Date(log.end_time),
              duration: log.duration,
              title: log.title || '',
              subject: log.subject || '',
              supabaseId: log.id,
            }));
          }
        }
      } catch (supabaseErr) {
        console.warn('Error fetching sessions from Supabase:', supabaseErr);
      }

      // Merge both sources, combining duplicates that share a type and start time
      const byKey = new Map<string, SessionLogEntry>();
      [...backendLogs, ...supabaseLogs].forEach((log) => {
        const start = new Date(log.start);
        if (Number.isNaN(start.getTime())) return;
        const key = `${log.type}|${start.toISOString()}`;
        const existing = byKey.get(key);
        if (!existing) {
          byKey.set(key, log);
          return;
        }
        byKey.set(key, {
          ...existing,
          backendId: existing.backendId ?? log.backendId,
          supabaseId: existing.supabaseId ?? log.supabaseId,
          title: existing.title || log.title,
          subject: existing.subject || log.subject,
        });
      });
      const mergedLogs = Array.from(byKey.values())
        .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

      // Keep cached history when both stores are unreachable rather than blanking the page
      const nextLogs = mergedLogs.length > 0 ? mergedLogs : cachedLogs;
      setSessionLogs(nextLogs);

      if (nextLogs.length > 0) {
        localStorage.setItem('studyTimerLogs', JSON.stringify(nextLogs));
      } else {
        localStorage.removeItem('studyTimerLogs');
      }

      if (refreshSessionsCount) {
        await refreshSessionsCount();
      }
    } catch (error) {
      console.error('Error loading session logs:', error);
    }
  };

  // On initial mount, always reset to Study Time
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
    // Load session logs on mount
    loadSessionLogs();
    
    // Also refresh the sessions count to ensure counter is synced (with delay to ensure backend is ready)
    if (refreshSessionsCount) {
      // Delay slightly to ensure backend is ready
      setTimeout(() => {
        refreshSessionsCount();
      }, 500);
    }
  }, []);

  // Refresh session logs when timer state changes (break state change)
  useEffect(() => {
    loadSessionLogs();
    // Also refresh the sessions count to keep counter in sync (with delay to ensure data is saved)
    if (refreshSessionsCount) {
      setTimeout(() => {
        refreshSessionsCount();
      }, 1500);
    }
  }, [timerState.isBreak]); // Refresh when break state changes (indicating a session completed)

  // Listen for session saved events to auto-refresh session logs
  useEffect(() => {
    const handleSessionSaved = () => {
      // Optimistic update: immediately add the latest session from localStorage
      const logs = localStorage.getItem('studyTimerLogs');
      if (logs) {
        try {
          const parsedLogs = JSON.parse(logs).map((log: any) => ({
            ...log,
            start: new Date(log.start),
            end: new Date(log.end)
          }));
          // Sort by date (newest first) and update state immediately
          const sortedLogs = parsedLogs.sort((a: SessionLogEntry, b: SessionLogEntry) => {
            return new Date(b.start).getTime() - new Date(a.start).getTime();
          });
          setSessionLogs(sortedLogs);
        } catch (e) {
          console.error('Error parsing session logs for optimistic update:', e);
        }
      }
      
      // Then refresh from backend to ensure consistency (with small delay to allow backend to process)
      setTimeout(() => {
        loadSessionLogs();
        if (refreshSessionsCount) {
          refreshSessionsCount();
        }
      }, 300);
    };

    window.addEventListener('studyTimerSessionSaved', handleSessionSaved);
    return () => {
      window.removeEventListener('studyTimerSessionSaved', handleSessionSaved);
    };
  }, [refreshSessionsCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTimer = () => {
    if (timerState.isActive) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number) =>
    minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;

  // Pomodoro cycle and dial progress
  const sessionsUntilLongBreak = Math.max(1, timerState.settings.sessionsUntilLongBreak);
  const completedInCycle = timerState.sessionsCompleted % sessionsUntilLongBreak;
  const filledSessionDots = timerState.sessionsCompleted > 0 && completedInCycle === 0
    ? sessionsUntilLongBreak
    : completedInCycle;

  // The context records which kind of break it started; the modulo check keeps
  // this right for a timer restored from an older saved state.
  const isLongBreakPhase =
    timerState.isBreak &&
    (timerState.breakIsLong ?? (timerState.sessionsCompleted > 0 && completedInCycle === 0));
  const phaseDuration = timerState.isBreak
    ? (isLongBreakPhase ? timerState.settings.longBreakDuration : timerState.settings.breakDuration)
    : timerState.settings.studyDuration;

  // Session summary
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStudySeconds = sessionLogs
    .filter((log) => log.type === 'Study' && new Date(log.start).setHours(0, 0, 0, 0) === todayStart.getTime())
    .reduce((total, log) => total + log.duration, 0);
  const totalStudySeconds = sessionLogs
    .filter((log) => log.type === 'Study')
    .reduce((total, log) => total + log.duration, 0);

  const todayFocusMinutes = Math.floor(todayStudySeconds / 60);
  const goalProgress = Math.min(100, Math.round((todayFocusMinutes / Math.max(1, dailyGoalMinutes)) * 100));
  const goalLabel = dailyGoalMinutes >= 60
    ? `${Math.floor(dailyGoalMinutes / 60)}h${dailyGoalMinutes % 60 ? ` ${dailyGoalMinutes % 60}m` : ''}`
    : `${dailyGoalMinutes}m`;

  // What happens when the current block ends (shown in the side rail)
  // Long break lands on every Nth completed session, same rule as the timer.
  const nextBreakIsLong = (timerState.sessionsCompleted + 1) % sessionsUntilLongBreak === 0;
  const nextBreakMinutes = Math.round(
    (nextBreakIsLong ? timerState.settings.longBreakDuration : timerState.settings.breakDuration) / 60
  );
  const studyBlockMinutes = Math.round(timerState.settings.studyDuration / 60);
  const remainingToGoal = Math.max(0, dailyGoalMinutes - todayFocusMinutes);
  const upNext = stopwatchMode
    ? { label: 'Save & reset', detail: 'Elapsed time is logged' }
    : timerState.isBreak
      ? { label: 'Focus', detail: `${studyBlockMinutes}m block` }
      : pomodoroMode
        ? {
            label: nextBreakIsLong ? 'Long break' : 'Short break',
            detail: `${nextBreakMinutes}m — starts automatically`,
          }
        : { label: 'Timer stops', detail: 'Pomodoro mode is off' };
  const recentBlocks = sessionLogs.slice(0, 3);

  // Dial progress: countdown fills towards the end of the block, the stopwatch
  // fills towards today's focus goal (a rolling hour would not mean anything).
  const ringRadius = 110;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringProgress = stopwatchMode
    ? dailyGoalMinutes > 0
      ? Math.min(1, todayFocusMinutes / dailyGoalMinutes)
      : 0
    : phaseDuration > 0
      ? Math.min(1, Math.max(0, (phaseDuration - timerState.timeLeft) / phaseDuration))
      : 0;

  const updateDailyGoal = (minutes: number) => {
    setDailyGoalMinutes(minutes);
    localStorage.setItem('studyTimerDailyGoalMinutes', String(minutes));
    setGoalMenuOpen(false);
  };

  useEffect(() => {
    if (!focusMode) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocusMode(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode]);


  const clearSessionLogs = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Delete all sessions from backend
        try {
          const response = await axiosInstance.get('/tasks/study-timer-sessions/');
          const rows = response.data?.results ?? response.data ?? [];
          const sessions = Array.isArray(rows) ? rows : [];
          // Delete each session
          await Promise.all(
            sessions.map((session: any) =>
              axiosInstance.delete(`/tasks/study-timer-sessions/${session.id}/`)
            )
          );
          console.log('All sessions deleted from backend');
        } catch (apiError) {
          console.warn('Failed to delete from backend:', apiError);
        }
      }

      // Delete Supabase rows too – history is read from both stores
      try {
        const { data: { user: supabaseAuthUser } } = await supabase.auth.getUser();
        if (supabaseAuthUser?.id) {
          const { error } = await supabase
            .from('study_timer_sessions')
            .delete()
            .eq('user_id', supabaseAuthUser.id);
          if (error) {
            console.warn('Failed to delete sessions from Supabase:', error);
          } else {
            console.log('All sessions deleted from Supabase');
          }
        }
      } catch (supabaseErr) {
        console.warn('Error deleting sessions from Supabase:', supabaseErr);
      }

      // Also clear localStorage
      localStorage.removeItem('studyTimerLogs');
      localStorage.removeItem('studyTimerSessionsCompleted');
      setSessionLogs([]);
      setShowClearConfirm(false);
      
      // Refresh the sessions count in timer context (will be 0 after clearing)
      await refreshSessionsCount();
    } catch (error) {
      console.error('Error clearing session logs:', error);
    }
  };

  const deleteSession = async (log: SessionLogEntry) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token && log.backendId) {
        try {
          await axiosInstance.delete(`/tasks/study-timer-sessions/${log.backendId}/`);
        } catch (apiError) {
          console.warn('Failed to delete session from backend:', apiError);
        }
      }

      if (log.supabaseId) {
        try {
          const { error } = await supabase
            .from('study_timer_sessions')
            .delete()
            .eq('id', log.supabaseId);
          if (error) {
            console.warn('Failed to delete session from Supabase:', error);
          }
        } catch (supabaseErr) {
          console.warn('Error deleting session from Supabase:', supabaseErr);
        }
      }

      const logStartISO = new Date(log.start).toISOString();
      const remaining = sessionLogs.filter(
        (entry) => !(entry.type === log.type && new Date(entry.start).toISOString() === logStartISO)
      );
      setSessionLogs(remaining);
      if (remaining.length > 0) {
        localStorage.setItem('studyTimerLogs', JSON.stringify(remaining));
      } else {
        localStorage.removeItem('studyTimerLogs');
      }
      setSessionToDelete(null);
      await refreshSessionsCount();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="flex flex-col min-h-0">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Study Timer
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Focus in blocks and keep a record of it.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-col min-h-0 flex-1">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#2f2f2f] mb-3 gap-3">
            <div className="flex items-center gap-0.5" role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === 'timer'}
                onClick={() => setActiveTab('timer')}
                className={`rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors focus:outline-none ${
                  activeTab === 'timer'
                    ? 'bg-gray-100 text-gray-900 dark:bg-[#2b2b2b] dark:text-white'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#242424] dark:hover:text-gray-200'
                }`}
              >
                Timer
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'sessions'}
                onClick={() => setActiveTab('sessions')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors focus:outline-none ${
                  activeTab === 'sessions'
                    ? 'bg-gray-100 text-gray-900 dark:bg-[#2b2b2b] dark:text-white'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#242424] dark:hover:text-gray-200'
                }`}
              >
                Sessions
                <span className={`text-[11px] tabular-nums ${activeTab === 'sessions' ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {sessionLogs.length}
                </span>
              </button>
            </div>
          </div>
          <div className="mt-1 flex-1 min-h-0">
            {activeTab === 'timer' && (
              <>
                <div className="space-y-4">
                  {/* Summary strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 border border-gray-200 dark:border-[#2f2f2f] rounded-lg overflow-hidden bg-white dark:bg-[#1e1e1e]">
                    <div className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={14} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                          {formatMinutes(todayFocusMinutes)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Today</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-[#2b2b2b]">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-[width] duration-500 motion-reduce:transition-none"
                            style={{ width: `${goalProgress}%` }}
                          />
                        </div>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setGoalMenuOpen((open) => !open)}
                            className="text-[10px] tabular-nums text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            aria-label="Set daily focus goal"
                          >
                            {goalLabel} goal
                          </button>
                          {goalMenuOpen && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setGoalMenuOpen(false)} aria-hidden />
                              <div className="absolute right-0 top-full z-20 mt-1 w-24 rounded-md border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] p-1 shadow-lg">
                                {[30, 60, 90, 120, 180].map((minutes) => (
                                  <button
                                    key={minutes}
                                    type="button"
                                    onClick={() => updateDailyGoal(minutes)}
                                    className={`w-full rounded px-2 py-1 text-left text-[11px] transition-colors hover:bg-gray-50 dark:hover:bg-[#2d2d2d] ${
                                      minutes === dailyGoalMinutes ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300'
                                    }`}
                                  >
                                    {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-[#2f2f2f]">
                      <Target size={14} className="flex-shrink-0 text-emerald-500 dark:text-emerald-400" />
                      <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{timerState.sessionsCompleted}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">This cycle</span>
                    </div>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-[#2f2f2f]">
                      <Clock size={14} className="flex-shrink-0 text-indigo-500 dark:text-indigo-400" />
                      <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                        {formatMinutes(Math.floor(totalStudySeconds / 60))}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Total study</span>
                    </div>
                  </div>

                  {/* Timer hero */}
                  <div className="rounded-lg border border-gray-200 dark:border-[#2f2f2f] bg-white dark:bg-[#1e1e1e]">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-[#2f2f2f] px-4 py-2.5">
                      <div>
                        <p className="text-[13px] font-medium text-gray-900 dark:text-white">
                          {stopwatchMode ? 'Stopwatch' : timerState.isBreak ? 'Break' : 'Focus session'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                          {stopwatchMode
                            ? 'Counts up from zero'
                            : timerState.isBreak
                              ? (isLongBreakPhase ? 'Long break — step away for a while' : 'Short break — step away for a moment')
                              : `${Math.round(phaseDuration / 60)} minute block`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                      <HeaderTooltip label="Focus mode" fixed>
                        <button
                          type="button"
                          onClick={() => setFocusMode(true)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                          aria-label="Enter focus mode"
                        >
                          <Maximize2 size={14} />
                        </button>
                      </HeaderTooltip>
                      <div className="flex items-center gap-0.5 rounded-md border border-gray-200 dark:border-[#333333] p-0.5 bg-gray-50 dark:bg-[#252525]" role="group" aria-label="Timer mode">
                        <button
                          type="button"
                          aria-pressed={!stopwatchMode}
                          onClick={() => setStopwatchMode(false)}
                          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                            !stopwatchMode
                              ? 'bg-white dark:bg-[#333333] text-gray-900 dark:text-white shadow-sm'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                        >
                          Timer
                        </button>
                        <button
                          type="button"
                          aria-pressed={stopwatchMode}
                          onClick={() => setStopwatchMode(true)}
                          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                            stopwatchMode
                              ? 'bg-white dark:bg-[#333333] text-gray-900 dark:text-white shadow-sm'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                        >
                          Stopwatch
                        </button>
                      </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 border-b border-gray-200 dark:border-[#2f2f2f] px-4 py-2.5 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={sessionTitle}
                        onChange={(event) => setSessionTitle(event.target.value)}
                        disabled={timerState.isBreak}
                        maxLength={80}
                        placeholder={timerState.isBreak ? 'Breaks stay unnamed' : 'Name this block (optional)'}
                        aria-label="Session name"
                        className="min-w-0 flex-1 rounded-md border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] px-2.5 py-1.5 text-[12px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#404040] disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={sessionTag}
                        onChange={(event) => setSessionTag(event.target.value)}
                        disabled={timerState.isBreak}
                        maxLength={24}
                        placeholder="Tag (e.g. Biology)"
                        aria-label="Session tag"
                        className="w-full rounded-md border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] px-2.5 py-1.5 text-[12px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#404040] disabled:opacity-50 sm:w-40"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_15rem]">
                    <div className="flex flex-col items-center px-6 py-8">
                      <div className="relative">
                        <svg width={240} height={240} className="-rotate-90" aria-hidden>
                          <circle
                            cx={120}
                            cy={120}
                            r={ringRadius}
                            fill="none"
                            strokeWidth={4}
                            stroke="currentColor"
                            className="text-gray-100 dark:text-[#2b2b2b]"
                          />
                          <circle
                            cx={120}
                            cy={120}
                            r={ringRadius}
                            fill="none"
                            strokeWidth={4}
                            strokeLinecap="round"
                            stroke="currentColor"
                            strokeDasharray={ringCircumference}
                            strokeDashoffset={ringCircumference * (1 - ringProgress)}
                            className={`transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none ${timerState.isBreak ? 'text-emerald-500 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span
                            role="timer"
                            aria-label={stopwatchMode
                              ? `Stopwatch ${formatTime(timerState.elapsedTime || 0)}`
                              : `${timerState.isBreak ? 'Break' : 'Focus'} ${formatTime(timerState.timeLeft)} remaining`}
                            className="text-5xl font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white"
                          >
                            {stopwatchMode ? formatTime(timerState.elapsedTime || 0) : formatTime(timerState.timeLeft)}
                          </span>
                          <span className="mt-2 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            {stopwatchMode ? 'Counting up' : timerState.isActive ? 'Running' : 'Paused'}
                          </span>
                          <span className="sr-only" aria-live="polite">
                            {timerState.isActive ? 'Timer running' : 'Timer paused'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center gap-2">
                        <button
                          onClick={toggleTimer}
                          className="flex h-9 items-center gap-1.5 rounded-md bg-indigo-600 px-5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                        >
                          {timerState.isActive ? <Pause size={16} /> : <Play size={16} />}
                          {timerState.isActive ? 'Pause' : 'Start'}
                        </button>
                        <HeaderTooltip label={stopwatchMode && timerState.elapsedTime > 0 ? 'Save & reset' : 'Reset'} fixed>
                          <button
                            onClick={resetTimer}
                            className={`flex h-9 items-center gap-1.5 rounded-md px-4 text-sm font-medium transition-colors ${
                              stopwatchMode && timerState.elapsedTime > 0
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d]'
                            }`}
                          >
                            <RotateCcw size={16} />
                            {stopwatchMode && timerState.elapsedTime > 0 ? 'Save & reset' : 'Reset'}
                          </button>
                        </HeaderTooltip>
                      </div>

                      {!stopwatchMode && (
                        <div className="mt-5 flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            {Array.from({ length: sessionsUntilLongBreak }).map((_, index) => (
                              <span
                                key={index}
                                className={`h-1.5 w-1.5 rounded-full ${
                                  index < filledSessionDots
                                    ? 'bg-indigo-600 dark:bg-indigo-400'
                                    : 'bg-gray-200 dark:bg-[#3a3a3a]'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            {filledSessionDots} of {sessionsUntilLongBreak} until long break
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Side rail – what's next and what was just logged */}
                    <aside className="flex flex-col gap-5 border-t border-gray-200 dark:border-[#2f2f2f] px-4 py-5 md:border-l md:border-t-0">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Up next</p>
                        <p className="mt-1 text-[13px] font-semibold text-gray-900 dark:text-white">{upNext.label}</p>
                        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{upNext.detail}</p>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Recent blocks</p>
                          <button
                            type="button"
                            onClick={() => setActiveTab('sessions')}
                            className="text-[10px] font-medium text-indigo-600 transition-colors hover:underline dark:text-indigo-400"
                          >
                            View all
                          </button>
                        </div>
                        {recentBlocks.length === 0 ? (
                          <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                            Nothing logged yet.
                          </p>
                        ) : (
                          <ul className="mt-1.5 space-y-1.5">
                            {recentBlocks.map((log) => (
                              <li
                                key={`${log.type}-${new Date(log.start).getTime()}`}
                                className="flex items-baseline justify-between gap-2"
                              >
                                <span className="truncate text-[11px] text-gray-700 dark:text-gray-300">
                                  {log.title || log.type}
                                </span>
                                <span className="flex-shrink-0 text-[10px] tabular-nums text-gray-400 dark:text-gray-500">
                                  {Math.max(1, Math.round(log.duration / 60))}m
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="mt-auto rounded-md bg-gray-50 dark:bg-[#242424] px-3 py-2.5">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Goal today</p>
                        <p className="mt-1 text-[12px] font-medium tabular-nums text-gray-700 dark:text-gray-300">
                          {remainingToGoal > 0
                            ? `${formatMinutes(remainingToGoal)} to go`
                            : 'Goal reached'}
                        </p>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-[#333333]">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 motion-reduce:transition-none"
                            style={{ width: `${goalProgress}%` }}
                          />
                        </div>
                      </div>
                    </aside>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 dark:border-[#2f2f2f] px-4 py-2.5">
                      <span className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                        {Math.round(timerState.settings.studyDuration / 60)}m focus · {Math.round(timerState.settings.breakDuration / 60)}m break · {Math.round(timerState.settings.longBreakDuration / 60)}m long
                      </span>
                      <Link
                        to="/settings?tab=general"
                        className="inline-flex items-center gap-1 rounded-md text-[11px] font-medium text-indigo-600 transition-colors hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        <Settings2 size={12} />
                        Change durations
                      </Link>
                    </div>
                  </div>
                </div>

              </>
            )}
            {activeTab === 'sessions' && (
              <>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">Session history</h2>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Every focus block and break you have logged.</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HeaderTooltip label="Refresh" fixed>
                      <button
                        onClick={loadSessionLogs}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                        aria-label="Refresh sessions"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </HeaderTooltip>
                    {sessionLogs.length > 0 && (
                      <HeaderTooltip label="Clear all" fixed>
                        <button
                          onClick={() => setShowClearConfirm(true)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          aria-label="Clear all sessions"
                        >
                          <Trash2 size={14} />
                        </button>
                      </HeaderTooltip>
                    )}
                  </div>
                </div>
                <SessionLogs logs={sessionLogs} onDeleteSession={setSessionToDelete} />
              </>
            )}
          </div>
        </div>

        {/* Full-screen focus mode */}
        {focusMode && (
          <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-white dark:bg-[#141414] px-6">
            <HeaderTooltip label="Exit focus mode" fixed>
              <button
                type="button"
                onClick={() => setFocusMode(false)}
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-[#242424] hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                aria-label="Exit focus mode"
              >
                <Minimize2 size={18} />
              </button>
            </HeaderTooltip>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
              {stopwatchMode ? 'Stopwatch' : timerState.isBreak ? 'Break' : 'Focus session'}
            </p>
            <p
              role="timer"
              aria-label={stopwatchMode
                ? `Stopwatch ${formatTime(timerState.elapsedTime || 0)}`
                : `${timerState.isBreak ? 'Break' : 'Focus'} ${formatTime(timerState.timeLeft)} remaining`}
              className="mt-5 text-6xl font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white sm:text-7xl"
            >
              {stopwatchMode ? formatTime(timerState.elapsedTime || 0) : formatTime(timerState.timeLeft)}
            </p>
            <div className="mt-10 flex items-center gap-2">
              <button
                onClick={toggleTimer}
                className="flex h-10 items-center gap-2 rounded-md bg-indigo-600 px-6 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                {timerState.isActive ? <Pause size={18} /> : <Play size={18} />}
                {timerState.isActive ? 'Pause' : 'Start'}
              </button>
              <HeaderTooltip label={stopwatchMode && timerState.elapsedTime > 0 ? 'Save & reset' : 'Reset'} fixed>
                <button
                  onClick={resetTimer}
                  className="flex h-10 items-center gap-2 rounded-md border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] px-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors"
                >
                  <RotateCcw size={18} />
                  {stopwatchMode && timerState.elapsedTime > 0 ? 'Save & reset' : 'Reset'}
                </button>
              </HeaderTooltip>
            </div>
            <p className="mt-8 text-[11px] text-gray-400 dark:text-gray-500">Press Esc to exit</p>
          </div>
        )}

        {/* Delete single session confirmation */}
        {sessionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40 dark:bg-black/60"
              onClick={() => setSessionToDelete(null)}
              aria-hidden
            />
            <div
              className="relative w-full max-w-md overflow-hidden rounded-md border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1e1e1e] shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#333333]">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Delete session</h2>
                <HeaderTooltip label="Close" fixed>
                  <button
                    type="button"
                    onClick={() => setSessionToDelete(null)}
                    className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] transition-colors"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </HeaderTooltip>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Delete {sessionToDelete.title ? `“${sessionToDelete.title}”` : `this ${sessionToDelete.type.toLowerCase()} block`}? This cannot be undone.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(sessionToDelete.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {new Date(sessionToDelete.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–{new Date(sessionToDelete.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setSessionToDelete(null)}
                    className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-[#333333] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteSession(sessionToDelete)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 dark:bg-[#e60000] dark:hover:bg-[#c20000] transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clear all confirmation */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40 dark:bg-black/60"
              onClick={() => setShowClearConfirm(false)}
              aria-hidden
            />
            <div
              className="relative w-full max-w-md overflow-hidden rounded-md border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1e1e1e] shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#333333]">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Clear all sessions</h2>
                <HeaderTooltip label="Close" fixed>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] transition-colors"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </HeaderTooltip>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Delete all {sessionLogs.length} logged session{sessionLogs.length !== 1 ? 's' : ''}? This cannot be undone.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Your timer settings stay as they are.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-[#333333] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={clearSessionLogs}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 dark:bg-[#e60000] dark:hover:bg-[#c20000] transition-colors"
                  >
                    <Trash2 size={14} />
                    Clear all
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default StudyTimer;

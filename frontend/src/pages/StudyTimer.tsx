import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Clock, Target, TrendingUp } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import HelpButton from '../components/HelpButton';
import { useTimer } from '../context/TimerContext';
import axiosInstance from '../utils/axiosConfig';
import { supabase } from '../lib/supabase';

// SessionLogs component
interface SessionLogEntry {
  type: 'Study' | 'Break' | 'Long Break';
  start: Date;
  end: Date;
  duration: number; // in seconds
}

const SessionLogs: React.FC<{ logs: SessionLogEntry[] }> = ({ logs }) => {
  // Filter state
  const [filter, setFilter] = useState<'All' | 'Study' | 'Break' | 'Long Break'>('All');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Sort logs by start date (newest first) before filtering
  const sortedLogs = [...logs].sort((a, b) => {
    return new Date(b.start).getTime() - new Date(a.start).getTime();
  });
  
  // Filter logs based on selected filter
  const filteredLogs = filter === 'All' 
    ? sortedLogs 
    : sortedLogs.filter(log => log.type === filter);
  
  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
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

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Target size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {studySessions.length}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">Total Sessions</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Clock size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalStudyHours > 0 ? `${totalStudyHours}h ${remainingStudyMinutes}m` : `${totalStudyMinutes}m`}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">Total Study Time</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <TrendingUp size={24} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {todayStudyMinutes}m
              </h3>
              <p className="text-gray-600 dark:text-gray-400">Today's Study Time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Session Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Sessions</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Filter:</span>
            {(['All', 'Study', 'Break', 'Long Break'] as const).map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${
                  filter === filterType
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {filterType}
              </button>
            ))}
          </div>
        </div>
        {filteredLogs.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            {logs.length === 0 
              ? 'No sessions logged yet. Start a timer to begin tracking!' 
              : `No ${filter === 'All' ? '' : filter.toLowerCase()} sessions found.`}
          </p>
        ) : (
          <>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {paginatedLogs.map((log, idx) => (
                <div key={startIndex + idx} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      log.type === 'Study' ? 'bg-blue-500' : 
                      log.type === 'Break' ? 'bg-green-500' : 'bg-purple-500'
                    }`}></div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{log.type}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {log.start.toLocaleDateString()} {log.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {log.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {Math.floor(log.duration / 60)}m {log.duration % 60}s
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} {filter === 'All' ? 'sessions' : `${filter.toLowerCase()} sessions`}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${
                      currentPage === 1
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Previous
                  </button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${
                      currentPage === totalPages
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Next
                  </button>
                </div>
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

  // Use the timer context
  const { 
    timerState, 
    startTimer, 
    pauseTimer, 
    resetTimer, 
    refreshSessionsCount,
    stopwatchMode,
    setStopwatchMode
  } = useTimer();


  // Load session logs function (fetches from backend API, Supabase, or localStorage)
  const loadSessionLogs = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        // Fallback to localStorage only
        const logs = localStorage.getItem('studyTimerLogs');
        if (logs) {
          try {
            const parsedLogs = JSON.parse(logs).map((log: any) => ({
              ...log,
              start: new Date(log.start),
              end: new Date(log.end)
            }));
            setSessionLogs(parsedLogs);
          } catch (e) {
            console.error('Error parsing session logs:', e);
          }
        }
        return;
      }
      
      const user = JSON.parse(userData);
      const userId = user.id;
      
      if (!userId) {
        console.warn('No user ID found, cannot fetch sessions');
        return;
      }
      
      // Try to fetch from backend API first
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const response = await axiosInstance.get('/tasks/study-timer-sessions/');
          const backendLogs = response.data || [];
          
          // Convert backend format to frontend format
          const formattedLogs = backendLogs.map((log: any) => ({
            type: log.session_type,
            start: new Date(log.start_time),
            end: new Date(log.end_time),
            duration: log.duration
          }));
          
          setSessionLogs(formattedLogs);
          
          // Also update localStorage for backward compatibility
          localStorage.setItem('studyTimerLogs', JSON.stringify(formattedLogs));
          
          // Refresh the sessions count in timer context to keep counter in sync
          console.log('🔄 Refreshing sessions count after loading from backend...');
          if (refreshSessionsCount) {
            await refreshSessionsCount();
          }
          return;
        } catch (apiError) {
          console.warn('Failed to fetch from backend, trying Supabase:', apiError);
        }
      }
      
      // Try Supabase as fallback
      try {
        // Get Supabase auth user ID (UUID) - this is what Supabase expects
        const { data: { user: supabaseAuthUser } } = await supabase.auth.getUser();
        const supabaseUserId = supabaseAuthUser?.id;
        
        if (supabaseUserId) {
          const { data: supabaseLogs, error: supabaseError } = await supabase
            .from('study_timer_sessions')
            .select('*')
            .eq('user_id', supabaseUserId) // Use Supabase auth UUID
            .order('start_time', { ascending: false });
          
          if (!supabaseError && supabaseLogs) {
            // Convert Supabase format to frontend format
            const formattedLogs = supabaseLogs.map((log: any) => ({
              type: log.session_type,
              start: new Date(log.start_time),
              end: new Date(log.end_time),
              duration: log.duration
            }));
            
            setSessionLogs(formattedLogs);
            
            // Also update localStorage for backward compatibility
            localStorage.setItem('studyTimerLogs', JSON.stringify(formattedLogs));
            
            // Refresh the sessions count in timer context to keep counter in sync
            console.log('🔄 Refreshing sessions count after loading from Supabase...');
            if (refreshSessionsCount) {
              await refreshSessionsCount();
            }
            return;
          } else {
            console.warn('Failed to fetch from Supabase:', supabaseError);
        }
        } else {
          console.warn('⚠️ No Supabase auth user found, cannot fetch from Supabase');
        }
      } catch (supabaseErr) {
        console.warn('Error fetching from Supabase:', supabaseErr);
      }
      
      // Final fallback to localStorage
      const logs = localStorage.getItem('studyTimerLogs');
      if (logs) {
        try {
          const parsedLogs = JSON.parse(logs).map((log: any) => ({
            ...log,
            start: new Date(log.start),
            end: new Date(log.end)
          }));
          setSessionLogs(parsedLogs);
          
          // Count Study sessions from localStorage and update counter
          const studyCount = parsedLogs.filter((log: any) => log.type === 'Study').length;
          if (studyCount > 0 && refreshSessionsCount) {
            // Update the counter based on localStorage data
            console.log('📊 Updating counter from localStorage sessions:', studyCount);
            // We'll refresh from backend/Supabase, but localStorage gives us a quick count
            setTimeout(() => {
              refreshSessionsCount();
            }, 500);
          }
        } catch (e) {
          console.error('Error parsing session logs:', e);
        }
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


  const clearSessionLogs = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Delete all sessions from backend
        try {
          const response = await axiosInstance.get('/tasks/study-timer-sessions/');
          const sessions = response.data || [];
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
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            Study Timer
            <HelpButton 
              content={
                <div>
                  <p className="font-semibold mb-2">Study Timer & Focus</p>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>Pomodoro Technique:</strong> 25-minute focused work sessions</li>
                    <li>• <strong>Custom Timers:</strong> Set your own study session lengths</li>
                    <li>• <strong>Break Timers:</strong> Take regular breaks to maintain focus</li>
                    <li>• <strong>Session Logs:</strong> Track your study time and productivity</li>
                    <li>• <strong>Statistics:</strong> View your study patterns and progress</li>
                    <li>• <strong>Floating Timer:</strong> Keep timer visible while working</li>
                    <li>• <strong>Sound Alerts:</strong> Get notified when sessions end</li>
                  </ul>
                </div>
              } 
              title="Study Timer Help" 
            />
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track your study sessions
          </p>
        </div>

        {/* Tabs styled like Settings */}
        <div>
          <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-8">
            <button
              onClick={() => setActiveTab('timer')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeTab === 'timer'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Timer
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeTab === 'sessions'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Sessions
            </button>
          </div>
          <div className="mt-4">
            {activeTab === 'timer' && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <Clock size={24} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {stopwatchMode ? formatTime(timerState.elapsedTime || 0) : formatTime(timerState.timeLeft)}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {stopwatchMode ? 'Stopwatch' : (timerState.isBreak ? 'Break Time' : 'Study Time')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                        <Target size={24} className="text-green-600 dark:text-green-400" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {timerState.sessionsCompleted}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">Sessions Completed</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                        <TrendingUp size={24} className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {timerState.settings.sessionsUntilLongBreak - (timerState.sessionsCompleted % timerState.settings.sessionsUntilLongBreak)}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">Until Long Break</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timer Mode Toggle */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Timer Mode</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {stopwatchMode ? 'Stopwatch: Counts up from 0:00' : 'Timer: Counts down from set duration'}
                      </p>
                    </div>
                    <button
                      onClick={() => setStopwatchMode(!stopwatchMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        stopwatchMode ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          stopwatchMode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Timer Display */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-md border border-gray-200 dark:border-gray-700 mb-8">
                  <div className="text-center">
                    <div className="text-8xl font-bold text-gray-900 dark:text-white mb-8">
                      {stopwatchMode ? formatTime(timerState.elapsedTime || 0) : formatTime(timerState.timeLeft)}
                    </div>
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={toggleTimer}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center transition-colors"
                      >
                        {timerState.isActive ? (
                          <>
                            <Pause size={20} className="mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play size={20} className="mr-2" />
                            Start
                          </>
                        )}
                      </button>
                      <button
                        onClick={resetTimer}
                        className={`px-6 py-3 rounded-lg font-medium flex items-center transition-colors ${
                          stopwatchMode && timerState.elapsedTime > 0
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <RotateCcw size={20} className="mr-2" />
                        {stopwatchMode && timerState.elapsedTime > 0 ? 'Save & Reset' : 'Reset'}
                      </button>
                    </div>
                  </div>
                </div>

              </>
            )}
            {activeTab === 'sessions' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Total Sessions</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Track your study progress and productivity</p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={loadSessionLogs}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center transition-colors"
                    >
                      <RotateCcw size={16} className="mr-2" />
                      Refresh
                    </button>
                    {sessionLogs.length > 0 && (
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
                <SessionLogs logs={sessionLogs} />
              </>
            )}
          </div>
        </div>

        {/* Clear All Confirmation Modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Clear All Sessions</h2>
              </div>
              
              <div className="p-6">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Are you sure you want to clear all session logs? This action cannot be undone.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  This will delete all {sessionLogs.length} session{sessionLogs.length !== 1 ? 's' : ''} from your history.
                </p>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={clearSessionLogs}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    Clear All
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

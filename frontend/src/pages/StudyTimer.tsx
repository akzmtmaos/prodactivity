import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Settings, Clock, Target, TrendingUp } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import PomodoroModeToggle from '../components/studytimer/PomodoroModeToggle';
import { useTimer } from '../context/TimerContext';

// SessionLogs component
interface SessionLogEntry {
  type: 'Study' | 'Break' | 'Long Break';
  start: Date;
  end: Date;
  duration: number; // in seconds
}

const SessionLogs: React.FC<{ logs: SessionLogEntry[] }> = ({ logs }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700 mt-8">
    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Session Logs</h2>
    {logs.length === 0 ? (
      <p className="text-gray-500 dark:text-gray-400">No sessions logged yet.</p>
    ) : (
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {logs.map((log, idx) => (
          <li key={idx} className="py-2 flex justify-between items-center">
            <span className="font-medium text-gray-800 dark:text-gray-200">{log.type}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {log.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {log.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.floor(log.duration / 60)}m {log.duration % 60}s
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const StudyTimer: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [greeting, setGreeting] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState<any>(null);
  const [sessionLogs, setSessionLogs] = useState<SessionLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'timer' | 'sessions'>('timer');
  const [pomodoroMode, setPomodoroMode] = useState(false);

  // Use the timer context
  const { 
    timerState, 
    startTimer, 
    pauseTimer, 
    resetTimer, 
    updateSettings 
  } = useTimer();

  // Pomodoro preset values
  const pomodoroPreset = {
    studyDuration: 25 * 60,
    breakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    sessionsUntilLongBreak: 4,
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
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Load session logs from localStorage
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
  }, []);

  // Initialize tempSettings when component mounts
  useEffect(() => {
    setTempSettings(timerState.settings);
  }, [timerState.settings]);

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

  const openSettings = () => {
    setTempSettings(timerState.settings);
    setShowSettings(true);
  };

  const handleSettingsChange = () => {
    if (tempSettings) {
      updateSettings(tempSettings);
      setShowSettings(false);
    }
  };

  const handlePomodoroToggle = (enabled: boolean) => {
    setPomodoroMode(enabled);
    if (enabled) {
      updateSettings(pomodoroPreset);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Study Timer
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
                          {formatTime(timerState.timeLeft)}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {timerState.isBreak ? 'Break Time' : 'Study Time'}
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

                {/* Timer Display */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-md border border-gray-200 dark:border-gray-700 mb-8">
                  <div className="text-center">
                    <div className="text-8xl font-bold text-gray-900 dark:text-white mb-8">
                      {formatTime(timerState.timeLeft)}
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
                        className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium flex items-center transition-colors"
                      >
                        <RotateCcw size={20} className="mr-2" />
                        Reset
                      </button>
                      <button
                        onClick={openSettings}
                        className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium flex items-center transition-colors"
                      >
                        <Settings size={20} className="mr-2" />
                        Settings
                      </button>
                    </div>
                  </div>
                </div>

                {/* Settings Modal */}
                {showSettings && tempSettings && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4">
                      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Timer Settings</h2>
                      </div>
                      
                      <div className="p-6">
                        {/* Pomodoro Mode Toggle inside settings */}
                        <div className="mb-6">
                          <PomodoroModeToggle enabled={pomodoroMode} onToggle={handlePomodoroToggle} />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Classic Pomodoro: 25 min study, 5 min break, 15 min long break, 4 sessions per long break.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Study Duration (minutes)
                            </label>
                            <input
                              type="number"
                              value={pomodoroMode ? timerState.settings.studyDuration / 60 : tempSettings.studyDuration / 60}
                              onChange={(e) => setTempSettings({
                                ...tempSettings,
                                studyDuration: parseInt(e.target.value) * 60
                              })}
                              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                              disabled={pomodoroMode}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Break Duration (minutes)
                            </label>
                            <input
                              type="number"
                              value={pomodoroMode ? timerState.settings.breakDuration / 60 : tempSettings.breakDuration / 60}
                              onChange={(e) => setTempSettings({
                                ...tempSettings,
                                breakDuration: parseInt(e.target.value) * 60
                              })}
                              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                              disabled={pomodoroMode}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Long Break Duration (minutes)
                            </label>
                            <input
                              type="number"
                              value={pomodoroMode ? timerState.settings.longBreakDuration / 60 : tempSettings.longBreakDuration / 60}
                              onChange={(e) => setTempSettings({
                                ...tempSettings,
                                longBreakDuration: parseInt(e.target.value) * 60
                              })}
                              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                              disabled={pomodoroMode}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Sessions Until Long Break
                            </label>
                            <input
                              type="number"
                              value={pomodoroMode ? timerState.settings.sessionsUntilLongBreak : tempSettings.sessionsUntilLongBreak}
                              onChange={(e) => setTempSettings({
                                ...tempSettings,
                                sessionsUntilLongBreak: parseInt(e.target.value)
                              })}
                              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                              disabled={pomodoroMode}
                            />
                          </div>
                        </div>
                        
                        <div className="mt-6 flex justify-end space-x-3">
                          <button
                            onClick={() => setShowSettings(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSettingsChange}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            disabled={pomodoroMode}
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            {activeTab === 'sessions' && (
              <SessionLogs logs={sessionLogs} />
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default StudyTimer;

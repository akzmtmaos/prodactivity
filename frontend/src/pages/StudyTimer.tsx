import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Settings, Clock, Target, TrendingUp } from 'lucide-react';
import PageLayout from '../components/PageLayout';

interface TimerSettings {
  studyDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
}

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
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<TimerSettings>({
    studyDuration: 25 * 60, // 25 minutes in seconds
    breakDuration: 5 * 60,  // 5 minutes in seconds
    longBreakDuration: 15 * 60, // 15 minutes in seconds
    sessionsUntilLongBreak: 4
  });
  const [sessionLogs, setSessionLogs] = useState<SessionLogEntry[]>([]);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'timer' | 'sessions'>('timer');

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

    // Initialize timer
    setTimeLeft(settings.studyDuration);
    setSessionStart(new Date());
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const handleTimerComplete = () => {
    // Log the session
    if (sessionStart) {
      const end = new Date();
      const duration = (isBreak
        ? (isBreak && timeLeft === 0 ? settings.breakDuration : settings.longBreakDuration)
        : settings.studyDuration);
      setSessionLogs((prev) => [
        ...prev,
        {
          type: isBreak
            ? (sessionsCompleted + 1 >= settings.sessionsUntilLongBreak ? 'Long Break' : 'Break')
            : 'Study',
          start: sessionStart,
          end,
          duration,
        },
      ]);
    }

    if (!isBreak) {
      // Study session completed
      setSessionsCompleted((prev) => prev + 1);
      const shouldTakeLongBreak = sessionsCompleted + 1 >= settings.sessionsUntilLongBreak;
      setTimeLeft(shouldTakeLongBreak ? settings.longBreakDuration : settings.breakDuration);
      setIsBreak(true);
      setSessionStart(new Date());
    } else {
      // Break completed
      setTimeLeft(settings.studyDuration);
      setIsBreak(false);
      setSessionStart(new Date());
      if (sessionsCompleted >= settings.sessionsUntilLongBreak) {
        setSessionsCompleted(0);
      }
    }
    setIsRunning(false);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(isBreak ? settings.breakDuration : settings.studyDuration);
    setSessionStart(new Date());
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSettingsChange = (newSettings: TimerSettings) => {
    setSettings(newSettings);
    setTimeLeft(isBreak ? newSettings.breakDuration : newSettings.studyDuration);
    setShowSettings(false);
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

        {/* Tabs styled like Schedule (pill buttons) */}
        <div>
          <div className="flex space-x-2 mt-4">
            <button
              onClick={() => setActiveTab('timer')}
              className={`px-4 py-2 font-medium focus:outline-none transition-colors rounded-t-md ${activeTab === 'timer' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              Timer
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-4 py-2 font-medium focus:outline-none transition-colors rounded-t-md ${activeTab === 'sessions' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              Sessions
            </button>
          </div>
          <hr className="border-t border-gray-300 dark:border-gray-700 mb-6" />
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
                          {formatTime(timeLeft)}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {isBreak ? 'Break Time' : 'Study Time'}
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
                          {sessionsCompleted}
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
                          {settings.sessionsUntilLongBreak - (sessionsCompleted % settings.sessionsUntilLongBreak)}
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
                      {formatTime(timeLeft)}
                    </div>
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={toggleTimer}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center transition-colors"
                      >
                        {isRunning ? (
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
                        onClick={() => setShowSettings(true)}
                        className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium flex items-center transition-colors"
                      >
                        <Settings size={20} className="mr-2" />
                        Settings
                      </button>
                    </div>
                  </div>
                </div>

                {/* Settings Modal */}
                {showSettings && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 mx-4">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        Timer Settings
                      </h2>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Study Duration (minutes)
                          </label>
                          <input
                            type="number"
                            value={settings.studyDuration / 60}
                            onChange={(e) => setSettings({
                              ...settings,
                              studyDuration: parseInt(e.target.value) * 60
                            })}
                            className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Break Duration (minutes)
                          </label>
                          <input
                            type="number"
                            value={settings.breakDuration / 60}
                            onChange={(e) => setSettings({
                              ...settings,
                              breakDuration: parseInt(e.target.value) * 60
                            })}
                            className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Long Break Duration (minutes)
                          </label>
                          <input
                            type="number"
                            value={settings.longBreakDuration / 60}
                            onChange={(e) => setSettings({
                              ...settings,
                              longBreakDuration: parseInt(e.target.value) * 60
                            })}
                            className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Sessions Until Long Break
                          </label>
                          <input
                            type="number"
                            value={settings.sessionsUntilLongBreak}
                            onChange={(e) => setSettings({
                              ...settings,
                              sessionsUntilLongBreak: parseInt(e.target.value)
                            })}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                          onClick={() => handleSettingsChange(settings)}
                          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Save Changes
                        </button>
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

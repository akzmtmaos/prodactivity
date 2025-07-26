import React, { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import StatsCards from '../components/progress/StatsCards';
import Achievements from '../components/progress/Achievements';
// New components
import LevelProgressRing from '../components/progress/LevelProgressRing';
import StreaksCalendar from '../components/progress/StreaksCalendar';
import MainChart from '../components/progress/MainChart';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';

const TABS = ['Daily', 'Weekly', 'Monthly'];

const Progress = () => {
  const [user, setUser] = useState<any | null>(null);
  const [greeting, setGreeting] = useState('');
  const [progressView, setProgressView] = useState('Daily');
  const [stats, setStats] = useState<any>({
    totalTasksCompleted: 0,
    totalStudyTime: 0,
    averageProductivity: 0,
    streak: 0
  });
  const [userLevel, setUserLevel] = useState({ currentLevel: 1, currentXP: 0, xpToNextLevel: 1000 });

  // Add state for streakData and chartData
  const [streakData, setStreakData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any>({});
  // Productivity status state
  const [productivity, setProductivity] = useState<{ status: string; completion_rate: number; total_tasks: number; completed_tasks: number } | null>(null);
  const [yesterdayProductivity, setYesterdayProductivity] = useState<{ status: string; completion_rate: number; total_tasks: number; completed_tasks: number } | null>(null);
  const [todaysProductivity, setTodaysProductivity] = useState<any | null>(null);

  // Add state for selected date/period
  const [selectedDate, setSelectedDate] = useState(new Date());
  // Add state for productivity logs list
  const [prodLogs, setProdLogs] = useState<any[]>([]);

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

    // Fetch stats, level, streak, and chart data
    (async () => {
      const statsData = await fetchUserStats();
      setStats(statsData);
      const levelData = await fetchUserLevel();
      setUserLevel(levelData);
      const streakData = await fetchStreakData();
      setStreakData(streakData);
      const chartData = await fetchChartData(progressView);
      setChartData(chartData);
    })();
  }, []);

  // Fetch today's productivity (daily) for the bar below XP bar
  useEffect(() => {
    const fetchTodaysProductivity = async () => {
      try {
        const headers = getAuthHeaders();
        const todayStr = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/progress/productivity/?view=daily&date=${todayStr}`, {
          ...(headers && { headers })
        });
        if (!res.ok) throw new Error('Failed to fetch today productivity');
        setTodaysProductivity(await res.json());
      } catch (e) {
        setTodaysProductivity(null);
      }
    };
    fetchTodaysProductivity();
  }, []);

  // Fetch productivity status when progressView changes
  useEffect(() => {
    const fetchProductivity = async () => {
      try {
        const headers = getAuthHeaders();
        let url: string | undefined;
        if (progressView === 'Daily') {
          const todayStr = selectedDate.toISOString().split('T')[0];
          url = `/api/progress/productivity/?view=daily&date=${todayStr}`;
        } else if (progressView === 'Weekly') {
          const monday = new Date(selectedDate);
          monday.setDate(monday.getDate() - monday.getDay() + 1);
          const weekStr = monday.toISOString().split('T')[0];
          url = `/api/progress/productivity/?view=weekly&date=${weekStr}`;
        } else if (progressView === 'Monthly') {
          const firstOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
          const monthStr = firstOfMonth.toISOString().split('T')[0];
          url = `/api/progress/productivity/?view=monthly&date=${monthStr}`;
        } else {
          throw new Error('Invalid progressView');
        }
        const res = await fetch(url, {
          ...(headers && { headers })
        });
        if (res.status === 401) {
          handle401();
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch productivity');
        setProductivity(await res.json());
        // Fetch yesterday (only for daily view)
        if (progressView === 'Daily') {
          const yesterday = new Date(selectedDate);
          yesterday.setDate(yesterday.getDate() - 1);
          const yDate = yesterday.toISOString().split('T')[0];
          const yRes = await fetch(`/api/progress/productivity/?view=daily&date=${yDate}`, {
            ...(headers && { headers })
          });
          if (yRes.status === 401) {
            handle401();
            return;
          }
          if (!yRes.ok) throw new Error('Failed to fetch yesterday productivity');
          setYesterdayProductivity(await yRes.json());
        } else {
          setYesterdayProductivity(null);
        }
      } catch (e) {
        setProductivity(null);
        setYesterdayProductivity(null);
      }
    };
    fetchProductivity();
  }, [progressView, selectedDate]);

  // Fetch productivity logs for the selected period
  useEffect(() => {
    const fetchProdLogs = async () => {
      try {
        const headers = getAuthHeaders();
        let url: string | undefined;
        if (progressView === 'Daily') {
          const monthStr = selectedDate.toISOString().split('T')[0];
          url = `/api/progress/productivity_logs/?view=daily&date=${monthStr}`;
        } else if (progressView === 'Weekly') {
          const yearStr = selectedDate.getFullYear();
          url = `/api/progress/productivity_logs/?view=weekly&date=${yearStr}-01-01`;
        } else if (progressView === 'Monthly') {
          const yearStr = selectedDate.getFullYear();
          url = `/api/progress/productivity_logs/?view=monthly&date=${yearStr}-01-01`;
        } else {
          throw new Error('Invalid progressView');
        }
        const res = await fetch(url, { ...(headers && { headers }) });
        if (!res.ok) throw new Error('Failed to fetch productivity logs');
        setProdLogs(await res.json());
      } catch (e) {
        setProdLogs([]);
      }
    };
    fetchProdLogs();
  }, [progressView, selectedDate]);

  // Navigation handlers
  const handlePrev = () => {
    const today = new Date();
    let prevDate: Date;
    
    if (progressView === 'Daily') {
      prevDate = subDays(selectedDate, 1);
      // Don't allow going to future dates
      if (prevDate > today) return;
      setSelectedDate(prevDate);
    } else if (progressView === 'Weekly') {
      prevDate = subWeeks(selectedDate, 1);
      if (prevDate > today) return;
      setSelectedDate(prevDate);
    } else if (progressView === 'Monthly') {
      prevDate = subMonths(selectedDate, 1);
      if (prevDate > today) return;
      setSelectedDate(prevDate);
    }
  };
  const handleNext = () => {
    const today = new Date();
    let nextDate: Date;
    if (progressView === 'Daily') {
      nextDate = addMonths(selectedDate, 1);
      // Only allow if nextDate is not after today
      if (nextDate > today) return;
      setSelectedDate(nextDate);
    } else if (progressView === 'Weekly') {
      nextDate = addWeeks(selectedDate, 1);
      if (nextDate > today) return;
      setSelectedDate(nextDate);
    } else if (progressView === 'Monthly') {
      nextDate = addMonths(selectedDate, 1);
      if (nextDate > today) return;
      setSelectedDate(nextDate);
    }
  };

  // Determine if next button should be disabled
  const isNextDisabled = (() => {
    const today = new Date();
    if (progressView === 'Daily') {
      const nextDate = addDays(selectedDate, 1);
      return nextDate > today;
    }
    if (progressView === 'Weekly') {
      const nextDate = addWeeks(selectedDate, 1);
      return nextDate > today;
    }
    if (progressView === 'Monthly') {
      const nextDate = addMonths(selectedDate, 1);
      return nextDate > today;
    }
    return false;
  })();

  // Determine if prev button should be disabled
  const isPrevDisabled = (() => {
    const today = new Date();
    const joined = user && user.date_joined ? new Date(user.date_joined) : today;
    const earliestAllowed = joined > today ? joined : today;
    
    if (progressView === 'Daily') {
      const prevDate = subDays(selectedDate, 1);
      return prevDate < earliestAllowed;
    }
    if (progressView === 'Weekly') {
      const prevDate = subWeeks(selectedDate, 1);
      return prevDate < earliestAllowed;
    }
    if (progressView === 'Monthly') {
      const prevDate = subMonths(selectedDate, 1);
      return prevDate < earliestAllowed;
    }
    return false;
  })();
  // Format date display
  function getDateDisplay() {
    if (progressView === 'Daily') {
      // Show month and year of the selected date
      return format(selectedDate, 'MMMM yyyy');
    }
    if (progressView === 'Weekly' || progressView === 'Monthly') {
      // Show only the year
      return format(selectedDate, 'yyyy');
    }
    return '';
  }
  // Reset selectedDate when tab changes
  useEffect(() => {
    setSelectedDate(new Date());
  }, [progressView]);

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Progress bar for LevelProgress
  const progressPercentage = Math.min(userLevel.currentXP / userLevel.xpToNextLevel, 1) * 100;

  // Helper to get formatted date for Daily view
  function getFormattedDate(offset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Helper to get color class for productivity status
  function getProductivityColor(status: string) {
    switch (status) {
      case 'Highly Productive':
        return 'text-green-700 dark:text-green-400';
      case 'Productive':
        return 'text-green-600 dark:text-green-300';
      case 'Needs Improvement':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'Low Productivity':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-300';
    }
  }

  return (
    <PageLayout>
      <div className="space-y-6 relative">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Progress
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
            Track your productivity and achievements
          </p>
        </div>

        {/* XP Bar, Today's Productivity Bar (stacked), and Streaks Calendar */}
        <div className="flex flex-col md:flex-row md:space-x-8 items-start justify-center mb-4">
          {/* Left column: LevelProgressRing, XP Bar, Today's Productivity Bar */}
          <div className="flex flex-col w-full md:w-1/2 mb-6 md:mb-0">
            {/* LevelProgressRing */}
            <div className="flex justify-center w-full mb-4">
              <LevelProgressRing
                currentLevel={userLevel.currentLevel}
                currentXP={userLevel.currentXP}
                xpToNextLevel={userLevel.xpToNextLevel}
                size={200}
              />
            </div>
            {/* Level XP Bar */}
            <div className="w-full max-w-2xl mx-auto mt-2 mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-200">Level XP</span>
                <span className="text-sm font-bold">{userLevel.currentXP} / {userLevel.xpToNextLevel} XP</span>
              </div>
              <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
            {/* Today's Productivity Bar (in its own container, always visible, uses todaysProductivity) */}
            <div className="w-full max-w-2xl mx-auto mt-2 mb-4 bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-400 dark:border-indigo-500 rounded-lg shadow-md p-4 flex flex-col items-start">
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-base font-semibold text-indigo-700 dark:text-indigo-200">Today's Productivity</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Status:</span>
                <span className="text-sm font-bold">
                  {(todaysProductivity && todaysProductivity.status !== undefined) ? todaysProductivity.status : 'No Tasks'}
                  {' '}
                  ({(todaysProductivity && todaysProductivity.completion_rate !== undefined) ? todaysProductivity.completion_rate : 0}%)
                </span>
              </div>
              <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    todaysProductivity && todaysProductivity.completion_rate >= 90 ? 'bg-green-600 dark:bg-green-400' :
                    todaysProductivity && todaysProductivity.completion_rate >= 70 ? 'bg-green-500 dark:bg-green-300' :
                    todaysProductivity && todaysProductivity.completion_rate >= 40 ? 'bg-yellow-500 dark:bg-yellow-400' :
                    todaysProductivity && todaysProductivity.completion_rate > 0 ? 'bg-red-500 dark:bg-red-400' :
                    'bg-gray-300 dark:bg-gray-700'
                  }`}
                  style={{ width: `${(todaysProductivity && todaysProductivity.completion_rate !== undefined) ? Math.min(todaysProductivity.completion_rate, 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
          {/* Right column: Streaks Calendar */}
          <div className="w-full md:w-1/2 flex justify-center">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 w-full max-w-md flex flex-col items-center">
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Streaks</h3>
              <StreaksCalendar streakData={streakData} />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Tabs - below stats cards */}
        <div className="flex space-x-2 mb-6 justify-center">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`min-w-[110px] px-4 py-2 rounded-full font-semibold transition-colors ${progressView === tab ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
              onClick={() => setProgressView(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Productivity Scale History Container */}
        <div className="w-full mb-4">
          <div className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 rounded-xl w-full flex flex-col" style={{ height: 440 }}>
            <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-t-xl px-12 py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-base font-semibold text-gray-900 dark:text-white">Productivity Scale History</span>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handlePrev} 
                  className={`px-2 py-1 rounded ${isPrevDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  disabled={isPrevDisabled}
                >
                  &#60;
                </button>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{getDateDisplay()}</span>
                <button
                  onClick={handleNext}
                  className={`px-2 py-1 rounded ${isNextDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  disabled={isNextDisabled}
                >
                  &#62;
                </button>
              </div>
            </div>
            {/* Scrollable list of productivity logs */}
            <div className="flex-1 overflow-y-scroll px-12 py-4 space-y-3">
              {progressView === 'Daily' && (
                <>
                  {/* Today's productivity as topmost entry in history (only for today) */}
                  <div className="flex items-center bg-indigo-100 dark:bg-indigo-900/40 border-2 border-indigo-400 dark:border-indigo-500 rounded-lg px-6 py-4 shadow-md">
                    <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-200 min-w-[120px] text-left">
                      {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      <span className="ml-2 px-2 py-0.5 bg-indigo-200 dark:bg-indigo-700 text-xs rounded-full font-bold">Today</span>
                    </span>
                    <div className="flex-1 flex justify-center items-center px-6">
                      <div className="w-full max-w-md flex items-center justify-center">
                        <div className="w-full h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              productivity && productivity.completion_rate >= 90 ? 'bg-green-600 dark:bg-green-400' :
                              productivity && productivity.completion_rate >= 70 ? 'bg-green-500 dark:bg-green-300' :
                              productivity && productivity.completion_rate >= 40 ? 'bg-yellow-500 dark:bg-yellow-400' :
                              productivity && productivity.completion_rate > 0 ? 'bg-red-500 dark:bg-red-400' :
                              'bg-gray-300 dark:bg-gray-700'
                            }`}
                            style={{ width: `${(productivity && productivity.completion_rate !== undefined) ? Math.min(productivity.completion_rate, 100) : 0}%` }}
                          />
                        </div>
                        <span className="ml-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{(productivity && productivity.completion_rate !== undefined) ? productivity.completion_rate : 0}%</span>
                      </div>
                    </div>
                    <span className={`text-base font-bold ${getProductivityColor(productivity && productivity.status ? productivity.status : 'No Tasks')} min-w-[120px] text-right`}>
                      {(productivity && productivity.status !== undefined) ? productivity.status : 'No Tasks'}
                    </span>
                  </div>
                  {/* Historical logs, skipping today, filtering by account creation and today */}
                  {prodLogs
                    .filter(item => {
                      const dayDate = item.date ? new Date(item.date) : null;
                      if (!dayDate || isNaN(dayDate.getTime())) return false;
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const joined = user && user.date_joined ? new Date(user.date_joined) : null;
                      if (!joined) return false;
                      joined.setHours(0,0,0,0);
                      // Only show logs between joined and today (inclusive), skip today (already shown above)
                      return dayDate >= joined && dayDate < today;
                    })
                    .map((item, idx) => {
                      const dayDate = item.date ? new Date(item.date) : null;
                      if (!dayDate || isNaN(dayDate.getTime())) return null;
                      return (
                        <div key={item.date} className="flex items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-6 py-4">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white min-w-[120px] text-left">{format(dayDate, 'MMMM d, yyyy')}</span>
                          <div className="flex-1 flex justify-center items-center px-6">
                            <div className="w-full max-w-md flex items-center justify-center">
                              <div className="w-full h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    item.log.completion_rate >= 90 ? 'bg-green-600 dark:bg-green-400' :
                                    item.log.completion_rate >= 70 ? 'bg-green-500 dark:bg-green-300' :
                                    item.log.completion_rate >= 40 ? 'bg-yellow-500 dark:bg-yellow-400' :
                                    'bg-red-500 dark:bg-red-400'
                                  }`}
                                  style={{ width: `${Math.min(item.log.completion_rate, 100)}%` }}
                                />
                              </div>
                              <span className="ml-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{item.log.completion_rate}%</span>
                            </div>
                          </div>
                          <span className={`text-base font-bold ${getProductivityColor(item.log.status)} min-w-[120px] text-right`}>{item.log.status}</span>
                        </div>
                      );
                    })}
                </>
              )}
              {progressView === 'Weekly' && prodLogs.map((item, idx) => {
                const weekStart = item.week_start ? new Date(item.week_start) : null;
                const weekEnd = item.week_end ? new Date(item.week_end) : null;
                if (!weekStart || isNaN(weekStart.getTime()) || !weekEnd || isNaN(weekEnd.getTime())) return null;
                return (
                  <div key={item.week_start} className="flex items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-6 py-4">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white min-w-[120px] text-left">{format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}</span>
                    <div className="flex-1 flex justify-center items-center px-6">
                      <div className="w-full max-w-md flex items-center justify-center">
                        <div className="w-full h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              item.log.completion_rate >= 90 ? 'bg-green-600 dark:bg-green-400' :
                              item.log.completion_rate >= 70 ? 'bg-green-500 dark:bg-green-300' :
                              item.log.completion_rate >= 40 ? 'bg-yellow-500 dark:bg-yellow-400' :
                              'bg-red-500 dark:bg-red-400'
                            }`}
                            style={{ width: `${Math.min(item.log.completion_rate, 100)}%` }}
                          />
                        </div>
                        <span className="ml-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{item.log.completion_rate}%</span>
                      </div>
                    </div>
                    <span className={`text-base font-bold ${getProductivityColor(item.log.status)} min-w-[120px] text-right`}>{item.log.status}</span>
                  </div>
                );
              })}
              {progressView === 'Monthly' && prodLogs.map((item, idx) => {
                if (!item.month || isNaN(item.month) || item.month < 1 || item.month > 12) return null;
                const monthDate = new Date(selectedDate.getFullYear(), item.month - 1, 1);
                if (isNaN(monthDate.getTime())) return null;
                return (
                  <div key={item.month} className="flex items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-6 py-4">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white min-w-[120px] text-left">{format(monthDate, 'MMMM')}</span>
                    <div className="flex-1 flex justify-center items-center px-6">
                      <div className="w-full max-w-md flex items-center justify-center">
                        <div className="w-full h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              item.log.completion_rate >= 90 ? 'bg-green-600 dark:bg-green-400' :
                              item.log.completion_rate >= 70 ? 'bg-green-500 dark:bg-green-300' :
                              item.log.completion_rate >= 40 ? 'bg-yellow-500 dark:bg-yellow-400' :
                              'bg-red-500 dark:bg-red-400'
                            }`}
                            style={{ width: `${Math.min(item.log.completion_rate, 100)}%` }}
                          />
                        </div>
                        <span className="ml-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{item.log.completion_rate}%</span>
                      </div>
                    </div>
                    <span className={`text-base font-bold ${getProductivityColor(item.log.status)} min-w-[120px] text-right`}>{item.log.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Chart Placeholder */}
        <MainChart view={progressView} data={chartData} />

        {/* Achievements */}
        {/* <Achievements stats={stats} /> */}
      </div>
    </PageLayout>
  );
};

// Helper to get JWT token from localStorage
function getAuthHeaders(): HeadersInit | undefined {
  const token = localStorage.getItem('accessToken');
  return token ? { 'Authorization': `Bearer ${token}` } : undefined;
}

function handle401() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

async function fetchUserStats() {
  try {
    const headers = getAuthHeaders();
    const res = await fetch('/api/progress/stats/', {
      ...(headers && { headers })
    });
    if (res.status === 401) {
      handle401();
      return;
    }
    if (!res.ok) throw new Error('Failed to fetch stats');
    return await res.json();
  } catch (e) {
    return { totalTasksCompleted: 0, totalStudyTime: 0, averageProductivity: 0, streak: 0 };
  }
}

async function fetchUserLevel() {
  try {
    const headers = getAuthHeaders();
    const res = await fetch('/api/progress/level/', {
      ...(headers && { headers })
    });
    if (res.status === 401) {
      handle401();
      return;
    }
    if (!res.ok) throw new Error('Failed to fetch level');
    return await res.json();
  } catch (e) {
    return { currentLevel: 1, currentXP: 0, xpToNextLevel: 1000 };
  }
}

async function fetchStreakData() {
  try {
    const headers = getAuthHeaders();
    const res = await fetch('/api/progress/streaks/', {
      ...(headers && { headers })
    });
    if (res.status === 401) {
      handle401();
      return;
    }
    if (!res.ok) throw new Error('Failed to fetch streaks');
    return await res.json();
  } catch (e) {
    return [];
  }
}

async function fetchChartData(view: string) {
  try {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/progress/chart/?view=${view}`, {
      ...(headers && { headers })
    });
    if (res.status === 401) {
      handle401();
      return;
    }
    if (!res.ok) throw new Error('Failed to fetch chart data');
    return await res.json();
  } catch (e) {
    return {};
  }
}

export default Progress;
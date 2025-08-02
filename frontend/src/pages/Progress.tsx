import React, { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import StatsCards from '../components/progress/StatsCards';
import MainChart from '../components/progress/MainChart';
// Extracted components
import ProgressHeader from '../components/progress/ProgressHeader';
import ProgressOverview from '../components/progress/ProgressOverview';
import ProgressTabs from '../components/progress/ProgressTabs';
import ProductivityHistory from '../components/progress/ProductivityHistory';
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
  
  // Debug: Track selectedDate changes
  useEffect(() => {
    console.log('selectedDate changed to:', selectedDate.toISOString());
  }, [selectedDate]);
  // Add state for productivity logs list
  const [prodLogs, setProdLogs] = useState<any[]>([]);
  
  // Debug: Track prodLogs changes
  useEffect(() => {
    console.log('prodLogs changed to:', prodLogs.length, 'items');
  }, [prodLogs]);

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
        // Add cache-busting parameter to ensure fresh data
        const res = await fetch(`/api/progress/productivity/?view=daily&date=${todayStr}&t=${Date.now()}`, {
          ...(headers && { headers })
        });
        if (!res.ok) throw new Error('Failed to fetch today productivity');
        const data = await res.json();
        console.log('Today\'s productivity data:', data); // Debug log
        setTodaysProductivity(data);
      } catch (e) {
        console.error('Error fetching today productivity:', e);
        setTodaysProductivity(null);
      }
    };
    fetchTodaysProductivity();
  }, []);

  // Manual refresh function for debugging
  const refreshProductivity = async () => {
    try {
      const headers = getAuthHeaders();
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/progress/productivity/?view=daily&date=${todayStr}&t=${Date.now()}`, {
        ...(headers && { headers })
      });
      if (!res.ok) throw new Error('Failed to fetch today productivity');
      const data = await res.json();
      console.log('Refreshed productivity data:', data);
      setTodaysProductivity(data);
    } catch (e) {
      console.error('Error refreshing productivity:', e);
    }
  };

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
          // For daily view, fetch logs for the specific month being viewed
          const year = selectedDate.getFullYear();
          const month = selectedDate.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
          const monthStr = `${year}-${month.toString().padStart(2, '0')}-01`;
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
        console.log('Fetching productivity logs from:', url, 'for selectedDate:', selectedDate.toISOString()); // Debug log
        const res = await fetch(url, { ...(headers && { headers }) });
        if (!res.ok) throw new Error('Failed to fetch productivity logs');
        const data = await res.json();
        console.log('Received productivity logs:', data); // Debug log
        console.log('Total items received:', data.length); // Debug log
        console.log('Date range:', data.length > 0 ? `${data[0]?.date} to ${data[data.length-1]?.date}` : 'No data'); // Debug log
        console.log('Setting prodLogs to:', data); // Debug log
        setProdLogs(data);
      } catch (e) {
        console.error('Error fetching productivity logs:', e);
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
      prevDate = subMonths(selectedDate, 1);
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
      const nextDate = addMonths(selectedDate, 1);
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
    // For now, allow navigation to any historical data
    // We can add user join date restriction later if needed
    const earliestAllowed = new Date('2020-01-01'); // Allow going back to 2020
    
    if (progressView === 'Daily') {
      const prevDate = subMonths(selectedDate, 1);
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
  // Note: Removed automatic selectedDate reset to prevent data disappearing
  // The selectedDate will now persist when navigating between months

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
        <ProgressHeader greeting={greeting} username={user?.username || 'User'} />

        {/* Overview Section */}
        <ProgressOverview
          userLevel={userLevel}
          todaysProductivity={todaysProductivity}
          streakData={streakData}
          refreshProductivity={refreshProductivity}
        />

        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Tabs */}
        <ProgressTabs
          progressView={progressView}
          setProgressView={setProgressView}
          tabs={TABS}
        />

        {/* Productivity History */}
        <ProductivityHistory
          progressView={progressView}
          productivity={productivity}
          prodLogs={prodLogs}
          selectedDate={selectedDate}
          handlePrev={handlePrev}
          handleNext={handleNext}
          isPrevDisabled={isPrevDisabled}
          isNextDisabled={isNextDisabled}
          getDateDisplay={getDateDisplay}
          getProductivityColor={getProductivityColor}
        />

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
import React, { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import StatsCards from '../components/progress/StatsCards';
import MainChart from '../components/progress/MainChart';
// Extracted components
import ProgressHeader from '../components/progress/ProgressHeader';
import ProgressOverview from '../components/progress/ProgressOverview';
import ProgressTabs from '../components/progress/ProgressTabs';
import ProductivityHistory from '../components/progress/ProductivityHistory';
import Achievements from '../components/progress/Achievements';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { getTodayDate } from '../utils/dateUtils';
import { supabase } from '../lib/supabase';

const TABS = ['Daily', 'Weekly', 'Monthly'];

// Helper function to aggregate daily logs into weekly data
function aggregateDailyToWeekly(dailyLogs: any[]) {
  // Early return if no data
  if (!dailyLogs || dailyLogs.length === 0) {
    return [];
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔄 Starting weekly aggregation with', dailyLogs.length, 'daily logs');
  }
  
  const weeklyData: { [key: string]: any } = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  dailyLogs.forEach(log => {
    const date = new Date(log.period_start);
    
    // Skip future dates
    if (date > today) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Skipping future date:', log.period_start);
      }
      return;
    }
    
    // Get the Monday of the week (week starts on Monday)
    // date.getDay() returns 0 for Sunday, 1 for Monday, etc.
    // To get Monday: if Sunday (0), go back 6 days; if Monday (1), stay; etc.
    const daysSinceMonday = date.getDay() === 0 ? 6 : date.getDay() - 1;
    const monday = new Date(date);
    monday.setDate(date.getDate() - daysSinceMonday);
    const weekKey = monday.toISOString().split('T')[0];
    
    // Skip future weeks (where Monday is in the future)
    if (monday > today) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Skipping future week starting:', weekKey);
      }
      return;
    }
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        period_start: weekKey,
        period_end: new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_type: 'weekly',
        user_id: log.user_id,
        total_tasks: 0,
        completed_tasks: 0,
        completion_rate: 0,
        status: 'Low Productive',
        logged_at: log.logged_at
      };
    }
    
    weeklyData[weekKey].total_tasks += log.total_tasks || 0;
    weeklyData[weekKey].completed_tasks += log.completed_tasks || 0;
  });
  
  // Calculate completion rates and statuses for each week using daily average method
  Object.values(weeklyData).forEach((week: any) => {
    // Get all daily logs for this week to calculate daily average
    const weekStart = new Date(week.period_start);
    const weekEnd = new Date(week.period_end);
    
    // Check if this is the current week
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isCurrentWeek = weekStart <= today && weekEnd >= today;
    
    const dailyLogsForWeek = dailyLogs.filter(log => {
      const logDate = new Date(log.period_start);
      return logDate >= weekStart && logDate <= weekEnd;
    });
    
    if (dailyLogsForWeek.length > 0) {
      // For current week, we need to include all days up to today, not just days with data
      let completionRates: number[] = [];
      
      if (isCurrentWeek) {
        // For current week, generate completion rates for ALL days in the week (same as WeeklyBreakdownModal)
        // The WeeklyBreakdownModal includes all days from startDate to endDate, including future days
        const currentDate = new Date(weekStart);
        while (currentDate <= weekEnd) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const dayLog = dailyLogsForWeek.find(log => log.period_start === dateStr);
          completionRates.push(dayLog ? (dayLog.completion_rate || 0) : 0);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        // For past weeks, use the existing data (all days should have data)
        completionRates = dailyLogsForWeek.map(log => log.completion_rate || 0);
      }
      
      // Calculate average of daily completion rates (same as WeeklyBreakdownModal)
      const totalDailyRate = completionRates.reduce((sum, rate) => sum + rate, 0);
      week.completion_rate = Math.round(totalDailyRate / completionRates.length);
      
      if (week.completion_rate >= 80) {
        week.status = 'Highly Productive';
      } else if (week.completion_rate >= 60) {
        week.status = 'Productive';
      } else if (week.completion_rate >= 40) {
        week.status = 'Moderately Productive';
      } else {
        week.status = 'Low Productive';
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 Week ${week.period_start}: ${completionRates.length} days (current: ${isCurrentWeek}), rates: ${completionRates}, average: ${week.completion_rate}%`);
        console.log(`🔄 Week details:`, {
          weekStart: week.period_start,
          weekEnd: week.period_end,
          isCurrentWeek,
          today: today.toISOString().split('T')[0],
          completionRates,
          average: week.completion_rate
        });
      }
    } else {
      week.completion_rate = 0;
      week.status = 'Low Productive';
    }
  });
  
  const result = Object.values(weeklyData).sort((a: any, b: any) => 
    new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
  );
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔄 Weekly aggregation result:', result);
  }
  
  return result;
}

// Helper function to aggregate daily logs into monthly data
function aggregateDailyToMonthly(dailyLogs: any[]) {
  // Early return if no data
  if (!dailyLogs || dailyLogs.length === 0) {
    return [];
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔄 Starting monthly aggregation with', dailyLogs.length, 'daily logs');
  }
  
  const monthlyData: { [key: string]: any } = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  dailyLogs.forEach(log => {
    const date = new Date(log.period_start);
    
    // Skip future dates
    if (date > today) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Skipping future date in monthly aggregation:', log.period_start);
      }
      return;
    }
    
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-01`;
    
    // Skip future months (where the month is in the future)
    const monthStart = new Date(monthKey);
    if (monthStart > today) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Skipping future month:', monthKey);
      }
      return;
    }
    
    if (!monthlyData[monthKey]) {
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      monthlyData[monthKey] = {
        period_start: monthKey,
        period_end: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`,
        period_type: 'monthly',
        user_id: log.user_id,
        total_tasks: 0,
        completed_tasks: 0,
        completion_rate: 0,
        status: 'Low Productive',
        logged_at: log.logged_at
      };
    }
    
    monthlyData[monthKey].total_tasks += log.total_tasks || 0;
    monthlyData[monthKey].completed_tasks += log.completed_tasks || 0;
  });
  
  // Calculate completion rates and statuses for each month using daily average method
  Object.values(monthlyData).forEach((month: any) => {
    // Get all daily logs for this month to calculate daily average
    const monthStart = new Date(month.period_start);
    const monthEnd = new Date(month.period_end);
    
    const dailyLogsForMonth = dailyLogs.filter(log => {
      const logDate = new Date(log.period_start);
      return logDate >= monthStart && logDate <= monthEnd;
    });
    
    if (dailyLogsForMonth.length > 0) {
      // Calculate average of daily completion rates (same as WeeklyBreakdownModal)
      const totalDailyRate = dailyLogsForMonth.reduce((sum, log) => sum + (log.completion_rate || 0), 0);
      month.completion_rate = Math.round(totalDailyRate / dailyLogsForMonth.length);
      
      if (month.completion_rate >= 80) {
        month.status = 'Highly Productive';
      } else if (month.completion_rate >= 60) {
        month.status = 'Productive';
      } else if (month.completion_rate >= 40) {
        month.status = 'Moderately Productive';
      } else {
        month.status = 'Low Productive';
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 Month ${month.period_start}: ${dailyLogsForMonth.length} days, rates: ${dailyLogsForMonth.map(l => l.completion_rate)}, average: ${month.completion_rate}%`);
      }
    } else {
      month.completion_rate = 0;
      month.status = 'Low Productive';
    }
  });
  
  const result = Object.values(monthlyData).sort((a: any, b: any) => 
    new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
  );
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔄 Monthly aggregation result:', result);
  }
  
  return result;
}

const Progress = () => {
  const [user, setUser] = useState<any | null>(null);
  const [greeting, setGreeting] = useState('');
  const [progressView, setProgressView] = useState('Daily');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [refreshKey, setRefreshKey] = useState(0);

  // Add state for selected date/period
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Debug: Track selectedDate changes (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('selectedDate changed to:', selectedDate.toISOString());
    }
  }, [selectedDate]);
  
  // Auto-set selectedDate to 2025 when switching to Weekly/Monthly tabs (where data exists)
  useEffect(() => {
    if (progressView === 'Weekly' || progressView === 'Monthly') {
      const currentYear = selectedDate.getFullYear();
      if (currentYear !== 2025) {
        console.log('📅 Auto-setting selectedDate to 2025 for', progressView, 'view');
        setSelectedDate(new Date(2025, 8, 1)); // Set to September 2025 (month 8 = September)
      }
    }
  }, [progressView]); // Remove selectedDate from dependencies to avoid infinite loop
  // Add state for productivity logs list
  const [prodLogs, setProdLogs] = useState<any[]>([]);
  
  // Debug: Track prodLogs changes (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('prodLogs changed to:', prodLogs.length, 'items');
    }
  }, [prodLogs]);

  // Centralized error handler
  const handleError = (error: any, message: string) => {
    console.error(message, error);
    if (error?.response?.status === 401 || error?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    setError(message);
  };

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

    // Fetch all data in parallel for faster loading
    (async () => {
      try {
        console.log('Fetching initial data...');
        
        // Run all API calls in parallel
        const [statsData, levelData, streakData, chartData] = await Promise.all([
          fetchUserStats(),
          fetchUserLevel(),
          fetchStreakData(),
          fetchChartData(progressView)
        ]);
        
        // Calculate current streak from backend data for consistency
        const currentStreak = calculateCurrentStreakFromData(streakData);
        console.log('🔥 Current streak calculated from backend data:', currentStreak);
        
        // Update stats with the consistent streak value
        const updatedStats = { ...statsData, streak: currentStreak };
        
        // Update all state at once
        setStats(updatedStats);
        setUserLevel(levelData);
        setStreakData(streakData);
        setChartData(chartData);
        
        console.log('Initial data loaded successfully');
        console.log('📊 Stats data received:', updatedStats);
        console.log('📅 Streak data received:', streakData.length, 'days');
      } catch (error) {
        handleError(error, 'Failed to fetch initial data');
      } finally {
        setLoading(false);
      }
    })();
    
    // Listen for task completion events to refresh progress data
    const handleTaskCompleted = async () => {
      console.log('🔄 Task completion event received, refreshing progress data...');
      try {
        // Run stats and level updates in parallel
        const [statsData, levelData] = await Promise.all([
          fetchUserStats(),
          fetchUserLevel()
        ]);
        
        // Refresh productivity data separately
        await refreshProductivity();
        
        setStats(statsData);
        setUserLevel(levelData);
      } catch (error) {
        console.error('Error refreshing progress data:', error);
      }
    };
    
    // Listen for task creation events to refresh productivity data
    const handleTaskCreated = async () => {
      console.log('🔄 Task creation event received, refreshing productivity data...');
      try {
        const statsData = await fetchUserStats();
        
        // Refresh productivity data separately
        await refreshProductivity();
        setStats(statsData);
      } catch (error) {
        console.error('Error refreshing progress data after task creation:', error);
      }
    };
    
    window.addEventListener('taskCompleted', handleTaskCompleted);
    window.addEventListener('taskCreated', handleTaskCreated);
    
    return () => {
      window.removeEventListener('taskCompleted', handleTaskCompleted);
      window.removeEventListener('taskCreated', handleTaskCreated);
    };
  }, []);

  // Check for date changes and refresh productivity data
  useEffect(() => {
    const checkDateChange = () => {
      const today = new Date().toLocaleDateString('en-CA');
      if (today !== currentDate) {
        console.log('🔄 Date changed from', currentDate, 'to', today, '- refreshing productivity data');
        setCurrentDate(today);
        // Trigger productivity refresh by dispatching a custom event
        window.dispatchEvent(new CustomEvent('dateChanged'));
      }
    };
    
    // Check immediately on mount
    checkDateChange();
    
    // Check for date changes every minute
    const dateCheckInterval = setInterval(checkDateChange, 60000);
    
    return () => {
      clearInterval(dateCheckInterval);
    };
  }, [currentDate]);

  // Force refresh on component mount to ensure we have the latest data
  useEffect(() => {
    console.log('🔄 Component mounted - forcing productivity refresh');
    
    // Immediately clear the state to force fresh data
    console.log('🔄 Clearing todaysProductivity state on mount');
    setTodaysProductivity(null);
    
    // Trigger a manual refresh when component mounts
    setTimeout(() => {
      console.log('🔄 Triggering dateChanged event on mount');
      window.dispatchEvent(new CustomEvent('dateChanged'));
    }, 500); // Reduced delay
    
    // Also trigger a manual refresh immediately
    setTimeout(() => {
      console.log('🔄 Triggering manual refresh on mount');
      refreshProductivity();
    }, 1000); // Reduced delay
    
    // Force another refresh after a longer delay
    setTimeout(() => {
      console.log('🔄 Final forced refresh on mount');
      refreshProductivity();
    }, 3000);
    
    // Force a complete component refresh
    setTimeout(() => {
      console.log('🔄 Force component refresh with new key');
      setRefreshKey(prev => prev + 1);
    }, 4000);
  }, []);

  // Fetch today's productivity (daily) for the bar below XP bar
  useEffect(() => {
    const fetchTodaysProductivity = async () => {
      try {
        // Get current user ID
        const userData = localStorage.getItem('user');
        if (!userData) {
          handle401();
          return;
        }
        
        const user = JSON.parse(userData);
        const userId = user.id || 11;
        
        const todayStr = new Date().toLocaleDateString('en-CA'); // Use local date to match database
        
        console.log('📊 Fetching today\'s productivity from Supabase for user:', userId, 'date:', todayStr);
        console.log('📊 Current date state:', currentDate);
        console.log('📊 Date comparison - todayStr:', todayStr, 'currentDate:', currentDate);
        
        // Get today's productivity log from Supabase
        console.log('🔍 Supabase query parameters:', {
          user_id: userId,
          period_type: 'daily',
          period_start: todayStr,
          period_end: todayStr
        });
        
        // Add cache-busting parameter to ensure fresh data
        const cacheBuster = Date.now();
        console.log('🔍 Cache buster:', cacheBuster);
        
        // Force fresh data by adding a timestamp parameter
        const { data: productivityData, error: productivityError } = await supabase
          .from('productivity_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('period_type', 'daily')
          .eq('period_start', todayStr)
          .eq('period_end', todayStr)
          .single();
          
        console.log('🔍 Supabase query result:', { productivityData, productivityError });
        
        if (productivityError && productivityError.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('Error fetching today\'s productivity:', productivityError);
          setTodaysProductivity(null);
          return;
        }
        
        if (productivityData) {
          console.log('Today\'s productivity data from Supabase:', productivityData);
          console.log('🔄 Setting todaysProductivity state with fresh data:', {
            status: productivityData.status,
            completion_rate: productivityData.completion_rate,
            total_tasks: productivityData.total_tasks,
            completed_tasks: productivityData.completed_tasks
          });
          setTodaysProductivity({
            status: productivityData.status,
            completion_rate: productivityData.completion_rate,
            total_tasks: productivityData.total_tasks,
            completed_tasks: productivityData.completed_tasks
          });
        } else {
          console.log('No productivity data found for today');
          setTodaysProductivity(null);
        }
      } catch (e) {
        console.error('Error fetching today productivity:', e);
        setTodaysProductivity(null);
      }
    };
    
    fetchTodaysProductivity();
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(fetchTodaysProductivity, 30000);
    
    // Listen for date change events
    const handleDateChanged = () => {
      console.log('🔄 Date change event received, refreshing productivity data...');
      fetchTodaysProductivity();
    };
    
    window.addEventListener('dateChanged', handleDateChanged);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('dateChanged', handleDateChanged);
    };
  }, []);

  // Manual refresh function for debugging
  const refreshProductivity = async () => {
    try {
      // Get current user ID
      const userData = localStorage.getItem('user');
      if (!userData) {
        handle401();
        return;
      }
      
      const user = JSON.parse(userData);
      const userId = user.id || 11;
      
      const todayStr = new Date().toLocaleDateString('en-CA'); // Use local date to match database
      console.log('🔄 Manual refresh - Refreshing productivity for date:', todayStr);
      console.log('🔄 Manual refresh - Current date state:', currentDate);
      console.log('🔄 Manual refresh - Force clearing todaysProductivity state');
      
      // Force clear the state first
      console.log('🔄 Manual refresh - Clearing todaysProductivity state');
      setTodaysProductivity(null);
      
      // Force component refresh
      setRefreshKey(prev => prev + 1);
      
      // Add a small delay to ensure state is cleared
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get today's productivity log from Supabase with cache-busting
      const cacheBuster = Date.now();
      console.log('🔄 Manual refresh - Cache buster:', cacheBuster);
      
      const { data: productivityData, error: productivityError } = await supabase
        .from('productivity_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('period_type', 'daily')
        .eq('period_start', todayStr)
        .eq('period_end', todayStr)
        .single();
      
      if (productivityError && productivityError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error refreshing productivity:', productivityError);
        setTodaysProductivity(null);
        return;
      }
      
      if (productivityData) {
        console.log('Refreshed productivity data from Supabase:', productivityData);
        console.log('🔄 Manual refresh - Setting todaysProductivity state with fresh data:', {
          status: productivityData.status,
          completion_rate: productivityData.completion_rate,
          total_tasks: productivityData.total_tasks,
          completed_tasks: productivityData.completed_tasks
        });
        setTodaysProductivity({
          status: productivityData.status,
          completion_rate: productivityData.completion_rate,
          total_tasks: productivityData.total_tasks,
          completed_tasks: productivityData.completed_tasks
        });
      } else {
        console.log('No productivity data found for today');
        setTodaysProductivity(null);
      }
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
          const todayStr = format(selectedDate, 'yyyy-MM-dd'); // Use local date formatting
          url = `${API_BASE_URL}/progress/productivity/?view=daily&date=${todayStr}`;
        } else if (progressView === 'Weekly') {
          const monday = new Date(selectedDate);
          monday.setDate(monday.getDate() - monday.getDay() + 1);
          const weekStr = format(monday, 'yyyy-MM-dd'); // Use local date formatting
          url = `${API_BASE_URL}/progress/productivity/?view=weekly&date=${weekStr}`;
        } else if (progressView === 'Monthly') {
          const firstOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
          const monthStr = format(firstOfMonth, 'yyyy-MM-dd'); // Use local date formatting
          url = `${API_BASE_URL}/progress/productivity/?view=monthly&date=${monthStr}`;
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
          const yDate = format(yesterday, 'yyyy-MM-dd'); // Use local date formatting
          const yRes = await fetch(`${API_BASE_URL}/progress/productivity/?view=daily&date=${yDate}`, {
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

  // Fetch productivity logs for the selected period from Supabase
  useEffect(() => {
    const fetchProdLogs = async () => {
      try {
        // Get current user ID
        const userData = localStorage.getItem('user');
        if (!userData) {
          handle401();
          return;
        }
        
        const user = JSON.parse(userData);
        const userId = user.id || 11;
        
        // Only log in development mode to reduce console noise
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 Fetching productivity logs from Supabase for user:', userId, 'view:', progressView, 'date:', selectedDate.toISOString());
          console.log('📊 Current year being queried:', selectedDate.getFullYear());
        }
        
        let data: any[] = [];
        
        if (progressView === 'Daily') {
          // For daily view, fetch logs for the specific month being viewed
          const year = selectedDate.getFullYear();
          const month = selectedDate.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
          const monthStart = `${year}-${month.toString().padStart(2, '0')}-01`;
          // Get the last day of the month properly
          const lastDay = new Date(year, month, 0).getDate(); // month is 1-based, so this gets last day
          const monthEnd = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
          
          const { data: logs, error } = await supabase
            .from('productivity_logs')
            .select('*')
            .eq('user_id', userId)
            .eq('period_type', 'daily')
            .gte('period_start', monthStart)
            .lte('period_start', monthEnd)
            .order('period_start', { ascending: true });
          
          if (error) {
            console.error('Error fetching daily productivity logs:', error);
            data = [];
          } else {
            const existingLogs = logs || [];
            
            // Generate entries for ALL days in the month, including days with 0% productivity
            const allDaysData: any[] = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            for (let day = 1; day <= lastDay; day++) {
              const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              const currentDate = new Date(dateStr);
              
              // Skip future dates
              if (currentDate > today) continue;
              
              // Find existing log for this date
              const existingLog = existingLogs.find(log => log.period_start === dateStr);
              
              if (existingLog) {
                // Use existing data
                allDaysData.push(existingLog);
              } else {
                // Create entry for day with 0% productivity
                allDaysData.push({
                  period_start: dateStr,
                  period_end: dateStr,
                  period_type: 'daily',
                  user_id: userId,
                  total_tasks: 0,
                  completed_tasks: 0,
                  completion_rate: 0,
                  status: 'Low Productive',
                  logged_at: new Date().toISOString()
                });
              }
            }
            
            data = allDaysData;
            console.log('📊 Generated data for all days in month:', data.length, 'days');
          }
        } else if (progressView === 'Weekly') {
          // For weekly view, fetch daily logs and aggregate them into weeks
          const year = selectedDate.getFullYear();
          const yearStart = `${year}-01-01`;
          const yearEnd = `${year}-12-31`;
          console.log('📊 Weekly view: fetching data for year', year, 'from', yearStart, 'to', yearEnd);
          
          const { data: dailyLogs, error } = await supabase
            .from('productivity_logs')
            .select('*')
            .eq('user_id', userId)
            .eq('period_type', 'daily')
            .gte('period_start', yearStart)
            .lte('period_start', yearEnd)
            .order('period_start', { ascending: true });
          
          if (error) {
            console.error('Error fetching daily logs for weekly aggregation:', error);
          } else {
            console.log('📊 Daily logs for weekly aggregation:', dailyLogs);
            // Aggregate daily logs into weekly data
            data = aggregateDailyToWeekly(dailyLogs || []);
            console.log('📊 Aggregated weekly data:', data);
          }
        } else if (progressView === 'Monthly') {
          // For monthly view, fetch daily logs and aggregate them into months
          const year = selectedDate.getFullYear();
          const yearStart = `${year}-01-01`;
          const yearEnd = `${year}-12-31`;
          console.log('📊 Monthly view: fetching data for year', year, 'from', yearStart, 'to', yearEnd);
          
          const { data: dailyLogs, error } = await supabase
            .from('productivity_logs')
            .select('*')
            .eq('user_id', userId)
            .eq('period_type', 'daily')
            .gte('period_start', yearStart)
            .lte('period_start', yearEnd)
            .order('period_start', { ascending: true });
          
          if (error) {
            console.error('Error fetching daily logs for monthly aggregation:', error);
          } else {
            console.log('📊 Daily logs for monthly aggregation:', dailyLogs);
            // Aggregate daily logs into monthly data
            data = aggregateDailyToMonthly(dailyLogs || []);
            console.log('📊 Aggregated monthly data:', data);
          }
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 Received productivity logs from Supabase:', data);
          console.log('📊 Total items received:', data.length);
        }
        
        // Transform the data to match what ProductivityHistory component expects
        const transformedData = data.map(log => {
          if (progressView === 'Daily') {
            return {
              date: log.period_start, // Map period_start to date field
              log: {
                completion_rate: log.completion_rate,
                status: log.status,
                total_tasks: log.total_tasks,
                completed_tasks: log.completed_tasks
              }
            };
          } else if (progressView === 'Weekly') {
            return {
              week_start: log.period_start, // Map period_start to week_start
              week_end: log.period_end, // Map period_end to week_end
              log: {
                completion_rate: log.completion_rate,
                status: log.status,
                total_tasks: log.total_tasks,
                completed_tasks: log.completed_tasks
              }
            };
          } else if (progressView === 'Monthly') {
            const date = new Date(log.period_start);
            return {
              month: date.getMonth() + 1, // Convert to 1-12 month format
              log: {
                completion_rate: log.completion_rate,
                status: log.status,
                total_tasks: log.total_tasks,
                completed_tasks: log.completed_tasks
              }
            };
          }
          return log; // Fallback
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 Transformed data for ProductivityHistory:', transformedData);
        }
        setProdLogs(transformedData);
      } catch (e) {
        console.error('Error fetching productivity logs from Supabase:', e);
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

  // Show loading state with spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <PageLayout>
        <div className="space-y-6 relative">
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-4 text-red-900 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

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
      case 'Moderately Productive':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'Low Productive':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-300';
    }
  }

  return (
    <PageLayout>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <ProgressHeader greeting={greeting} username={user?.username || 'User'} />

        {/* Main Content - Vertically Centered */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Overview Section - Horizontally Centered */}
          <div className="w-full flex justify-center">
            <div className="w-full max-w-7xl">
              <ProgressOverview
                key={`progress-overview-${refreshKey}`}
                userLevel={userLevel}
                todaysProductivity={todaysProductivity}
                streakData={streakData}
                refreshProductivity={refreshProductivity}
              />
            </div>
          </div>
        </div>

        {/* Bottom Content */}
        <div className="space-y-6">

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

        {/* Main Chart */}
        <MainChart view={progressView} data={chartData} prodLogs={prodLogs} />

        {/* Achievements */}
        <Achievements stats={stats} userLevel={userLevel} />
        </div>
      </div>
    </PageLayout>
  );
};

// Helper to get JWT token from localStorage
function getAuthHeaders(): HeadersInit | undefined {
  const token = localStorage.getItem('accessToken');
  return token ? { 'Authorization': `Bearer ${token}` } : undefined;
}

// API base URL - use direct backend URL for now
const API_BASE_URL = 'http://192.168.56.1:8000/api';

function handle401() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

// Calculate current streak from backend streak data (same logic as StreaksCalendar)
function calculateCurrentStreakFromData(streakData: any[]) {
  // Sort by date (most recent first)
  const sortedData = [...streakData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (sortedData.length === 0) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  // Check if we have data for today
  const todayData = sortedData.find(day => day.date === todayStr);
  if (!todayData || !todayData.streak) {
    return 0; // No streak if today is not productive
  }
  
  let currentStreak = 1; // Start with today
  let currentDate = new Date(today);
  
  // Go backwards day by day to check for consecutive productive days
  for (let i = 1; i < 365; i++) { // Check up to 1 year back
    currentDate.setDate(currentDate.getDate() - 1);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    const dayData = sortedData.find(day => day.date === dateStr);
    
    if (dayData && dayData.streak) {
      currentStreak++;
    } else {
      // If no data for this day or day is not productive, streak is broken
      break;
    }
  }
  
  return currentStreak;
}

async function fetchUserStats() {
  try {
    // Get current user ID
    const userData = localStorage.getItem('user');
    if (!userData) {
      handle401();
      return { totalTasksCompleted: 0, totalStudyTime: 0, averageProductivity: 0, streak: 0 };
    }
    
    const user = JSON.parse(userData);
    const userId = user.id || 11; // Fallback to your user ID
    
    console.log('📊 Fetching user stats from Supabase for user:', userId);
    
    // Get total tasks completed
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('id, completed, time_spent_minutes')
      .eq('user_id', userId)
      .eq('is_deleted', false);
    
    if (tasksError) {
      console.error('Supabase error fetching tasks:', tasksError);
      return { totalTasksCompleted: 0, totalStudyTime: 0, averageProductivity: 0, streak: 0 };
    }
    
    const totalTasksCompleted = tasksData?.filter(task => task.completed).length || 0;
    const totalStudyTime = tasksData?.reduce((sum, task) => sum + (task.time_spent_minutes || 0), 0) || 0;
    
    // Get average productivity from productivity logs
    const { data: productivityData, error: productivityError } = await supabase
      .from('productivity_logs')
      .select('completion_rate')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(30); // Last 30 entries for average
    
    let averageProductivity = 0;
    if (!productivityError && productivityData && productivityData.length > 0) {
      const totalRate = productivityData.reduce((sum, log) => sum + log.completion_rate, 0);
      averageProductivity = Math.round(totalRate / productivityData.length);
    }
    
    // Note: Streak calculation is now done from backend data in calculateCurrentStreakFromData()
    // This ensures consistency between StatsCards and StreaksCalendar
    
    const stats = {
      totalTasksCompleted,
      totalStudyTime,
      averageProductivity,
      streak: 0 // Will be overridden by calculateCurrentStreakFromData() for consistency
    };
    
    console.log('📊 User stats from Supabase:', stats);
    return stats;
  } catch (e) {
    console.error('Error fetching user stats from Supabase:', e);
    return { totalTasksCompleted: 0, totalStudyTime: 0, averageProductivity: 0, streak: 0 };
  }
}

async function fetchUserLevel() {
  try {
    // Get current user ID
    const userData = localStorage.getItem('user');
    if (!userData) {
      handle401();
      return { currentLevel: 1, currentXP: 0, xpToNextLevel: 100, xpNeededForCurrentLevel: 100 };
    }
    
    const user = JSON.parse(userData);
    const userId = user.id || 11; // Fallback to your user ID
    
    console.log('🎮 Fetching user level from Supabase for user:', userId);
    
    // Get total XP from xp_logs
    const { data: xpData, error: xpError } = await supabase
      .from('xp_logs')
      .select('xp_amount')
      .eq('user_id', userId);
    
    if (xpError) {
      console.error('Supabase error fetching XP logs:', xpError);
      return { currentLevel: 1, currentXP: 0, xpToNextLevel: 100, xpNeededForCurrentLevel: 100 };
    }
    
    const totalXP = xpData?.reduce((sum, log) => sum + log.xp_amount, 0) || 0;
    
    // Calculate level based on progressive XP system
    // Level 1: 0-100 XP, Level 2: 100-300 XP, Level 3: 300-600 XP, etc.
    // Each level requires: Level 1 = 100 XP, Level 2 = 200 XP, Level 3 = 300 XP, etc.
    let currentLevel = 1;
    let xpForCurrentLevel = 0;
    let xpToNextLevel = 100;
    let xpNeededForCurrentLevel = 100;
    
    // Calculate cumulative XP needed for each level
    let cumulativeXP = 0;
    for (let level = 1; level <= 100; level++) { // Cap at level 100
      const xpNeededForThisLevel = level * 100;
      cumulativeXP += xpNeededForThisLevel;
      
      if (totalXP < cumulativeXP) {
        currentLevel = level;
        xpForCurrentLevel = totalXP - (cumulativeXP - xpNeededForThisLevel);
        xpToNextLevel = xpNeededForThisLevel; // XP needed for this level
        xpNeededForCurrentLevel = xpNeededForThisLevel;
        break;
      } else if (totalXP === cumulativeXP) {
        // Exactly at level boundary
        currentLevel = level + 1;
        xpForCurrentLevel = 0;
        xpToNextLevel = (level + 1) * 100;
        xpNeededForCurrentLevel = (level + 1) * 100;
        break;
      }
    }
    
    // If totalXP is higher than any level, cap at level 100
    if (totalXP >= 100 * 100 * 50) { // 100 levels * 100 XP * 50 = 500,000 XP
      currentLevel = 100;
      xpForCurrentLevel = totalXP - (99 * 100 * 50);
      xpToNextLevel = 100 * 100;
      xpNeededForCurrentLevel = 100 * 100;
    }
    
    const levelData = {
      currentLevel,
      currentXP: xpForCurrentLevel,
      xpToNextLevel,
      xpNeededForCurrentLevel
    };
    
    console.log('🎮 XP Calculation Debug:');
    console.log('  Total XP:', totalXP);
    console.log('  Current Level:', currentLevel);
    console.log('  XP in Current Level:', xpForCurrentLevel);
    console.log('  XP to Next Level:', xpToNextLevel);
    console.log('  XP Needed for Current Level:', xpNeededForCurrentLevel);
    console.log('🎮 User level from Supabase:', levelData);
    return levelData;
  } catch (e) {
    console.error('Error fetching user level from Supabase:', e);
    return { currentLevel: 1, currentXP: 0, xpToNextLevel: 100, xpNeededForCurrentLevel: 100 };
  }
}

async function fetchStreakData() {
  try {
    // Get current user ID
    const userData = localStorage.getItem('user');
    if (!userData) {
      handle401();
      return [];
    }
    
    const user = JSON.parse(userData);
    const userId = user.id || 11;
    
    console.log('🔄 Fetching streak data from Supabase for user:', userId);
    
    // Get productivity logs from Supabase (same source as ProductivityHistory)
    const { data: productivityLogs, error } = await supabase
      .from('productivity_logs')
      .select('period_start, completion_rate, total_tasks, completed_tasks')
      .eq('user_id', userId)
      .eq('period_type', 'daily')
      .gte('period_start', '2025-01-01') // Get data for current year
      .lte('period_start', '2025-12-31')
      .order('period_start', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching productivity logs from Supabase:', error);
      return [];
    }
    
    // Convert productivity logs to streak data format
    const streakData = productivityLogs?.map(log => ({
      date: log.period_start,
      streak: log.total_tasks > 0 && log.completed_tasks > 0, // Same logic as backend
      productivity: log.completion_rate,
      total_tasks: log.total_tasks,
      completed_tasks: log.completed_tasks
    })) || [];
    
    console.log('✅ Streak data from Supabase:', streakData.length, 'days');
    console.log('🔍 Streak days:', streakData.filter((d: any) => d.streak).length);
    
    return streakData;
  } catch (e) {
    console.error('❌ Error fetching streak data from Supabase:', e);
    return [];
  }
}

async function fetchChartData(view: string) {
  try {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/progress/chart/?view=${view}`, {
      ...(headers && { headers })
    });
    if (res.status === 401) {
      handle401();
      return {};
    }
    if (!res.ok) throw new Error('Failed to fetch chart data');
    return await res.json();
  } catch (e) {
    return {};
  }
}

export default Progress;
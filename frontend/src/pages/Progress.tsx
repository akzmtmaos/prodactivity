import React, { useEffect, useState, useRef } from 'react';
import PageLayout from '../components/PageLayout';
import StatsCards from '../components/progress/StatsCards';
import StatsAnalysis from '../components/progress/StatsAnalysis';
import ProgressHeader from '../components/progress/ProgressHeader';
import ProgressOverview from '../components/progress/ProgressOverview';
import ProductivityHistory from '../components/progress/ProductivityHistory';
import Achievements from '../components/progress/Achievements';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
// import { getTodayDate } from '../utils/dateUtils';
import { supabase } from '../lib/supabase';
import { API_BASE_URL } from '../config/api';
import axiosInstance from '../utils/axiosConfig';

const TABS = ['Daily', 'Weekly', 'Monthly'];

// Helper function to aggregate daily logs into weekly data
function aggregateDailyToWeekly(dailyLogs: any[]) {
  // Early return if no data
  if (!dailyLogs || dailyLogs.length === 0) {
    return [];
  }
  
  if (import.meta.env.DEV) {
    console.log('🔄 Starting weekly aggregation with', dailyLogs.length, 'daily logs');
    console.log('🔄 Daily logs data:', dailyLogs);
  }
  
  const weeklyData: { [key: string]: any } = {};
  // Use the same date logic as the rest of the app (local date string)
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  const todayStr = today.toISOString().split('T')[0];
  
  // Debug the date being used
  if (import.meta.env.DEV) {
    console.log('🔄 Weekly aggregation using today:', todayStr);
  }
  
  dailyLogs.forEach(log => {
    // Skip logs with missing period_start
    if (!log.period_start) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ Skipping log with undefined period_start:', log);
      }
      return;
    }
    
    const date = new Date(log.period_start);
    
    // Skip invalid dates
    if (isNaN(date.getTime())) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ Skipping log with invalid date:', log.period_start);
      }
      return;
    }
    
    // Skip future dates (compare date strings to avoid timezone issues)
    const logDateStr = log.period_start;
    
    if (logDateStr > todayStr) {
      if (import.meta.env.DEV) {
        console.log('🔄 Skipping future date:', log.period_start, '(today is', todayStr + ')');
      }
      return;
    }
    
    // Get the Monday of the week (week starts on Monday)
    // date.getDay() returns 0 for Sunday, 1 for Monday, etc.
    // To get Monday: if Sunday (0), go back 6 days; if Monday (1), stay; etc.
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, 2=Tue, ..., 6=Sat
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(date);
    monday.setDate(date.getDate() - daysSinceMonday);
    monday.setHours(0, 0, 0, 0); // Ensure midnight to avoid timezone issues
    const weekKey = monday.toISOString().split('T')[0];
    
    // Debug Oct 5-8 specifically
    if (log.period_start >= '2025-10-05' && log.period_start <= '2025-10-08') {
      console.log(`🔍 Debug ${log.period_start}:`, {
        dateStr: log.period_start,
        dayOfWeek,
        daysSinceMonday,
        calculatedMonday: weekKey
      });
    }
    
    // Skip future weeks (where Monday is in the future)
    const mondayStr = monday.toISOString().split('T')[0];
    
    // Debug Sep 23 specifically
    if (log.period_start === '2025-09-23') {
      console.log('🔄 Processing Sep 23 log:', {
        date: date.toISOString().split('T')[0],
        dayOfWeek: date.getDay(),
        daysSinceMonday,
        monday: monday.toISOString().split('T')[0],
        weekKey,
        completion_rate: log.completion_rate,
        todayStr,
        isFutureDate: logDateStr > todayStr,
        isFutureWeek: mondayStr > todayStr
      });
    }
    if (mondayStr > todayStr) {
      if (import.meta.env.DEV) {
        console.log('🔄 Skipping future week starting:', weekKey, '(today is', todayStr + ')');
      }
      return;
    }
    
    if (!weeklyData[weekKey]) {
      // Calculate Sunday properly (avoid timezone issues)
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const sundayStr = sunday.toISOString().split('T')[0];
      
      weeklyData[weekKey] = {
        period_start: weekKey,
        period_end: sundayStr,
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
    
    // Force debug for Sep 15 week and Sep 22 week
    if (week.period_start === '2025-09-15' || week.period_start === '2025-09-22') {
      console.log(`🚨 STARTING ${week.period_start} WEEK PROCESSING 🚨`);
      console.log('Week object:', week);
      console.log('Week start/end:', weekStart.toISOString(), weekEnd.toISOString());
    }
    
    // Check if this is the current week (use string comparison to avoid timezone issues)
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    const isCurrentWeek = weekStartStr <= todayStr && weekEndStr >= todayStr;
    
    const dailyLogsForWeek = dailyLogs.filter(log => {
      const logDateStr = log.period_start; // Use string comparison to avoid timezone issues
      return logDateStr >= weekStartStr && logDateStr <= weekEndStr;
    });
    
    // Debug Sep 22 week specifically
    if (week.period_start === '2025-09-22') {
      console.log('🚨 SEP 22 WEEK DEBUG 🚨');
      console.log('Week range:', weekStartStr, 'to', weekEndStr);
      console.log('All daily logs:', dailyLogs.map(log => ({ date: log.period_start, rate: log.completion_rate })));
      console.log('Filtered logs for this week:', dailyLogsForWeek.map(log => ({ date: log.period_start, rate: log.completion_rate })));
      console.log('Is current week:', isCurrentWeek);
    }
    
    if (dailyLogsForWeek.length > 0) {
      // For current week, we need to include all days up to today, not just days with data
      let completionRates: number[] = [];
      
      if (isCurrentWeek) {
        // For current week, generate completion rates for ALL days in the week (same as WeeklyBreakdownModal)
        // The WeeklyBreakdownModal includes all days from startDate to endDate, including future days
        console.log(`🔄 Processing CURRENT WEEK ${week.period_start}:`, {
          weekStart: week.period_start,
          weekEnd: week.period_end,
          today: today.toISOString().split('T')[0],
          dailyLogsForWeek: dailyLogsForWeek.length
        });
        
        const currentDate = new Date(weekStart);
        while (currentDate <= weekEnd) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const dayLog = dailyLogsForWeek.find(log => log.period_start === dateStr);
          completionRates.push(dayLog ? (dayLog.completion_rate || 0) : 0);
          
          // Debug each day in current week
          if (week.period_start === '2025-09-22' || week.period_start === '2025-09-15') {
            console.log(`  📅 ${dateStr}: ${dayLog ? dayLog.completion_rate + '%' : '0% (no data)'}`);
          }
          
          // Extra debug for Sep 22 week
          if (week.period_start === '2025-09-22') {
            console.log(`🚨 SEP 22 WEEK DAY: ${dateStr} = ${dayLog ? dayLog.completion_rate + '%' : '0% (no data)'}`);
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        // For past weeks, generate completion rates for ALL days in the week (same as current week logic)
        console.log(`✅ Processing PAST WEEK ${week.period_start}:`, {
          weekStart: week.period_start,
          weekEnd: week.period_end,
          dailyLogsForWeek: dailyLogsForWeek.length
        });
        
        // Generate completion rates for ALL days in the week, not just days with data
        const currentDate = new Date(weekStart);
        while (currentDate <= weekEnd) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const dayLog = dailyLogsForWeek.find(log => log.period_start === dateStr);
          completionRates.push(dayLog ? (dayLog.completion_rate || 0) : 0);
          
          // Debug each day in past week
          if (week.period_start === '2025-09-15' || week.period_start === '2025-09-08' || week.period_start === '2025-09-01') {
            console.log(`  📅 ${dateStr}: ${dayLog ? dayLog.completion_rate + '%' : '0% (no data)'}`);
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      // Calculate average of daily completion rates (same as WeeklyBreakdownModal)
      const totalDailyRate = completionRates.reduce((sum, rate) => sum + rate, 0);
      week.completion_rate = Math.round(totalDailyRate / completionRates.length);
      
      // Debug Sep 22 week calculation
      if (week.period_start === '2025-09-22') {
        console.log('🚨 SEP 22 WEEK CALCULATION 🚨');
        console.log('Completion rates array:', completionRates);
        console.log('Total daily rate:', totalDailyRate);
        console.log('Number of days:', completionRates.length);
        console.log('Calculated average:', week.completion_rate);
      }
      
      if (week.completion_rate >= 90) {
        week.status = 'Highly Productive';
      } else if (week.completion_rate >= 70) {
        week.status = 'Productive';
      } else if (week.completion_rate >= 40) {
        week.status = 'Moderately Productive';
      } else {
        week.status = 'Low Productive';
      }
      
      if (import.meta.env.DEV) {
        console.log(`🔄 Week ${week.period_start}: ${completionRates.length} days (current: ${isCurrentWeek}), rates: ${completionRates}, average: ${week.completion_rate}%`);
        console.log(`🔄 Week details:`, {
          weekStart: week.period_start,
          weekEnd: week.period_end,
          isCurrentWeek,
          today: today.toISOString().split('T')[0],
          completionRates,
          average: week.completion_rate
        });
        
        // Debug specific problematic weeks (force debug for Sep 15 and Sep 22)
        if (week.period_start === '2025-09-22' || week.period_start === '2025-09-15') {
          console.log(`🚨 FORCED DEBUG FOR ${week.period_start} WEEK 🚨`);
          console.log(`🔄 ${week.period_start} week calculation:`, {
            weekStart: week.period_start,
            weekEnd: week.period_end,
            isCurrentWeek,
            dailyLogsForWeek: dailyLogsForWeek.length,
            completionRates,
            average: week.completion_rate,
            status: week.status,
            dailyLogsDetails: dailyLogsForWeek.map(log => ({
              date: log.period_start,
              completion_rate: log.completion_rate,
              status: log.status
            })),
            // Debug the filter logic
            weekStartStr,
            weekEndStr,
            allLogsInRange: dailyLogs.filter(log => {
              const logDateStr = log.period_start;
              return logDateStr >= weekStartStr && logDateStr <= weekEndStr;
            }).map(log => ({
              date: log.period_start,
              completion_rate: log.completion_rate
            }))
          });
        }
        
        // Also debug correct weeks for comparison
        if (week.period_start === '2025-09-08' || week.period_start === '2025-09-01') {
          console.log(`✅ ${week.period_start} week calculation (CORRECT):`, {
            weekStart: week.period_start,
            weekEnd: week.period_end,
            isCurrentWeek,
            dailyLogsForWeek: dailyLogsForWeek.length,
            completionRates,
            average: week.completion_rate,
            status: week.status,
            dailyLogsDetails: dailyLogsForWeek.map(log => ({
              date: log.period_start,
              completion_rate: log.completion_rate,
              status: log.status
            }))
          });
        }
      }
    } else {
      week.completion_rate = 0;
      week.status = 'Low Productive';
    }
  });
  
  // Ensure we have an entry for the current week, even if it has no data
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  // Get Monday of current week
  const daysSinceMonday = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1;
  const currentWeekMonday = new Date(currentDate);
  currentWeekMonday.setDate(currentDate.getDate() - daysSinceMonday);
  const currentWeekKey = currentWeekMonday.toISOString().split('T')[0];
  
  // If current week doesn't exist in data, create it
  if (!weeklyData[currentWeekKey]) {
    console.log('🔄 Creating current week entry:', {
      currentWeekKey,
      currentWeekMonday: currentWeekMonday.toISOString().split('T')[0],
      todayStr
    });
    // Calculate Sunday properly
    const currentWeekSunday = new Date(currentWeekMonday);
    currentWeekSunday.setDate(currentWeekMonday.getDate() + 6);
    const currentWeekSundayStr = currentWeekSunday.toISOString().split('T')[0];
    
    weeklyData[currentWeekKey] = {
      period_start: currentWeekKey,
      period_end: currentWeekSundayStr,
      period_type: 'weekly',
      user_id: dailyLogs.length > 0 ? dailyLogs[0].user_id : null,
      total_tasks: 0,
      completed_tasks: 0,
      completion_rate: 0,
      status: 'Low Productive', // Changed from 'No Tasks' to 'Low Productive'
      logged_at: new Date().toISOString()
    };
    
    // FORCE RECALCULATE the current week with today's data
    console.log('🚨 FORCING RECALCULATION OF CURRENT WEEK 🚨');
    const week = weeklyData[currentWeekKey];
    const weekStart = new Date(week.period_start);
    const weekEnd = new Date(week.period_end);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    
    const dailyLogsForWeek = dailyLogs.filter(log => {
      const logDateStr = log.period_start;
      return logDateStr >= weekStartStr && logDateStr <= weekEndStr;
    });
    
    console.log('🚨 CURRENT WEEK RECALCULATION:', {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      dailyLogsForWeek: dailyLogsForWeek.length,
      logs: dailyLogsForWeek.map(log => ({ date: log.period_start, rate: log.completion_rate }))
    });
    
    if (dailyLogsForWeek.length > 0) {
      // Generate completion rates for ALL days in the week
      const completionRates = [];
      const currentDate = new Date(weekStart);
      while (currentDate <= weekEnd) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayLog = dailyLogsForWeek.find(log => log.period_start === dateStr);
        completionRates.push(dayLog ? (dayLog.completion_rate || 0) : 0);
        console.log(`  📅 ${dateStr}: ${dayLog ? dayLog.completion_rate + '%' : '0% (no data)'}`);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Calculate average
      const totalDailyRate = completionRates.reduce((sum, rate) => sum + rate, 0);
      week.completion_rate = Math.round(totalDailyRate / completionRates.length);
      
      if (week.completion_rate >= 90) {
        week.status = 'Highly Productive';
      } else if (week.completion_rate >= 70) {
        week.status = 'Productive';
      } else if (week.completion_rate >= 40) {
        week.status = 'Moderately Productive';
      } else {
        week.status = 'Low Productive';
      }
      
      console.log('🚨 CURRENT WEEK FINAL CALCULATION:', {
        completionRates,
        totalDailyRate,
        average: week.completion_rate,
        status: week.status
      });
    }
  } else {
    console.log('🔄 Current week already exists:', {
      currentWeekKey,
      existingData: weeklyData[currentWeekKey]
    });
  }
  
  const result = Object.values(weeklyData).sort((a: any, b: any) => 
    new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
  );
  
  if (import.meta.env.DEV) {
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
  
  if (import.meta.env.DEV) {
    console.log('🔄 Starting monthly aggregation with', dailyLogs.length, 'daily logs');
  }
  
  const monthlyData: { [key: string]: any } = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  dailyLogs.forEach(log => {
    const date = new Date(log.period_start);
    
    // Skip future dates
    if (date > today) {
      if (import.meta.env.DEV) {
        console.log('🔄 Skipping future date in monthly aggregation:', log.period_start);
      }
      return;
    }
    
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-01`;
    
    // Skip future months (where the month is in the future)
    const monthStart = new Date(monthKey);
    if (monthStart > today) {
      if (import.meta.env.DEV) {
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
      
      if (month.completion_rate >= 90) {
        month.status = 'Highly Productive';
      } else if (month.completion_rate >= 70) {
        month.status = 'Productive';
      } else if (month.completion_rate >= 40) {
        month.status = 'Moderately Productive';
      } else {
        month.status = 'Low Productive';
      }
      
      if (import.meta.env.DEV) {
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
  
  if (import.meta.env.DEV) {
    console.log('🔄 Monthly aggregation result:', result);
  }
  
  return result;
}

const Progress = () => {
  const [user, setUser] = useState<any | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('');
  const [progressView, setProgressView] = useState('Daily');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>({
    totalTasksCompleted: 0,
    totalStudyTime: 0,
    averageProductivity: 0,
    streak: 0,
    tasksByPriority: null,
    weightedProductivity: null,
  });
  const [userLevel, setUserLevel] = useState({ currentLevel: 1, currentXP: 0, xpToNextLevel: 1000 });

  // Add state for streakData
  const [streakData, setStreakData] = useState<any[]>([]);
  // Productivity status state
  const [productivity, setProductivity] = useState<{ status: string; completion_rate: number; total_tasks: number; completed_tasks: number } | null>(null);
  const [yesterdayProductivity, setYesterdayProductivity] = useState<{ status: string; completion_rate: number; total_tasks: number; completed_tasks: number } | null>(null);
  const [todaysProductivity, setTodaysProductivity] = useState<any | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [refreshKey, setRefreshKey] = useState(0);
  const lastNonZeroUpdateRef = useRef<number | null>(null);

  // Add state for selected date/period
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Debug: Track selectedDate changes (only in development)
  useEffect(() => {
    if (import.meta.env.DEV) {
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
    if (import.meta.env.DEV) {
      console.log('prodLogs changed to:', prodLogs.length, 'items');
    }
  }, [prodLogs]);

  // Update streak when todaysProductivity changes
  useEffect(() => {
    if (todaysProductivity && streakData.length > 0) {
      console.log('🔥 TodaysProductivity changed, recalculating streak...');
      console.log('🔥 TodaysProductivity data:', todaysProductivity);
      console.log('🔥 StreakData length:', streakData.length);
      
      const currentStreak = calculateCurrentStreakFromData(streakData, todaysProductivity);
      console.log('🔥 Updated current streak:', currentStreak);
      
      // Update stats with new streak
      setStats((prevStats: any) => ({
        ...prevStats,
        streak: currentStreak
      }));
    }
  }, [todaysProductivity, streakData]);

  // Also update streak when both data sources are available
  useEffect(() => {
    if (todaysProductivity && streakData.length > 0) {
      console.log('🔥 FORCE STREAK RECALCULATION - Both data sources available');
      const currentStreak = calculateCurrentStreakFromData(streakData, todaysProductivity);
      console.log('🔥 FORCE RECALCULATION - Current streak:', currentStreak);
      
      // Force update stats
      setStats((prevStats: any) => ({
        ...prevStats,
        streak: currentStreak
      }));
    }
  }, [todaysProductivity, streakData]);

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
    
    // Fetch user avatar from API
    (async () => {
      try {
        const res = await axiosInstance.get('/me/');
        if (res?.data?.avatar) {
          setUserAvatar(res.data.avatar);
        }
      } catch (e) {
        // ignore if endpoint not available
      }
    })();
    
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Fetch critical data first (non-blocking chart)
    (async () => {
      try {
        console.log('Fetching initial data...');
        // Critical trio first
        const [statsData, levelData, streakData] = await Promise.all([
          fetchUserStats(),
          fetchUserLevel(),
          fetchStreakData()
        ]);
        
        // Calculate current streak from backend data for consistency
        console.log('🔥 STREAK CALCULATION DEBUG:');
        console.log('🔥 StreakData length:', streakData.length);
        console.log('🔥 TodaysProductivity:', todaysProductivity);
        console.log('🔥 StreakData sample:', streakData.slice(0, 3));
        
        // Debug: Check if today's data is in the deduplicated streak data
        const today = new Date().toISOString().split('T')[0];
        const todayInStreakData = streakData.find(day => day.date === today);
        console.log('🔥 Today in initial streak data:', todayInStreakData);
        
        const currentStreak = calculateCurrentStreakFromData(streakData, todaysProductivity);
        console.log('🔥 Current streak calculated from backend data:', currentStreak);
        
        // Update stats with the consistent streak value
        const updatedStats = { ...statsData, streak: currentStreak };
        
        // Update all state at once
        setStats(updatedStats);
        setUserLevel(levelData);
        setStreakData(streakData);
        
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
      console.log('🚀 [handleTaskCompleted] EVENT RECEIVED - Starting refresh process...');
      try {
        // Add a small delay to allow backend to process the task completion
        console.log('⏳ [handleTaskCompleted] Waiting for backend to process task completion...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        // Run stats and level updates in parallel
        const [statsData, levelData] = await Promise.all([
          fetchUserStats(),
          fetchUserLevel()
        ]);
        
        // Refresh productivity data separately
        console.log('🔄 [handleTaskCompleted] Calling refreshProductivity...');
        await refreshProductivity();
        
        setStats(statsData);
        setUserLevel(levelData);
        console.log('✅ [handleTaskCompleted] Refresh process completed successfully');
      } catch (error) {
        console.error('❌ [handleTaskCompleted] Error refreshing progress data:', error);
      }
    };
    
    // Listen for task creation events to refresh productivity data
    const handleTaskCreated = async () => {
      console.log('🔄 Task creation event received, refreshing productivity data...');
      try {
        // Add a small delay to allow backend to process the task creation
        console.log('🔄 Waiting for backend to process task creation...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 0.5 seconds
        
        const statsData = await fetchUserStats();
        
        // Refresh productivity data separately
        await refreshProductivity();
        setStats(statsData);
      } catch (error) {
        console.error('Error refreshing progress data after task creation:', error);
      }
    };
    
    // Listen for achievement unlock events to refresh user level
    const handleAchievementUnlocked = async () => {
      console.log('🏆 Achievement unlocked event received, refreshing user level...');
      try {
        // Add a small delay to allow XP to be saved
        await new Promise(resolve => setTimeout(resolve, 500));
        const levelData = await fetchUserLevel();
        setUserLevel(levelData);
        console.log('✅ User level refreshed after achievement unlock');
      } catch (error) {
        console.error('Error refreshing user level after achievement unlock:', error);
      }
    };

    // Listen for subtask completion events to refresh productivity data
    const handleSubtaskCompleted = async () => {
      console.log('🔄 Subtask completion event received, refreshing productivity data...');
      try {
        // Add a small delay to allow backend to process the subtask completion
        console.log('🔄 Waiting for backend to process subtask completion...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 0.5 seconds
        
        const statsData = await fetchUserStats();
        
        // Refresh productivity data separately
        await refreshProductivity();
        setStats(statsData);
      } catch (error) {
        console.error('Error refreshing progress data after subtask completion:', error);
      }
    };
    
    window.addEventListener('taskCompleted', handleTaskCompleted);
    window.addEventListener('taskCreated', handleTaskCreated);
    window.addEventListener('subtaskCompleted', handleSubtaskCompleted);
    window.addEventListener('achievementUnlocked', handleAchievementUnlocked);
    
    return () => {
      window.removeEventListener('taskCompleted', handleTaskCompleted);
      window.removeEventListener('taskCreated', handleTaskCreated);
      window.removeEventListener('subtaskCompleted', handleSubtaskCompleted);
      window.removeEventListener('achievementUnlocked', handleAchievementUnlocked);
    };
  }, []);

  // Recalculate streak when todaysProductivity or streakData changes
  useEffect(() => {
    if (streakData.length > 0) {
      console.log('🔥 Streak recalculation triggered by data change');
      console.log('🔥 TodaysProductivity:', todaysProductivity);
      console.log('🔥 StreakData length:', streakData.length);
      console.log('🔥 StreakData sample:', streakData.slice(0, 3));
      
      const currentStreak = calculateCurrentStreakFromData(streakData, todaysProductivity);
      console.log('🔥 Recalculated current streak:', currentStreak);
      
      // Update stats with the recalculated streak value
      setStats((prevStats: any) => ({ ...prevStats, streak: currentStreak }));
    }
  }, [todaysProductivity, streakData]);

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

  // Removed forced extra refresh on mount to reduce latency

  // Realtime: Subscribe to task changes for today to update productivity instantly
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;
      const user = JSON.parse(userData);
      const userId = user.id || 11;
      const todayStr = new Date().toLocaleDateString('en-CA');

      console.log('🛰️ Subscribing to realtime task changes for', { userId, todayStr });

      const channel = supabase
        .channel('realtime-tasks-today')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`
        }, async (payload: any) => {
          const row = payload.new || payload.old;
          if (!row) return;
          
          // NEW: Care about tasks completed today OR due today (not just due today)
          const affectsToday = (row.due_date === todayStr) || 
                              (row.completed && row.completed_at && row.completed_at.startsWith(todayStr));
          
          if (affectsToday) {
            console.log('🛰️ Realtime task update affecting today:', payload.eventType, row.id);
            
            // Recompute productivity from tasks (CORRECTED: by due date, same as backend)
            const [completedTodayRT, pendingResult] = await Promise.all([
              supabase.from('tasks').select('id, completed_at, due_date').eq('user_id', userId).eq('is_deleted', false)
                .eq('completed', true).eq('due_date', todayStr).not('completed_at', 'is', null),
              supabase.from('tasks').select('id').eq('user_id', userId).eq('is_deleted', false).eq('completed', false).eq('due_date', todayStr)
            ]);
            
            if (!completedTodayRT.error && !pendingResult.error) {
              // Filter to only count tasks completed ON TIME (on or before due date)
              const completedOnTimeRT = (completedTodayRT.data || []).filter(task => {
                if (!task.completed_at) return false;
                const completedDate = new Date(task.completed_at);
                const completedDateStr = completedDate.toLocaleDateString('en-CA');
                const dueDateStr = task.due_date;
                
                // Only count if completed on or before the due date
                return completedDateStr <= dueDateStr;
              });
              
              const completedCount = completedOnTimeRT.length;
              const pendingCount = (pendingResult.data || []).length;
              const totalTasks = completedCount + pendingCount;
              const completedTasks = completedCount;
              const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
              
              let status = 'Low Productive';
              if (completionRate >= 90) status = 'Highly Productive';
              else if (completionRate >= 70) status = 'Productive';
              else if (completionRate >= 40) status = 'Moderately Productive';
              
              console.log('🛰️ Realtime productivity update:', { totalTasks, completedTasks, completionRate, status });
              
              setTodaysProductivity((prev: any) => {
                const now = Date.now();
                if (completionRate > 0) {
                  lastNonZeroUpdateRef.current = now;
                } else if (lastNonZeroUpdateRef.current && now - lastNonZeroUpdateRef.current < 2000 && prev) {
                  return prev;
                }
                return {
                  status,
                  completion_rate: completionRate,
                  total_tasks: totalTasks,
                  completed_tasks: completedTasks
                } as any;
              });
            }
          }
        })
        .subscribe((status) => {
          console.log('🛰️ Realtime channel status:', status);
        });

      return () => {
        console.log('🛰️ Unsubscribing realtime tasks');
        supabase.removeChannel(channel);
      };
    } catch (e) {
      console.error('Realtime subscription error:', e);
    }
  }, []);

  // Fetch today's productivity (daily) for the bar below XP bar - compute directly from tasks
  useEffect(() => {
    const fetchTodaysProductivity = async () => {
      try {
        // Use local time (system timezone) like backend to ensure date consistency
        const todayStr = new Date().toLocaleDateString('en-CA');
        
        console.log('📊 Computing today\'s productivity from tasks for date:', todayStr);
        console.log('📊 Current date state:', currentDate);
        console.log('📊 Date comparison - todayStr:', todayStr, 'currentDate:', currentDate);
        
        // Get current user ID
        const userData = localStorage.getItem('user');
        if (!userData) {
          console.error('No user data found');
          setTodaysProductivity(null);
          return;
        }
        
        const user = JSON.parse(userData);
        const userId = user.id || 11;
        
        console.log('📊 Computing productivity directly from tasks for user:', userId);
        
        // CORRECTED LOGIC: Compute productivity based on due dates (same as backend)
        // - Completed tasks: count by due_date (when they were supposed to be done)
        // - Pending tasks: count by due_date (when they're scheduled)
        // - Late completions (completed after due_date) don't count toward productivity
        
        // Get ALL completed tasks that were due today
        const { data: completedToday, error: completedError } = await supabase
          .from('tasks')
          .select('id, completed, completed_at, due_date')
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .eq('completed', true)
          .eq('due_date', todayStr)
          .not('completed_at', 'is', null);
        
        // Filter to only count tasks completed ON TIME (on or before due date)
        const completedOnTime = (completedToday || []).filter(task => {
          if (!task.completed_at) return false;
          const completedDate = new Date(task.completed_at);
          const completedDateStr = completedDate.toLocaleDateString('en-CA');
          const dueDateStr = task.due_date;
          
          // Only count if completed on or before the due date
          return completedDateStr <= dueDateStr;
        });
        
        // Get pending tasks due today
        const { data: pendingToday, error: pendingError } = await supabase
          .from('tasks')
          .select('id, completed, due_date')
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .eq('completed', false)
          .eq('due_date', todayStr);
        
        if (completedError || pendingError) {
          console.error('Error fetching tasks for productivity:', completedError || pendingError);
          return;
        }
        
        const completedCount = completedOnTime.length;
        const pendingCount = (pendingToday || []).length;
        const totalTasks = completedCount + pendingCount;
        const completedTasks = completedCount;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        console.log('📊 Productivity calculation:', {
          todayStr,
          completedOnTimeCount: completedCount,
          pendingCount,
          totalTasks,
          completionRate,
          note: 'Only counting tasks completed ON TIME (on or before due date)'
        });
        
        let status = 'Low Productive';
        if (completionRate >= 90) status = 'Highly Productive';
        else if (completionRate >= 70) status = 'Productive';
        else if (completionRate >= 40) status = 'Moderately Productive';
        
        console.log('📊 Computed productivity from tasks:', { totalTasks, completedTasks, completionRate, status });
        
        setTodaysProductivity((prev: any) => {
          const now = Date.now();
          if (completionRate > 0) {
            lastNonZeroUpdateRef.current = now;
          } else if (lastNonZeroUpdateRef.current && now - lastNonZeroUpdateRef.current < 2000 && prev) {
            return prev;
          }
          return {
            status,
            completion_rate: completionRate,
            total_tasks: totalTasks,
            completed_tasks: completedTasks
          } as any;
        });
      } catch (e) {
        console.error('Error computing today productivity from tasks:', e);
        // Don't set to null to avoid 0% flicker
      }
    };
    
    fetchTodaysProductivity();
    
    // Set up periodic refresh every 30 seconds (disabled to prevent conflicts)
    // const interval = setInterval(fetchTodaysProductivity, 30000);
    
    // Listen for date change events
    const handleDateChanged = () => {
      console.log('🔄 Date change event received, refreshing productivity data...');
      // Guard: don't overwrite with null if Supabase hasn't surfaced yet
      fetchTodaysProductivity();
    };
    
    window.addEventListener('dateChanged', handleDateChanged);
    
    return () => {
      // clearInterval(interval);
      window.removeEventListener('dateChanged', handleDateChanged);
    };
  }, []);

  // Manual refresh function for debugging
  const refreshProductivity = async () => {
    console.log('🚀 [refreshProductivity] STARTING - Manual productivity refresh...');
    try {
      // Get current user ID
      const userData = localStorage.getItem('user');
      if (!userData) {
        handle401();
        return;
      }
      
      const user = JSON.parse(userData);
      const userId = user.id || 11;
      
      // Use local time (system timezone) like backend to ensure date consistency
      const todayStr = new Date().toLocaleDateString('en-CA');
      console.log('📅 [refreshProductivity] Refreshing productivity for date:', todayStr);
      console.log('📅 [refreshProductivity] Current date state:', currentDate);
      console.log('📅 [refreshProductivity] User ID:', userId);
      
      // Retry mechanism to wait for backend to process the task completion
      let productivityData: { status: string; completion_rate: number; total_tasks: number; completed_tasks: number } | null = null;
      let retryCount = 0;
      const maxRetries = 5;
      
      while (retryCount < maxRetries && !productivityData) {
        console.log(`🔄 [refreshProductivity] ATTEMPT ${retryCount + 1}/${maxRetries} to fetch productivity data...`);
        
        // Add delay between retries
        if (retryCount > 0) {
          console.log(`⏳ [refreshProductivity] Waiting 1 second before retry...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
        }
        
        const cacheBuster = Date.now();
        console.log(`📊 [refreshProductivity] Cache buster: ${cacheBuster}`);
        
        console.log(`🔍 [refreshProductivity] Querying Supabase with params:`, {
          user_id: userId,
          period_type: 'daily',
          period_start: todayStr,
          period_end: todayStr
        });
        
        // CORRECTED: Compute productivity based on due dates (same as backend)
        const [completedTodayRP, pendingResult] = await Promise.all([
          supabase.from('tasks').select('id, completed_at, due_date').eq('user_id', userId).eq('is_deleted', false)
            .eq('completed', true).eq('due_date', todayStr).not('completed_at', 'is', null),
          supabase.from('tasks').select('id').eq('user_id', userId).eq('is_deleted', false).eq('completed', false).eq('due_date', todayStr)
        ]);
        
        if (completedTodayRP.error || pendingResult.error) {
          console.error(`❌ [refreshProductivity] Tasks error:`, completedTodayRP.error || pendingResult.error);
          retryCount++;
          continue;
        }
        
        // Filter to only count tasks completed ON TIME (on or before due date)
        const completedOnTimeRP = (completedTodayRP.data || []).filter(task => {
          if (!task.completed_at) return false;
          const completedDate = new Date(task.completed_at);
          const completedDateStr = completedDate.toLocaleDateString('en-CA');
          const dueDateStr = task.due_date;
          
          // Only count if completed on or before the due date
          return completedDateStr <= dueDateStr;
        });
        
        const completedCount = completedOnTimeRP.length;
        const pendingCount = (pendingResult.data || []).length;
        
        console.log(`📥 [refreshProductivity] ATTEMPT ${retryCount + 1} - Tasks result:`, { 
          completedOnTime: completedCount, 
          pendingToday: pendingCount,
          note: 'Only counting tasks completed ON TIME (on or before due date)'
        });
        
        if (completedTodayRP.data || pendingResult.data) {
          const totalTasks = completedCount + pendingCount;
          const completedTasks = completedCount;
          const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          
          let status = 'Low Productive';
          if (completionRate >= 90) status = 'Highly Productive';
          else if (completionRate >= 70) status = 'Productive';
          else if (completionRate >= 40) status = 'Moderately Productive';
          
          productivityData = {
            status,
            completion_rate: completionRate,
            total_tasks: totalTasks,
            completed_tasks: completedTasks
          };
          console.log(`✅ [refreshProductivity] COMPUTED DATA on attempt ${retryCount + 1}:`, productivityData);
        } else {
          console.log(`⏳ [refreshProductivity] No tasks found on attempt ${retryCount + 1}, retrying...`);
          retryCount++;
        }
      }
      
      if (productivityData) {
        console.log('✅ [refreshProductivity] SUCCESS - Found productivity data:', productivityData);
        console.log('🔄 [refreshProductivity] Setting todaysProductivity state:', {
          status: productivityData.status,
          completion_rate: productivityData.completion_rate,
          total_tasks: productivityData.total_tasks,
          completed_tasks: productivityData.completed_tasks
        });
        setTodaysProductivity((prev: any) => {
          const now = Date.now();
          if (productivityData && (productivityData.completion_rate ?? 0) > 0) {
            lastNonZeroUpdateRef.current = now;
          } else if (lastNonZeroUpdateRef.current && now - lastNonZeroUpdateRef.current < 2000 && prev) {
            return prev;
          }
          return {
            status: productivityData?.status || 'Low Productive',
            completion_rate: productivityData?.completion_rate || 0,
            total_tasks: productivityData?.total_tasks || 0,
            completed_tasks: productivityData?.completed_tasks || 0
          } as any;
        });
      } else {
        console.log(`❌ [refreshProductivity] FAILED - No tasks found after ${maxRetries} attempts`);
        console.log('⚠️ [refreshProductivity] No tasks for today - keeping existing data to avoid 0% flicker');
        // Don't set to null to avoid 0% drop
      }
      
      // Refresh streak data and recalculate current streak
      console.log('🔄 Manual refresh - Refreshing streak data...');
      const freshStreakData = await fetchStreakData();
      setStreakData(freshStreakData);
      
      // Recalculate current streak with fresh data (use latest todaysProductivity state)
      const latestToday = (typeof window !== 'undefined') ? undefined : undefined; // placeholder to avoid SSR warnings
      const todayForStreak = (productivityData ? {
        status: productivityData.status,
        completion_rate: productivityData.completion_rate,
        total_tasks: productivityData.total_tasks,
        completed_tasks: productivityData.completed_tasks
      } : null) || (typeof todaysProductivity === 'object' ? todaysProductivity : null);

      const currentStreak = calculateCurrentStreakFromData(freshStreakData, todayForStreak as any);
      
      console.log('🔄 Manual refresh - Updated current streak:', currentStreak);
      
      // Update stats with the fresh streak value
      setStats((prevStats: any) => ({ ...prevStats, streak: currentStreak }));
      
      // Also refresh weekly/monthly data if we're in those views
      console.log('🔄 Manual refresh - Current progressView:', progressView);
      if (progressView === 'Weekly' || progressView === 'Monthly') {
        console.log('🔄 Manual refresh - Triggering productivity data refresh for', progressView, 'view');
        // Force clear the productivity logs to trigger fresh fetch
        setProdLogs([]);
        // Trigger the main useEffect to refresh weekly/monthly data
        setRefreshKey(prev => prev + 1);
        // Force another refresh after a short delay
        setTimeout(() => {
          console.log('🔄 Manual refresh - Secondary refresh for', progressView, 'view');
          setRefreshKey(prev => prev + 1);
        }, 500);
      }
      
    } catch (e) {
      console.error('Error refreshing productivity:', e);
    }
  };

  // Fetch productivity status when progressView changes
  useEffect(() => {
    // DISABLED: Django backend API calls are corrupting data
    // Now using Supabase only (fetchProdLogs handles all data)
    console.log('⚠️ Django backend API disabled - using Supabase only');
    setProductivity(null);
    setYesterdayProductivity(null);
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
        if (import.meta.env.DEV) {
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
          
          console.log('📊 Daily view query parameters:', {
            selectedDate: selectedDate.toISOString(),
            year,
            month,
            monthStart,
            monthEnd,
            isSeptember2025: year === 2025 && month === 9
          });
          
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
          console.log('🚨 WEEKLY VIEW: Starting aggregation process 🚨');
          console.log('📊 Weekly view: fetching data for year', year, 'from', yearStart, 'to', yearEnd);
          
          const { data: dailyLogs, error } = await supabase
            .from('productivity_logs')
            .select('*')
            .eq('user_id', userId)
            .eq('period_type', 'daily')
            .gte('period_start', yearStart)
            .lte('period_start', yearEnd)
            .order('period_start', { ascending: true });
          
          // FORCE INCLUDE TODAY'S DATA - Use the same data as Today's Productivity Scale
          const todayStr = new Date().toLocaleDateString('en-CA');
          console.log('🚨 FORCING TODAY\'S DATA INTO WEEKLY CALCULATION 🚨');
          console.log('Today string:', todayStr);
          console.log('TodaysProductivity state:', todaysProductivity);
          
          // Always use todaysProductivity state if available (same as Today's Productivity Scale)
          if (todaysProductivity) {
            console.log('📊 USING TODAY\'S PRODUCTIVITY STATE FOR WEEKLY CALCULATION');
            const todayLogFromState = {
              period_start: todayStr,
              period_end: todayStr,
              period_type: 'daily',
              user_id: userId,
              total_tasks: todaysProductivity.total_tasks,
              completed_tasks: todaysProductivity.completed_tasks,
              completion_rate: todaysProductivity.completion_rate,
              status: todaysProductivity.status,
              logged_at: new Date().toISOString()
            };
            
            // Remove any existing today's data and add fresh data
            if (dailyLogs) {
              const existingTodayIndex = dailyLogs.findIndex(log => log.period_start === todayStr);
              if (existingTodayIndex !== -1) {
                dailyLogs[existingTodayIndex] = todayLogFromState;
                console.log('📊 REPLACED existing today\'s data in dailyLogs for weekly calculation');
              } else {
                dailyLogs.push(todayLogFromState);
                console.log('📊 ADDED today\'s data to dailyLogs for weekly calculation');
              }
            }
          } else {
            // Fallback: Compute today's data directly from tasks (CORRECTED: by due date)
            console.log('📊 COMPUTING TODAY\'S DATA FROM TASKS FOR WEEKLY CALCULATION');
            const [completedTodayW, pendingTodayW] = await Promise.all([
              supabase.from('tasks').select('id, completed_at, due_date').eq('user_id', userId).eq('is_deleted', false)
                .eq('completed', true).eq('due_date', todayStr).not('completed_at', 'is', null),
              supabase.from('tasks').select('id').eq('user_id', userId).eq('is_deleted', false).eq('completed', false).eq('due_date', todayStr)
            ]);
            
            if (!completedTodayW.error && !pendingTodayW.error) {
              // Filter to only count tasks completed ON TIME (on or before due date)
              const completedOnTimeW = (completedTodayW.data || []).filter(task => {
                if (!task.completed_at) return false;
                const completedDate = new Date(task.completed_at);
                const completedDateStr = completedDate.toLocaleDateString('en-CA');
                const dueDateStr = task.due_date;
                
                // Only count if completed on or before the due date
                return completedDateStr <= dueDateStr;
              });
              
              const completedCount = completedOnTimeW.length;
              const pendingCount = (pendingTodayW.data || []).length;
              const totalTasks = completedCount + pendingCount;
              const completedTasks = completedCount;
              const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
              
              let status = 'Low Productive';
              if (completionRate >= 90) status = 'Highly Productive';
              else if (completionRate >= 70) status = 'Productive';
              else if (completionRate >= 40) status = 'Moderately Productive';
              
              const todayLogFromTasks = {
                period_start: todayStr,
                period_end: todayStr,
                period_type: 'daily',
                user_id: userId,
                total_tasks: totalTasks,
                completed_tasks: completedTasks,
                completion_rate: completionRate,
                status: status,
                logged_at: new Date().toISOString()
              };
              
              console.log('📊 Computed today\'s data from tasks for weekly:', todayLogFromTasks);
              
              if (dailyLogs) {
                const existingTodayIndex = dailyLogs.findIndex(log => log.period_start === todayStr);
                if (existingTodayIndex !== -1) {
                  dailyLogs[existingTodayIndex] = todayLogFromTasks;
                  console.log('📊 REPLACED existing today\'s data with computed data');
                } else {
                  dailyLogs.push(todayLogFromTasks);
                  console.log('📊 ADDED computed today\'s data to dailyLogs');
                }
              }
            } else {
              console.log('📊 No tasks found for today or error:', completedTodayW.error || pendingTodayW.error);
            }
          }
          
          if (error) {
            console.error('Error fetching daily logs for weekly aggregation:', error);
          } else {
            console.log('📊 Daily logs for weekly aggregation:', dailyLogs);
            console.log('📊 Number of daily logs:', dailyLogs?.length || 0);
            
            // VERIFY TODAY'S DATA IS INCLUDED
            const todayStr = new Date().toLocaleDateString('en-CA');
            const todayLog = dailyLogs?.find(log => log.period_start === todayStr);
            console.log('🚨 VERIFICATION: Today\'s data in dailyLogs:', todayLog);
            if (todayLog) {
              console.log('✅ Today\'s data found in dailyLogs for weekly calculation');
              console.log('📊 Today\'s completion rate:', todayLog.completion_rate);
              console.log('📊 Today\'s status:', todayLog.status);
            } else {
              console.log('❌ Today\'s data NOT found in dailyLogs for weekly calculation');
            }
            
            // Log specific data for Sep 23
            const sep23Log = dailyLogs?.find(log => log.period_start === '2025-09-23');
            console.log('📊 Sep 23 log found:', sep23Log);
            if (sep23Log) {
              console.log('📊 Sep 23 completion rate:', sep23Log.completion_rate);
              console.log('📊 Sep 23 status:', sep23Log.status);
            }
            
            // Log specific data for Sep 15-21
            const sep15_21Logs = dailyLogs?.filter(log => {
              const date = log.period_start;
              return date >= '2025-09-15' && date <= '2025-09-21';
            });
            console.log('🚨 SEP 15-21 LOGS FOUND:', sep15_21Logs);
            if (sep15_21Logs) {
              sep15_21Logs.forEach(log => {
                console.log(`  📅 ${log.period_start}: ${log.completion_rate}%`);
              });
            }
            
            // Aggregate daily logs into weekly data
            console.log('🚨 CALLING aggregateDailyToWeekly FUNCTION 🚨');
            data = aggregateDailyToWeekly(dailyLogs || []);
            console.log('📊 Aggregated weekly data:', data);
            // Log the specific week that should contain Sep 23
            const sep21_27Week = data.find(week => week.period_start === '2025-09-22');
            console.log('📊 Sep 22-28 week data:', sep21_27Week);
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
          
          // Also fetch today's data separately using the same query as Today's Productivity Scale
          const todayStr = new Date().toLocaleDateString('en-CA');
          const { data: todayLog, error: todayError } = await supabase
            .from('productivity_logs')
            .select('*')
            .eq('user_id', userId)
            .eq('period_type', 'daily')
            .eq('period_start', todayStr)
            .eq('period_end', todayStr)
            .single();
          
          if (todayLog && !todayError) {
            console.log('📊 Today\'s data fetched separately for monthly (same query as Today\'s Productivity):', todayLog);
            // Add today's data to dailyLogs if it's not already there
            const existingTodayIndex = dailyLogs?.findIndex(log => log.period_start === todayStr);
            if (existingTodayIndex === -1 || existingTodayIndex === undefined) {
              dailyLogs?.push(todayLog);
              console.log('📊 Added today\'s data to dailyLogs for monthly calculation');
            } else {
              // Update existing entry with fresh data
              if (dailyLogs) {
                dailyLogs[existingTodayIndex] = todayLog;
                console.log('📊 Updated existing today\'s data in dailyLogs for monthly calculation');
              }
            }
          } else {
            console.log('📊 No separate today\'s data found for monthly or error:', todayError);
            // If no data found, also check if we have todaysProductivity state
            if (todaysProductivity) {
              console.log('📊 Using todaysProductivity state for monthly calculation:', todaysProductivity);
              const todayLogFromState = {
                period_start: todayStr,
                period_end: todayStr,
                period_type: 'daily',
                user_id: userId,
                total_tasks: todaysProductivity.total_tasks,
                completed_tasks: todaysProductivity.completed_tasks,
                completion_rate: todaysProductivity.completion_rate,
                status: todaysProductivity.status,
                logged_at: new Date().toISOString()
              };
              const existingTodayIndex = dailyLogs?.findIndex(log => log.period_start === todayStr);
              if (existingTodayIndex === -1 || existingTodayIndex === undefined) {
                dailyLogs?.push(todayLogFromState);
                console.log('📊 Added today\'s data from state to dailyLogs for monthly calculation');
              } else {
                if (dailyLogs) {
                  dailyLogs[existingTodayIndex] = todayLogFromState;
                  console.log('📊 Updated existing today\'s data from state in dailyLogs for monthly calculation');
                }
              }
            } else {
              // Final fallback: Compute today's data directly from tasks for monthly (CORRECTED: by due date)
              console.log('📊 COMPUTING TODAY\'S DATA FROM TASKS FOR MONTHLY CALCULATION');
              const [completedTodayM, pendingTodayM] = await Promise.all([
                supabase.from('tasks').select('id, completed_at, due_date').eq('user_id', userId).eq('is_deleted', false)
                  .eq('completed', true).eq('due_date', todayStr).not('completed_at', 'is', null),
                supabase.from('tasks').select('id').eq('user_id', userId).eq('is_deleted', false).eq('completed', false).eq('due_date', todayStr)
              ]);
              
              if (!completedTodayM.error && !pendingTodayM.error) {
                // Filter to only count tasks completed ON TIME (on or before due date)
                const completedOnTimeM = (completedTodayM.data || []).filter(task => {
                  if (!task.completed_at) return false;
                  const completedDate = new Date(task.completed_at);
                  const completedDateStr = completedDate.toLocaleDateString('en-CA');
                  const dueDateStr = task.due_date;
                  
                  // Only count if completed on or before the due date
                  return completedDateStr <= dueDateStr;
                });
                
                const completedCount = completedOnTimeM.length;
                const pendingCount = (pendingTodayM.data || []).length;
                const totalTasks = completedCount + pendingCount;
                const completedTasks = completedCount;
                const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                
                let status = 'Low Productive';
                if (completionRate >= 90) status = 'Highly Productive';
                else if (completionRate >= 70) status = 'Productive';
                else if (completionRate >= 40) status = 'Moderately Productive';
                
                const todayLogFromTasks = {
                  period_start: todayStr,
                  period_end: todayStr,
                  period_type: 'daily',
                  user_id: userId,
                  total_tasks: totalTasks,
                  completed_tasks: completedTasks,
                  completion_rate: completionRate,
                  status: status,
                  logged_at: new Date().toISOString()
                };
                
                console.log('📊 Computed today\'s data from tasks for monthly:', todayLogFromTasks);
                
                const existingTodayIndex = dailyLogs?.findIndex(log => log.period_start === todayStr);
                if (existingTodayIndex === -1 || existingTodayIndex === undefined) {
                  dailyLogs?.push(todayLogFromTasks);
                  console.log('📊 Added computed today\'s data to dailyLogs for monthly');
                } else {
                  if (dailyLogs) {
                    dailyLogs[existingTodayIndex] = todayLogFromTasks;
                    console.log('📊 Updated existing today\'s data with computed data for monthly');
                  }
                }
              } else {
                console.log('📊 No tasks found for today or error for monthly:', completedTodayM.error || pendingTodayM.error);
              }
            }
          }
          
          if (error) {
            console.error('Error fetching daily logs for monthly aggregation:', error);
          } else {
            console.log('📊 Daily logs for monthly aggregation:', dailyLogs);
            // Aggregate daily logs into monthly data
            data = aggregateDailyToMonthly(dailyLogs || []);
            console.log('📊 Aggregated monthly data:', data);
          }
        }
        
        if (import.meta.env.DEV) {
          console.log('📊 Received productivity logs from Supabase:', data);
          console.log('📊 Total items received:', data.length);
          
          // Debug Sep 23 specifically
          const sep23Data = data.find(log => log.period_start === '2025-09-23');
          console.log('📊 Sep 23 data in Supabase response:', sep23Data);
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
        
        if (import.meta.env.DEV) {
          console.log('📊 Transformed data for ProductivityHistory:', transformedData);
          
          // Debug Sep 23 in transformed data
          const sep23Transformed = transformedData.find(item => item.date === '2025-09-23');
          console.log('📊 Sep 23 in transformed data:', sep23Transformed);
          
          // Debug weekly duplicates
          if (progressView === 'Weekly') {
            console.log('🔍 WEEKLY DATA DEBUG:');
            console.log('Total weeks:', transformedData.length);
            transformedData.forEach((week, idx) => {
              console.log(`  Week ${idx + 1}: ${week.week_start} to ${week.week_end} = ${week.log.completion_rate}%`);
            });
            
            // Check for duplicates
            const weekKeys = transformedData.map(w => w.week_start);
            const uniqueKeys = new Set(weekKeys);
            if (weekKeys.length !== uniqueKeys.size) {
              console.error('❌ DUPLICATE WEEKS FOUND!');
              const duplicates = weekKeys.filter((key, idx) => weekKeys.indexOf(key) !== idx);
              console.error('Duplicate week_start dates:', duplicates);
            }
          }
        }
        setProdLogs(transformedData);
      } catch (e) {
        console.error('Error fetching productivity logs from Supabase:', e);
        setProdLogs([]);
      }
    };
    fetchProdLogs();
  }, [progressView, selectedDate, refreshKey]);

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
      <div className="min-h-screen flex flex-col relative">
        {/* Modern Animated Background */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          {/* Clean Base - Darker background in dark mode for better contrast */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-[#0a0a0b] dark:via-[#0f0f12] dark:to-[#14141a]"></div>
          
          {/* Minimalist Geometric Elements - More vibrant in dark mode */}
          {/* Top-right corner accent */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-transparent to-transparent dark:from-indigo-500/15"></div>
          
          {/* Bottom-left corner accent */}
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-blue-500/8 via-transparent to-transparent dark:from-blue-500/12"></div>
          
          {/* Center-right subtle shape */}
          <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-bl from-purple-400/5 to-transparent dark:from-purple-500/10 rounded-full"></div>
          
          {/* Top-left subtle shape */}
          <div className="absolute top-1/4 left-1/6 w-48 h-48 bg-gradient-to-br from-cyan-400/6 to-transparent dark:from-cyan-500/10 rounded-full"></div>
          
          {/* Minimal grid pattern overlay - Removed in dark mode to avoid white lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px] dark:bg-transparent"></div>
          
          {/* Subtle gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/[0.01] dark:from-indigo-500/[0.02] dark:via-transparent dark:to-purple-500/[0.02]"></div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 min-h-screen">
          <div className="space-y-6">
            {/* Header */}
            <ProgressHeader greeting={greeting} username={user?.username || 'User'} />

            {/* Overview Section */}
            <div className="flex flex-col">
              <ProgressOverview
                key={`progress-overview-${refreshKey}`}
                userLevel={userLevel}
                todaysProductivity={todaysProductivity}
                streakData={streakData}
                refreshProductivity={refreshProductivity}
                getProductivityColor={getProductivityColor}
                username={user?.username || 'User'}
                avatar={userAvatar}
              />
            </div>

        {/* Stats Cards */}
        <StatsCards
          key={`stats-${stats.streak}-${refreshKey}`}
          stats={{ ...stats, streakData }}
          todaysProductivity={todaysProductivity}
        />

        {/* In-depth statistics (priority breakdown, weighted productivity) */}
        <StatsAnalysis
          tasksByPriority={stats.tasksByPriority ?? null}
          weightedProductivity={stats.weightedProductivity ?? null}
          totalTasksCompleted={stats.totalTasksCompleted}
        />

        {/* Productivity History (includes tabs below legend) */}
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
          setProgressView={setProgressView}
          tabs={TABS}
        />


            {/* Achievements */}
            <Achievements stats={stats} userLevel={userLevel} longestStreak={calculateLongestStreak(streakData)} />
          </div>
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

// Use centralized API base URL
// Note: using imported API_BASE_URL from config/api

function handle401() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

// Calculate current streak from backend streak data (same logic as StreaksCalendar)
function calculateCurrentStreakFromData(streakData: any[], todaysProductivity?: any) {
  console.log('🔥 calculateCurrentStreakFromData called with:', { 
    streakDataLength: streakData.length, 
    todaysProductivity 
  });
  
  // Sort by date (most recent first)
  const sortedData = [...streakData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  console.log('🔥 Sorted data:', sortedData.slice(0, 3));
  
  if (sortedData.length === 0) {
    console.log('🔥 No streak data, returning 0');
    return 0;
  }
  
  // Use the same date logic as the rest of the app (local date string)
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD format (local date)
  
  console.log('🔥 Current time debug:');
  console.log('🔥 Full date object:', now);
  console.log('🔥 ISO string (UTC):', now.toISOString());
  console.log('🔥 Local date string:', todayStr);
  console.log('🔥 Timezone offset (minutes):', now.getTimezoneOffset());
  console.log('🔥 Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  // Check if we have data for today
  let todayData = sortedData.find(day => day.date === todayStr);
  
  console.log('🔥 Today data from streakData:', todayData);
  console.log('🔥 Today string:', todayStr);
  console.log('🔥 Sorted data sample (first 5):', sortedData.slice(0, 5).map(d => ({ date: d.date, streak: d.streak, productivity: d.productivity })));
  
  // If no today's data in streakData, but we have todaysProductivity, use it
  if (!todayData && todaysProductivity) {
    console.log('🔥 Using todaysProductivity for streak calculation:', todaysProductivity);
    todayData = {
      date: todayStr,
      streak: todaysProductivity.total_tasks > 0 && todaysProductivity.completed_tasks > 0,
      productivity: todaysProductivity.completion_rate,
      total_tasks: todaysProductivity.total_tasks,
      completed_tasks: todaysProductivity.completed_tasks
    };
    // Add today's data to the beginning of sortedData for calculation
    sortedData.unshift(todayData);
    console.log('🔥 Added todaysProductivity to sortedData');
  }
  
  // NEW LOGIC: If today has no completed tasks yet, maintain yesterday's streak
  // Grace period: streak persists through midnight and only breaks if user doesn't complete tasks by end of day
  
  // Check if today has a streak (has completed tasks)
  const todayHasStreak = todayData && todayData.streak;
  
  let currentStreak = 0;
  let startFromDate: Date;
  
  if (!todayHasStreak) {
    console.log('🔥 Today has no completed tasks yet - checking yesterday to maintain streak');
    // Get yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');
    const yesterdayData = sortedData.find(day => day.date === yesterdayStr);
    
    console.log('🔥 Yesterday:', yesterdayStr);
    console.log('🔥 Yesterday data:', yesterdayData);
    console.log('🔥 ALL streak data around yesterday:');
    const relevantDays = sortedData.filter(d => d.date >= '2025-10-05' && d.date <= '2025-10-10');
    relevantDays.forEach(d => {
      console.log(`  ${d.date}: ${d.completed_tasks}/${d.total_tasks} tasks (${d.productivity}%) - Streak: ${d.streak}`);
    });
    
    // If yesterday had NO streak, the streak is broken
    if (!yesterdayData || !yesterdayData.streak) {
      console.log('🔥 ❌ Yesterday had no completed tasks - streak is broken, returning 0');
      console.log('🔥 DEBUG: yesterdayData exists?', !!yesterdayData);
      if (yesterdayData) {
        console.log('🔥 DEBUG: yesterdayData.streak value:', yesterdayData.streak);
        console.log('🔥 DEBUG: yesterdayData.total_tasks:', yesterdayData.total_tasks);
        console.log('🔥 DEBUG: yesterdayData.completed_tasks:', yesterdayData.completed_tasks);
      }
      return 0;
    }
    
    // Yesterday had a streak - count from yesterday (not including today since it has no tasks yet)
    console.log('🔥 ✅ Yesterday had a streak! Counting from yesterday backwards...');
    currentStreak = 1; // Count yesterday as day 1 of streak
    startFromDate = yesterday; // Start traversing from yesterday
  } else {
    console.log('🔥 Today has completed tasks - counting from today');
    currentStreak = 1; // Count today as day 1 of streak
    startFromDate = new Date(); // Start traversing from today
  }
  
  // Count backwards from the start date to find consecutive streak days
  for (let i = 1; i < 365; i++) {
    // Create a new Date object to avoid mutation issues
    const checkDate = new Date(startFromDate);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toLocaleDateString('en-CA');
    const dayData = sortedData.find(day => day.date === dateStr);
    
    console.log(`🔥 Day -${i} (${dateStr}):`, dayData ? `${dayData.productivity}% (streak: ${dayData.streak})` : 'No data');
    
    if (dayData && dayData.streak) {
      currentStreak++;
      console.log(`🔥 ✅ Consecutive day found! Total streak now: ${currentStreak}`);
    } else {
      console.log(`🔥 ❌ Streak broken at ${dateStr}. Final streak: ${currentStreak}`);
      break;
    }
  }
  
  console.log('🔥 Final current streak:', currentStreak, todayHasStreak ? '(counting from today)' : '(counting from yesterday - grace period)');
  return currentStreak;
}

// Calculate longest streak from historical data
function calculateLongestStreak(streakData: any[]) {
  if (!streakData || streakData.length === 0) return 0;
  
  // Create a set of productive dates for quick lookup
  const productiveDates = new Set();
  streakData.forEach(day => {
    if (day.streak) {
      productiveDates.add(day.date);
    }
  });
  
  if (productiveDates.size === 0) return 0;
  
  // Find all consecutive streaks by checking every day
  const streaks = [];
  let currentStreak = [];
  
  // Get date range from streak data
  const dates = Array.from(productiveDates).sort() as string[];
  const startDate = new Date(dates[0]);
  const endDate = new Date(dates[dates.length - 1]);
  
  // Check every day in the range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    if (productiveDates.has(dateStr)) {
      currentStreak.push(dateStr);
    } else {
      if (currentStreak.length > 0) {
        streaks.push(currentStreak);
        currentStreak = [];
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Don't forget the last streak
  if (currentStreak.length > 0) {
    streaks.push(currentStreak);
  }
  
  // Find the longest streak
  const longestStreak = Math.max(...streaks.map(streak => streak.length), 0);
  
  console.log('🏆 Longest streak calculation:', {
    totalProductiveDays: productiveDates.size,
    consecutiveStreaks: streaks.length,
    streakLengths: streaks.map(s => s.length),
    longestStreak
  });
  
  return longestStreak;
}

async function fetchUserStats() {
  try {
    // Get current user ID
    const userData = localStorage.getItem('user');
    if (!userData) {
      handle401();
      return { totalTasksCompleted: 0, totalStudyTime: 0, averageProductivity: 0, streak: 0, tasksByPriority: null, weightedProductivity: null };
    }
    
    const user = JSON.parse(userData);
    const userId = user.id || 11; // Fallback to your user ID
    
    console.log('📊 Fetching user stats from Supabase for user:', userId);
    
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('id, completed, priority')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (tasksError) {
      console.error('Supabase error fetching tasks:', tasksError);
      return { totalTasksCompleted: 0, totalStudyTime: 0, averageProductivity: 0, streak: 0, tasksByPriority: null, weightedProductivity: null };
    }

    const tasks = tasksData || [];
    const totalTasksCompleted = tasks.filter((t: any) => t.completed).length;

    const weights: Record<string, number> = { low: 1, medium: 2, high: 3 };
    const byPriority: Record<string, { completed: number; total: number }> = {
      low: { completed: 0, total: 0 },
      medium: { completed: 0, total: 0 },
      high: { completed: 0, total: 0 },
    };
    let totalWeight = 0;
    let completedWeight = 0;

    for (const t of tasks) {
      const p = (t.priority || 'medium').toLowerCase();
      const priority = ['low', 'medium', 'high'].includes(p) ? p : 'medium';
      const w = weights[priority];
      byPriority[priority].total += 1;
      totalWeight += w;
      if (t.completed) {
        byPriority[priority].completed += 1;
        completedWeight += w;
      }
    }

    const tasksByPriority = {
      low: byPriority.low,
      medium: byPriority.medium,
      high: byPriority.high,
    };
    const weightedProductivity = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : null;
    
    // Get total study time from study timer sessions (in minutes)
    // Get Supabase auth user ID (UUID) - this is what Supabase expects
    const { data: { user: supabaseAuthUser } } = await supabase.auth.getUser();
    const supabaseUserId = supabaseAuthUser?.id;
    
    let totalStudyTime = 0;
    if (supabaseUserId) {
      const { data: studySessions, error: studyError } = await supabase
        .from('study_timer_sessions')
        .select('duration')
        .eq('user_id', supabaseUserId) // Use Supabase auth UUID
        .eq('session_type', 'Study');
      
      if (!studyError && studySessions) {
        // Duration is in seconds, convert to minutes
        const totalSeconds = studySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        totalStudyTime = Math.round(totalSeconds / 60); // Convert to minutes
      } else if (studyError) {
        console.warn('Error fetching study timer sessions, using 0:', studyError);
        // Fallback to backend API if Supabase fails
        try {
          const response = await axiosInstance.get('/tasks/study-timer-sessions/');
          const backendSessions = response.data || [];
          const studySessions = backendSessions.filter((s: any) => s.session_type === 'Study');
          const totalSeconds = studySessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
          totalStudyTime = Math.round(totalSeconds / 60); // Convert to minutes
        } catch (apiError) {
          console.error('Error fetching study timer sessions from backend:', apiError);
        }
      }
    } else {
      console.warn('No Supabase auth user found, trying backend API fallback');
      // Fallback to backend API
      try {
        const response = await axiosInstance.get('/tasks/study-timer-sessions/');
        const backendSessions = response.data || [];
        const studySessions = backendSessions.filter((s: any) => s.session_type === 'Study');
        const totalSeconds = studySessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
        totalStudyTime = Math.round(totalSeconds / 60); // Convert to minutes
      } catch (apiError) {
        console.error('Error fetching study timer sessions from backend:', apiError);
      }
    }
    
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
      streak: 0,
      tasksByPriority,
      weightedProductivity,
    };

    console.log('📊 User stats from Supabase:', stats);
    return stats;
  } catch (e) {
    console.error('Error fetching user stats from Supabase:', e);
    return { totalTasksCompleted: 0, totalStudyTime: 0, averageProductivity: 0, streak: 0, tasksByPriority: null, weightedProductivity: null };
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
    
    // Get productivity logs from Supabase (last 365 days for complete streak calculation)
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];
    
    console.log('🔄 Date range: from', oneYearAgoStr, 'to today (365 days)');
    
    const { data: productivityLogs, error } = await supabase
      .from('productivity_logs')
      .select('period_start, completion_rate, total_tasks, completed_tasks, logged_at')
      .eq('user_id', userId)
      .eq('period_type', 'daily')
      .gte('period_start', oneYearAgoStr) // Get data for last 365 days
      .order('period_start', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching productivity logs from Supabase:', error);
      return [];
    }
    
    // Convert productivity logs to streak data format
    const rawStreakData = productivityLogs?.map(log => ({
      date: log.period_start,
      streak: log.total_tasks > 0 && log.completed_tasks > 0, // Same logic as backend
      productivity: log.completion_rate,
      total_tasks: log.total_tasks,
      completed_tasks: log.completed_tasks,
      logged_at: log.logged_at
    })) || [];
    
    // Deduplicate by date - keep the most recent entry for each date
    const dateMap = new Map();
    rawStreakData.forEach(entry => {
      const existing = dateMap.get(entry.date);
      if (!existing || new Date(entry.logged_at) > new Date(existing.logged_at)) {
        dateMap.set(entry.date, entry);
      }
    });
    
    // Inject today's status from tasks to avoid flicker if logs lag (CORRECTED: by due date)
    const todayStr = new Date().toLocaleDateString('en-CA');
    const [completedTodayStreak, pendingTodayStreak] = await Promise.all([
      supabase.from('tasks').select('id, completed_at, due_date').eq('user_id', userId).eq('is_deleted', false)
        .eq('completed', true).eq('due_date', todayStr).not('completed_at', 'is', null),
      supabase.from('tasks').select('id').eq('user_id', userId).eq('is_deleted', false).eq('completed', false).eq('due_date', todayStr)
    ]);
    
    // Filter to only count tasks completed ON TIME (on or before due date)
    const completedOnTimeStreak = (completedTodayStreak.data || []).filter(task => {
      if (!task.completed_at) return false;
      const completedDate = new Date(task.completed_at);
      const completedDateStr = completedDate.toLocaleDateString('en-CA');
      const dueDateStr = task.due_date;
      
      // Only count if completed on or before the due date
      return completedDateStr <= dueDateStr;
    });
    
    const completedCountToday = completedOnTimeStreak.length;
    const pendingCountToday = (pendingTodayStreak.data || []).length;
    const totalTasksToday = completedCountToday + pendingCountToday;
    const completedTasksToday = completedCountToday;
    const completionRateToday = totalTasksToday > 0 ? Math.round((completedTasksToday / totalTasksToday) * 100) : 0;
    const todayEntry = {
      date: todayStr,
      streak: totalTasksToday > 0 && completedTasksToday > 0,
      productivity: completionRateToday,
      total_tasks: totalTasksToday,
      completed_tasks: completedTasksToday,
      logged_at: new Date().toISOString()
    } as any;
    const existingToday = dateMap.get(todayStr);
    if (!existingToday || existingToday.productivity !== todayEntry.productivity || existingToday.streak !== todayEntry.streak) {
      dateMap.set(todayStr, todayEntry);
    }
    
    const streakData = Array.from(dateMap.values());
    
    console.log('✅ Raw streak data from Supabase (365 days):', rawStreakData.length, 'entries');
    console.log('✅ Deduplicated streak data:', streakData.length, 'days');
    console.log('🔍 Streak days:', streakData.filter((d: any) => d.streak).length);
    
    // Debug: Show recent entries specifically
    const recentEntries = streakData.filter(entry => 
      entry.date >= '2025-09-20' && entry.date <= '2025-09-25'
    );
    console.log('🔍 Recent entries (Sep 20-25):', recentEntries.length);
    console.log('🔍 Recent entries data:', JSON.stringify(recentEntries, null, 2));
    recentEntries.forEach(entry => {
      console.log(`  📅 ${entry.date}: ${entry.productivity}% (${entry.completed_tasks}/${entry.total_tasks}) - Streak: ${entry.streak}`);
    });
    
    // Debug: Show deduplication results
    console.log('🔍 Deduplication debug:');
    streakData.forEach(entry => {
      console.log(`  📅 ${entry.date}: ${entry.productivity}% (${entry.completed_tasks}/${entry.total_tasks}) - Streak: ${entry.streak}`);
    });
    
    // Debug: Show what would be the current streak
    const today = new Date().toISOString().split('T')[0];
    const todayData = streakData.find(day => day.date === today);
    console.log('🔥 TODAY DEBUG:', { today, todayData });
    if (todayData && todayData.streak) {
      console.log('🔥 Today has streak, checking consecutive days...');
      let testStreak = 1;
      let testDate = new Date(today);
      for (let i = 1; i < 10; i++) {
        testDate.setDate(testDate.getDate() - 1);
        const dateStr = testDate.toISOString().split('T')[0];
        const dayData = streakData.find(day => day.date === dateStr);
        if (dayData && dayData.streak) {
          testStreak++;
          console.log(`🔥 Day ${i}: ${dateStr} has streak, test streak: ${testStreak}`);
        } else {
          console.log(`🔥 Day ${i}: ${dateStr} no streak, breaking at ${testStreak}`);
          break;
        }
      }
      console.log('🔥 EXPECTED CURRENT STREAK:', testStreak);
    }
    
    return streakData;
  } catch (e) {
    console.error('❌ Error fetching streak data from Supabase:', e);
    return [];
  }
}


export default Progress;
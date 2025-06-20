import React, { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import LevelProgress from '../components/progress/LevelProgress';
import StatsCards from '../components/progress/StatsCards';
import WeeklyProgress from '../components/progress/WeeklyProgress';
import Achievements from '../components/progress/Achievements';

interface DailyProgress {
  date: string;
  tasksCompleted: number;
  studyTime: number;
  productivityScore: number;
}

interface WeeklyStats {
  totalTasksCompleted: number;
  totalStudyTime: number;
  averageProductivity: number;
  streak: number;
}

interface UserLevel {
  currentLevel: number;
  currentXP: number;
  xpToNextLevel: number;
}

const Progress = () => {
  const [user, setUser] = useState<any | null>(null);
  const [greeting, setGreeting] = useState('');
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    totalTasksCompleted: 0,
    totalStudyTime: 0,
    averageProductivity: 0,
    streak: 0
  });
  const [userLevel, setUserLevel] = useState<UserLevel>({
    currentLevel: 1,
    currentXP: 0,
    xpToNextLevel: 1000
  });

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

    // Load sample progress data
    loadSampleProgressData();
  }, []);

  const loadSampleProgressData = () => {
    // Generate sample data for the last 7 days
    const today = new Date();
    const sampleData: DailyProgress[] = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        tasksCompleted: Math.floor(Math.random() * 10),
        studyTime: Math.floor(Math.random() * 240), // Random study time in minutes
        productivityScore: Math.floor(Math.random() * 100)
      };
    });

    setDailyProgress(sampleData);

    // Calculate weekly stats
    const totalTasks = sampleData.reduce((sum, day) => sum + day.tasksCompleted, 0);
    const totalStudyTime = sampleData.reduce((sum, day) => sum + day.studyTime, 0);
    const avgProductivity = Math.floor(
      sampleData.reduce((sum, day) => sum + day.productivityScore, 0) / 7
    );

    // Calculate streak (consecutive days with productivity score > 50)
    let streak = 0;
    for (let i = 0; i < sampleData.length; i++) {
      if (sampleData[i].productivityScore > 50) {
        streak++;
      } else {
        break;
      }
    }

    setWeeklyStats({
      totalTasksCompleted: totalTasks,
      totalStudyTime,
      averageProductivity: avgProductivity,
      streak
    });

    // Calculate XP and level based on weekly performance
    const xpGained = (totalTasks * 50) + (totalStudyTime * 2) + (avgProductivity * 5);
    const currentXP = xpGained % 1000;
    const currentLevel = Math.floor(xpGained / 1000) + 1;
    const xpToNextLevel = 1000;

    setUserLevel({
      currentLevel,
      currentXP,
      xpToNextLevel
    });
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Progress
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track your productivity and achievements
          </p>
        </div>

        {/* Level Progress */}
        <LevelProgress
          currentLevel={userLevel.currentLevel}
          currentXP={userLevel.currentXP}
          xpToNextLevel={userLevel.xpToNextLevel}
        />

        {/* Stats Cards */}
        <StatsCards stats={weeklyStats} />

        {/* Weekly Progress */}
        <WeeklyProgress dailyProgress={dailyProgress} />

        {/* Achievements */}
        <Achievements stats={weeklyStats} />
      </div>
    </PageLayout>
  );
};

export default Progress;

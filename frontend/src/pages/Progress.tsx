import React, { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import StatsCards from '../components/progress/StatsCards';
import Achievements from '../components/progress/Achievements';
// New components
import LevelProgressRing from '../components/progress/LevelProgressRing';
import StreaksCalendar from '../components/progress/StreaksCalendar';
import MainChart from '../components/progress/MainChart';

const TABS = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

const Progress = () => {
  const [user, setUser] = useState<any | null>(null);
  const [greeting, setGreeting] = useState('');
  const [progressView, setProgressView] = useState('Weekly');
  const [stats, setStats] = useState<any>({
    totalTasksCompleted: 0,
    totalStudyTime: 0,
    averageProductivity: 0,
    streak: 0
  });
  const [userLevel, setUserLevel] = useState({ currentLevel: 1, currentXP: 0, xpToNextLevel: 1000 });

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
    // Optionally: set sample stats and userLevel here if needed
  }, []);

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Progress bar for LevelProgress
  const progressPercentage = Math.min(userLevel.currentXP / userLevel.xpToNextLevel, 1) * 100;

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

        {/* Level Progress and Streaks side by side */}
        <div className="flex flex-col md:flex-row md:space-x-8 items-center justify-center mb-4">
          {/* Level Progress with wide bar */}
          <div className="flex flex-col items-center w-full md:w-2/3 mb-6 md:mb-0">
            <div className="flex justify-center w-full mb-4">
              <LevelProgressRing
                currentLevel={userLevel.currentLevel}
                currentXP={userLevel.currentXP}
                xpToNextLevel={userLevel.xpToNextLevel}
                size={200}
              />
            </div>
            {/* Extra wide, thick Progress Bar */}
            <div className="w-full max-w-2xl mx-auto mt-2 mb-6">
              <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-base text-gray-500 dark:text-gray-400 mt-1">
                <span>{userLevel.currentXP} XP</span>
                <span>{userLevel.xpToNextLevel} XP</span>
              </div>
            </div>
          </div>
          {/* Streaks Calendar - heatmap style */}
          <div className="w-full md:w-1/3 flex justify-center">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 w-full max-w-md flex flex-col items-center">
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Streaks</h3>
              <StreaksCalendar streakData={[]} />
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

        {/* Main Chart Placeholder */}
        <MainChart view={progressView} data={{}} />

        {/* Achievements */}
        {/* <Achievements stats={stats} /> */}
      </div>
    </PageLayout>
  );
};

export default Progress;

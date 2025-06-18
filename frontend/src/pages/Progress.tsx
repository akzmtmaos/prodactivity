import React, { useEffect, useState } from 'react';
import { Flame, TrendingUp, Calendar, Clock, Target, Award } from 'lucide-react';
import PageLayout from '../components/PageLayout';

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
  };

  const getProductivityStatus = (score: number): { text: string; color: string } => {
    if (score >= 80) return { text: 'Highly Productive', color: 'text-green-600 dark:text-green-400' };
    if (score >= 60) return { text: 'Productive', color: 'text-blue-600 dark:text-blue-400' };
    if (score >= 40) return { text: 'Moderately Productive', color: 'text-yellow-600 dark:text-yellow-400' };
    return { text: 'Needs Improvement', color: 'text-red-600 dark:text-red-400' };
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Streak Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Flame size={24} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {weeklyStats.streak}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">Day Streak</p>
              </div>
            </div>
          </div>

          {/* Tasks Completed Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Target size={24} className="text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {weeklyStats.totalTasksCompleted}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">Tasks Completed</p>
              </div>
            </div>
          </div>

          {/* Study Time Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Clock size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.floor(weeklyStats.totalStudyTime / 60)}h {weeklyStats.totalStudyTime % 60}m
                </h3>
                <p className="text-gray-600 dark:text-gray-400">Study Time</p>
              </div>
            </div>
          </div>

          {/* Productivity Score Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <TrendingUp size={24} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {weeklyStats.averageProductivity}%
                </h3>
                <p className="text-gray-600 dark:text-gray-400">Productivity Score</p>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 mb-8">
          <div className="p-6">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <Calendar size={24} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="ml-4 text-xl font-semibold text-gray-900 dark:text-white">
                Weekly Progress
              </h2>
            </div>

            <div className="space-y-4">
              {dailyProgress.map((day) => {
                const productivityStatus = getProductivityStatus(day.productivityScore);
                return (
                  <div
                    key={day.date}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="w-24">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="ml-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {day.tasksCompleted} tasks completed • {Math.floor(day.studyTime / 60)}h {day.studyTime % 60}m study time
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="text-right mr-4">
                        <p className={`text-sm font-medium ${productivityStatus.color}`}>
                          {productivityStatus.text}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Score: {day.productivityScore}%
                        </p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-600">
                        <div
                          className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400"
                          style={{ width: `${day.productivityScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Achievement Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Award size={24} className="text-yellow-600 dark:text-yellow-400" />
              </div>
              <h2 className="ml-4 text-xl font-semibold text-gray-900 dark:text-white">
                Recent Achievements
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weeklyStats.streak >= 3 && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center">
                    <Flame size={20} className="text-orange-500" />
                    <h3 className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                      3-Day Streak
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Maintained productivity for 3 consecutive days
                  </p>
                </div>
              )}
              {weeklyStats.totalTasksCompleted >= 20 && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center">
                    <Target size={20} className="text-green-500" />
                    <h3 className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                      Task Master
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Completed 20 tasks in a week
                  </p>
                </div>
              )}
              {weeklyStats.totalStudyTime >= 600 && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center">
                    <Clock size={20} className="text-blue-500" />
                    <h3 className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                      Study Champion
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Studied for 10 hours in a week
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Progress;

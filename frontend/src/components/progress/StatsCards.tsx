import React, { useEffect } from 'react';
import { Flame, Target, Clock, TrendingUp } from 'lucide-react';

interface WeeklyStats {
  totalTasksCompleted: number;
  totalStudyTime: number;
  averageProductivity: number;
  streak: number;
}

interface StatsCardsProps {
  stats: WeeklyStats;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  // Debug: Log the stats received
  useEffect(() => {
    console.log('📊 StatsCards received stats:', stats);
    console.log('🔥 Day Streak value:', stats.streak);
  }, [stats]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Streak Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
            <Flame size={24} className="text-orange-600 dark:text-orange-400" />
          </div>
          <div className="ml-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.streak}
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
              {stats.totalTasksCompleted}
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
              {Math.floor(stats.totalStudyTime / 60)}h {stats.totalStudyTime % 60}m
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
              {stats.averageProductivity}%
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Productivity Score</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards; 
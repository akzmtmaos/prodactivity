import React from 'react';
import { Award, Flame, Target, Clock } from 'lucide-react';

interface WeeklyStats {
  totalTasksCompleted: number;
  totalStudyTime: number;
  averageProductivity: number;
  streak: number;
}

interface AchievementsProps {
  stats: WeeklyStats;
}

const Achievements: React.FC<AchievementsProps> = ({ stats }) => {
  return (
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
          {stats.streak >= 3 && (
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
          {stats.totalTasksCompleted >= 20 && (
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
          {stats.totalStudyTime >= 600 && (
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
  );
};

export default Achievements; 
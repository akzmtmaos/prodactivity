import React from 'react';
import { Calendar } from 'lucide-react';

interface DailyProgress {
  date: string;
  tasksCompleted: number;
  studyTime: number;
  productivityScore: number;
}

interface WeeklyProgressProps {
  dailyProgress: DailyProgress[];
}

const WeeklyProgress: React.FC<WeeklyProgressProps> = ({ dailyProgress }) => {
  const getProductivityStatus = (score: number): { text: string; color: string } => {
    if (score >= 80) return { text: 'Highly Productive', color: 'text-green-600 dark:text-green-400' };
    if (score >= 60) return { text: 'Productive', color: 'text-blue-600 dark:text-blue-400' };
    if (score >= 40) return { text: 'Moderately Productive', color: 'text-yellow-600 dark:text-yellow-400' };
    return { text: 'Needs Improvement', color: 'text-red-600 dark:text-red-400' };
  };

  return (
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
  );
};

export default WeeklyProgress; 
import React from 'react';
import { Star } from 'lucide-react';

interface LevelProgressProps {
  currentLevel: number;
  currentXP: number;
  xpToNextLevel: number;
}

const LevelProgress: React.FC<LevelProgressProps> = ({ currentLevel, currentXP, xpToNextLevel }) => {
  const progressPercentage = (currentXP / xpToNextLevel) * 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
            <Star size={24} className="text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="ml-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              Level {currentLevel}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Keep going!</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {currentXP} / {xpToNextLevel} XP
          </p>
        </div>
      </div>
      <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
};

export default LevelProgress; 
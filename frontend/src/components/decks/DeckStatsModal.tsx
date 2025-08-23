import React from 'react';
import { X, BarChart3, Target } from 'lucide-react';

interface DeckStats {
  totalCards: number;
  masteredCards: number;
  learningCards: number;
  newCards: number;
  averageScore: number;
  totalStudyTime: number; // in minutes
  lastStudied?: string;
  studyStreak: number;
  weeklyProgress: number[];
}

interface DeckStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckTitle: string;
  stats: DeckStats;
}

const DeckStatsModal: React.FC<DeckStatsModalProps> = ({
  isOpen,
  onClose,
  deckTitle,
  stats
}) => {
  if (!isOpen) return null;

  const getProgressColor = (percentage: number) => {
    if (percentage < 30) return 'bg-red-500';
    if (percentage < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const masteryPercentage = stats.totalCards > 0 ? Math.round((stats.masteredCards / stats.totalCards) * 100) : 0;

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: 0, padding: 0 }}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg mr-3">
              <BarChart3 size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Statistics
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {deckTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalCards}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Total Cards
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.masteredCards}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Mastered
              </div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.learningCards}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Learning
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {stats.newCards}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                New Cards
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Target size={18} className="mr-2" />
              Mastery Progress
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Overall Progress
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {masteryPercentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(masteryPercentage)}`}
                  style={{ width: `${masteryPercentage}%` }}
                ></div>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {stats.masteredCards} of {stats.totalCards} cards mastered
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckStatsModal;
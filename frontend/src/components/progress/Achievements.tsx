import React from 'react';
import { Award, Flame, Target, Clock, BookOpen, Calendar, Zap, Star, Trophy, CheckCircle, Lock } from 'lucide-react';

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

interface AchievementsProps {
  stats: WeeklyStats;
  userLevel?: UserLevel;
  longestStreak?: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'streak' | 'tasks' | 'study' | 'level' | 'productivity';
  requirement: number;
  unlocked: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const Achievements: React.FC<AchievementsProps> = ({ stats, userLevel, longestStreak = 0 }) => {
  // Define all achievements
  const allAchievements: Achievement[] = [
    // Streak Achievements
    {
      id: 'streak-3',
      title: 'Getting Started',
      description: 'Maintain productivity for 3 consecutive days',
      icon: <Flame size={20} className="text-orange-500" />,
      category: 'streak',
      requirement: 3,
      unlocked: longestStreak >= 3,
      rarity: 'common'
    },
    {
      id: 'streak-7',
      title: 'Week Warrior',
      description: 'Maintain productivity for 7 consecutive days',
      icon: <Flame size={20} className="text-red-500" />,
      category: 'streak',
      requirement: 7,
      unlocked: longestStreak >= 7,
      rarity: 'rare'
    },
    {
      id: 'streak-30',
      title: 'Month Master',
      description: 'Maintain productivity for 30 consecutive days',
      icon: <Flame size={20} className="text-purple-500" />,
      category: 'streak',
      requirement: 30,
      unlocked: longestStreak >= 30,
      rarity: 'legendary'
    },
    
    // Task Achievements
    {
      id: 'tasks-10',
      title: 'Task Starter',
      description: 'Complete 10 tasks',
      icon: <Target size={20} className="text-green-500" />,
      category: 'tasks',
      requirement: 10,
      unlocked: stats.totalTasksCompleted >= 10,
      rarity: 'common'
    },
    {
      id: 'tasks-50',
      title: 'Task Master',
      description: 'Complete 50 tasks',
      icon: <Target size={20} className="text-blue-500" />,
      category: 'tasks',
      requirement: 50,
      unlocked: stats.totalTasksCompleted >= 50,
      rarity: 'rare'
    },
    {
      id: 'tasks-100',
      title: 'Task Legend',
      description: 'Complete 100 tasks',
      icon: <Target size={20} className="text-purple-500" />,
      category: 'tasks',
      requirement: 100,
      unlocked: stats.totalTasksCompleted >= 100,
      rarity: 'epic'
    },
    
    // Study Achievements
    {
      id: 'study-5',
      title: 'Study Beginner',
      description: 'Study for 5 hours',
      icon: <Clock size={20} className="text-blue-500" />,
      category: 'study',
      requirement: 5,
      unlocked: stats.totalStudyTime >= 5,
      rarity: 'common'
    },
    {
      id: 'study-25',
      title: 'Study Champion',
      description: 'Study for 25 hours',
      icon: <Clock size={20} className="text-indigo-500" />,
      category: 'study',
      requirement: 25,
      unlocked: stats.totalStudyTime >= 25,
      rarity: 'rare'
    },
    {
      id: 'study-100',
      title: 'Study Sage',
      description: 'Study for 100 hours',
      icon: <Clock size={20} className="text-purple-500" />,
      category: 'study',
      requirement: 100,
      unlocked: stats.totalStudyTime >= 100,
      rarity: 'legendary'
    },
    
    // Level Achievements
    {
      id: 'level-5',
      title: 'Rising Star',
      description: 'Reach level 5',
      icon: <Star size={20} className="text-yellow-500" />,
      category: 'level',
      requirement: 5,
      unlocked: (userLevel?.currentLevel || 1) >= 5,
      rarity: 'common'
    },
    {
      id: 'level-10',
      title: 'Level Up',
      description: 'Reach level 10',
      icon: <Trophy size={20} className="text-orange-500" />,
      category: 'level',
      requirement: 10,
      unlocked: (userLevel?.currentLevel || 1) >= 10,
      rarity: 'rare'
    },
    {
      id: 'level-20',
      title: 'Elite Player',
      description: 'Reach level 20',
      icon: <Trophy size={20} className="text-purple-500" />,
      category: 'level',
      requirement: 20,
      unlocked: (userLevel?.currentLevel || 1) >= 20,
      rarity: 'epic'
    },
    
    // Productivity Achievements
    {
      id: 'productivity-80',
      title: 'Highly Productive',
      description: 'Achieve 80% productivity rate',
      icon: <Zap size={20} className="text-green-500" />,
      category: 'productivity',
      requirement: 80,
      unlocked: stats.averageProductivity >= 80,
      rarity: 'rare'
    },
    {
      id: 'productivity-95',
      title: 'Perfectionist',
      description: 'Achieve 95% productivity rate',
      icon: <Zap size={20} className="text-purple-500" />,
      category: 'productivity',
      requirement: 95,
      unlocked: stats.averageProductivity >= 95,
      rarity: 'legendary'
    }
  ];

  // Get rarity colors
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50';
      case 'rare':
        return 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'epic':
        return 'border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20';
      case 'legendary':
        return 'border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50';
    }
  };

  const getRarityTextColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'text-gray-600 dark:text-gray-400';
      case 'rare':
        return 'text-blue-600 dark:text-blue-400';
      case 'epic':
        return 'text-purple-600 dark:text-purple-400';
      case 'legendary':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const unlockedAchievements = allAchievements.filter(achievement => achievement.unlocked);
  const lockedAchievements = allAchievements.filter(achievement => !achievement.unlocked);

  return (
    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-100 dark:border-gray-700/50 rounded-2xl shadow-lg dark:shadow-indigo-500/10 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <Award size={24} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2 className="ml-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
              Achievements
            </h2>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-300 bg-gray-50/80 dark:bg-gray-700/80 px-3 py-1 rounded-xl">
            {unlockedAchievements.length} / {allAchievements.length} unlocked
          </div>
        </div>


        {/* Unlocked Achievements */}
        {unlockedAchievements.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <CheckCircle size={20} className="text-green-500 mr-2" />
              Unlocked ({unlockedAchievements.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unlockedAchievements.map((achievement) => (
                <div 
                  key={achievement.id}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-md bg-white/90 dark:bg-gray-750/90 backdrop-blur-sm ${getRarityColor(achievement.rarity)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        {achievement.icon}
                      </div>
                      <h4 className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {achievement.title}
                      </h4>
                    </div>
                    <CheckCircle size={16} className="text-green-500" />
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {achievement.description}
                  </p>
                  <div className="mt-3">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${getRarityTextColor(achievement.rarity)} bg-opacity-20`}>
                      {achievement.rarity.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked Achievements */}
        {lockedAchievements.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Lock size={20} className="text-gray-500 dark:text-gray-400 mr-2" />
              Locked ({lockedAchievements.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lockedAchievements.map((achievement) => (
                <div 
                  key={achievement.id}
                  className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 backdrop-blur-sm opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg opacity-50">
                        {achievement.icon}
                      </div>
                      <h4 className="ml-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                        {achievement.title}
                      </h4>
                    </div>
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    {achievement.description}
                  </p>
                  <div className="mt-3">
                    <span className="text-xs font-medium px-3 py-1 rounded-full text-gray-400 dark:text-gray-500 bg-gray-200/50 dark:bg-gray-600/50">
                      {achievement.rarity.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Achievements; 
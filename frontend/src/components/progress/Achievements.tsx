import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Award, Flame, Target, Clock, BookOpen, Calendar, Zap, Star, Trophy, CheckCircle, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
  const [awardedAchievements, setAwardedAchievements] = useState<Set<string>>(new Set());
  const isProcessingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const lastCheckedLevelRef = useRef<number>(userLevel?.currentLevel || 1);
  const lastStatsRef = useRef<WeeklyStats | null>(null);
  const justAwardedXPRef = useRef(false);

  // Load previously awarded achievements from DATABASE (not localStorage)
  // This effect runs once on mount to load from database
  useEffect(() => {
    const loadAwardedAchievements = async () => {
      try {
        const userData = localStorage.getItem('user');
        if (!userData) {
          hasLoadedRef.current = true;
          return;
        }

        const user = JSON.parse(userData);
        const userId = user?.id;
        if (!userId) {
          hasLoadedRef.current = true;
          return;
        }

        // Fetch all achievement XP logs from database
        const { data: achievementLogs, error } = await supabase
          .from('xp_logs')
          .select('description')
          .eq('user_id', userId)
          .eq('source', 'achievement_unlock');

        if (error) {
          console.error('Error loading awarded achievements from database:', error);
          hasLoadedRef.current = true;
          return;
        }

        // Store achievement descriptions in a Set for quick lookup
        // We'll map to IDs later when allAchievements is available
        const awardedDescriptions = new Set<string>();
        if (achievementLogs) {
          achievementLogs.forEach(log => {
            if (log.description) {
              awardedDescriptions.add(log.description);
            }
          });
        }

        // Store in a ref for later use
        (window as any).__awardedAchievementDescriptions = awardedDescriptions;
        hasLoadedRef.current = true;
        console.log(`📋 Loaded ${awardedDescriptions.size} awarded achievements from database`);
      } catch (err) {
        console.error('Error loading awarded achievements:', err);
        hasLoadedRef.current = true;
      }
    };

    loadAwardedAchievements();
  }, []); // Run once on mount

  // Get XP reward based on rarity
  const getXPReward = (rarity: string): number => {
    switch (rarity) {
      case 'common':
        return 25;
      case 'rare':
        return 50;
      case 'epic':
        return 100;
      case 'legendary':
        return 200;
      default:
        return 25;
    }
  };

  // Award XP for achievement - ONLY if not already awarded (checked in database)
  const awardAchievementXP = useCallback(async (achievement: Achievement) => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const userId = user?.id;
      if (!userId) return;

      const xpAmount = getXPReward(achievement.rarity);
      const achievementDescription = `Achievement unlocked: ${achievement.title} (${achievement.rarity})`;

      // FIRST: Check database to see if this achievement was already awarded
      const { data: existingLogs, error: checkError } = await supabase
        .from('xp_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('source', 'achievement_unlock')
        .eq('description', achievementDescription)
        .limit(1);

      if (checkError) {
        console.error('❌ Error checking existing achievement XP:', checkError);
        return;
      }

      // If already awarded, skip
      if (existingLogs && existingLogs.length > 0) {
        console.log(`⏭️  Achievement "${achievement.title}" already awarded, skipping`);
        // Mark as awarded in state
        setAwardedAchievements(prev => {
          const newAwarded = new Set(prev);
          newAwarded.add(achievement.id);
          return newAwarded;
        });
        return;
      }

      console.log(`🏆 Awarding ${xpAmount} XP for achievement: ${achievement.title}`);

      // Award XP only if not already in database
      const { error: xpError } = await supabase
        .from('xp_logs')
        .insert([{
          user_id: userId,
          xp_amount: xpAmount,
          source: 'achievement_unlock',
          description: achievementDescription,
          created_at: new Date().toISOString()
        }]);

      if (xpError) {
        console.error('❌ Error awarding achievement XP:', xpError);
      } else {
        console.log(`✅ Achievement XP awarded: +${xpAmount} XP for "${achievement.title}"`);
        
        // Mark achievement as awarded in state
        setAwardedAchievements(prev => {
          const newAwarded = new Set(prev);
          newAwarded.add(achievement.id);
          return newAwarded;
        });

        // Dispatch event to refresh user level
        window.dispatchEvent(new CustomEvent('achievementUnlocked', {
          detail: { achievement, xpAmount }
        }));

        // Show toast notification
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: {
            message: `🏆 Achievement Unlocked! +${xpAmount} XP`,
            type: 'success'
          }
        }));
      }
    } catch (err) {
      console.error('Error awarding achievement XP:', err);
    }
  }, []);

  // Define all achievements (memoized to prevent unnecessary recalculations)
  const allAchievements: Achievement[] = useMemo(() => [
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
  ], [stats, userLevel, longestStreak]);

  // Map awarded achievement descriptions to IDs after allAchievements is defined
  useEffect(() => {
    if (!hasLoadedRef.current || allAchievements.length === 0) {
      return;
    }

    const awardedDescriptions = (window as any).__awardedAchievementDescriptions as Set<string> | undefined;
    if (!awardedDescriptions) {
      return;
    }

    // Map descriptions to achievement IDs
    const awarded = new Set<string>();
    allAchievements.forEach(achievement => {
      const description = `Achievement unlocked: ${achievement.title} (${achievement.rarity})`;
      if (awardedDescriptions.has(description)) {
        awarded.add(achievement.id);
      }
    });

    setAwardedAchievements(awarded);
    console.log(`📋 Mapped ${awarded.size} awarded achievements to IDs`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAchievements.length]); // Run when allAchievements is defined

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

  // Check for newly unlocked achievements and award XP
  // ONLY when stats change, NOT when level changes (to prevent infinite loop)
  useEffect(() => {
    // Don't run if we haven't loaded from database yet
    if (!hasLoadedRef.current) {
      return;
    }

    // Don't run if we're already processing
    if (isProcessingRef.current) {
      return;
    }

    // Don't run if we just awarded XP (prevent immediate re-trigger)
    if (justAwardedXPRef.current) {
      return;
    }

    // Check if stats actually changed (not just a reference change)
    const statsChanged = !lastStatsRef.current || 
      lastStatsRef.current.totalTasksCompleted !== stats.totalTasksCompleted ||
      lastStatsRef.current.totalStudyTime !== stats.totalStudyTime ||
      lastStatsRef.current.averageProductivity !== stats.averageProductivity ||
      lastStatsRef.current.streak !== stats.streak;

    // ONLY check achievements when stats change, NOT when level changes
    if (!statsChanged) {
      // Update refs even if we don't process, to prevent false triggers
      if (lastStatsRef.current) {
        lastStatsRef.current = { ...stats };
      }
      return;
    }

    const checkAndAwardAchievements = async () => {
      // Set processing flag to prevent concurrent runs
      isProcessingRef.current = true;
      justAwardedXPRef.current = true; // Set this BEFORE processing

      try {
        // Update refs BEFORE processing to prevent re-triggering
        lastStatsRef.current = { ...stats };
        const currentLevel = userLevel?.currentLevel || 1;
        lastCheckedLevelRef.current = currentLevel;

        // Check ALL achievements (including level-based) when stats change
        // The database check in awardAchievementXP will prevent duplicates
        const newlyUnlocked = allAchievements.filter(
          achievement => achievement.unlocked && !awardedAchievements.has(achievement.id)
        );

        if (newlyUnlocked.length > 0) {
          console.log(`🎯 Found ${newlyUnlocked.length} newly unlocked achievement(s)`);
          // Award XP for each newly unlocked achievement
          // The awardAchievementXP function will check database to prevent duplicates
          for (const achievement of newlyUnlocked) {
            await awardAchievementXP(achievement);
            // Small delay between awards to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      } finally {
        // Reset flags after a delay to allow state updates to settle
        setTimeout(() => {
          isProcessingRef.current = false;
          justAwardedXPRef.current = false;
        }, 5000);
      }
    };

    checkAndAwardAchievements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.totalTasksCompleted, stats.totalStudyTime, stats.averageProductivity, stats.streak, longestStreak, awardedAchievements]); // Only specific stat fields, NOT userLevel!


  const unlockedAchievements = allAchievements.filter(achievement => achievement.unlocked);
  const lockedAchievements = allAchievements.filter(achievement => !achievement.unlocked);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <Award size={24} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2 className="ml-4 text-xl font-semibold text-gray-900 dark:text-white">
              Achievements
            </h2>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
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
                  className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${getRarityColor(achievement.rarity)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {achievement.icon}
                      <h4 className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                        {achievement.title}
                      </h4>
                    </div>
                    <CheckCircle size={16} className="text-green-500" />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {achievement.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getRarityTextColor(achievement.rarity)} bg-opacity-20`}>
                      {achievement.rarity.toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      +{getXPReward(achievement.rarity)} XP
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
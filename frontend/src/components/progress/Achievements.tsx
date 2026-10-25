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

  const totalAchievements = allAchievements.length;
  const completion = totalAchievements > 0 ? (unlockedAchievements.length / totalAchievements) * 100 : 0;

  const rarityDot: Record<string, string> = {
    common: 'bg-gray-400',
    rare: 'bg-blue-500',
    epic: 'bg-purple-500',
    legendary: 'bg-amber-500',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-[#2f2f2f] dark:bg-[#1e1e1e]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3.5 py-2.5 dark:border-[#2f2f2f]">
        <div className="flex items-center gap-2">
          <Award size={14} className="text-gray-400 dark:text-gray-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Achievements</span>
        </div>
        <span className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
          {unlockedAchievements.length} / {totalAchievements} unlocked
        </span>
      </div>
      <div className="h-1 w-full bg-gray-100 dark:bg-[#262626]">
        <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${completion}%` }} />
      </div>

      <div className="space-y-4 px-3.5 py-3">
        {unlockedAchievements.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <CheckCircle size={12} className="text-green-500" />
              Unlocked
              <span className="tabular-nums">({unlockedAchievements.length})</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {unlockedAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex gap-2.5 rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2.5 transition-colors hover:bg-gray-50 dark:border-[#2f2f2f] dark:bg-[#242424] dark:hover:bg-[#282828]"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white dark:border-[#333333] dark:bg-[#1e1e1e]">
                    {achievement.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-gray-900 dark:text-white">
                        {achievement.title}
                      </span>
                      <CheckCircle size={13} className="mt-0.5 flex-shrink-0 text-green-500" />
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                      {achievement.description}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <span className={`h-1.5 w-1.5 rounded-full ${rarityDot[achievement.rarity]}`} />
                        {achievement.rarity}
                      </span>
                      <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                        +{getXPReward(achievement.rarity)} XP
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {lockedAchievements.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <Lock size={12} />
              Locked
              <span className="tabular-nums">({lockedAchievements.length})</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {lockedAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex gap-2.5 rounded-lg border border-dashed border-gray-200 px-3 py-2.5 opacity-75 dark:border-[#333333]"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 grayscale dark:bg-[#262626]">
                    {achievement.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-gray-600 dark:text-gray-300">
                        {achievement.title}
                      </span>
                      <Lock size={13} className="mt-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                      {achievement.description}
                    </p>
                    <span className="mt-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      <span className={`h-1.5 w-1.5 rounded-full ${rarityDot[achievement.rarity]} opacity-60`} />
                      {achievement.rarity} · +{getXPReward(achievement.rarity)} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Achievements; 
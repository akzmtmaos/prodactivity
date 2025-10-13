import React, { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import axiosInstance from '../utils/axiosConfig';
import { Flame, Trophy, FileText, Layers, BookOpen, CheckSquare, Brain, HelpCircle, Calendar, Clock, BarChart3, Settings, Notebook, Star, Target, Zap, Lock, CheckCircle, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState({
    longestStreak: 0,
    totalXP: 0,
    totalNotebooks: 0,
    totalNotes: 0,
    totalDecks: 0,
    totalFlashcards: 0,
    totalTasks: 0,
    totalReviewer: 0,
    totalQuiz: 0,
    totalSchedule: 0,
    totalStudyHours: 0,
  });
  const [userLevel, setUserLevel] = useState({ currentLevel: 1, currentXP: 0, xpToNextLevel: 100 });
  const [averageProductivity, setAverageProductivity] = useState(0);

  useEffect(() => {
    // Function to load user data
    const loadUserData = () => {
      const rawUser = localStorage.getItem('user');
      try {
        const parsed = rawUser ? JSON.parse(rawUser) : null;
        // Normalize stored shape: some places store { user: {...} }
        setUser(parsed && typeof parsed === 'object' && parsed.user ? parsed.user : parsed);
      } catch {
        setUser(null);
      }
    };

    // Load initial user data
    loadUserData();

    // Listen for profile updates from Settings page
    const handleProfileUpdate = (event: any) => {
      console.log('🔄 Profile page: User profile update detected', event.detail);
      if (event.detail && event.detail.user) {
        setUser(event.detail.user);
      } else {
        loadUserData(); // Fallback to reloading from localStorage
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);

    // Achievements will be calculated dynamically based on stats
    
    // Try to fetch fresh user data from backend
    (async () => {
      try {
        const res = await axiosInstance.get('/me/');
        if (res?.data) {
          setUser((prev: any) => ({ ...prev, ...res.data }));
          // Also update localStorage for consistency
          const stored = localStorage.getItem('user');
          try {
            const parsedStored = stored ? JSON.parse(stored) : null;
            const merged = parsedStored && parsedStored.user
              ? { ...parsedStored, user: { ...parsedStored.user, ...res.data } }
              : { ...(parsedStored || {}), ...res.data };
            localStorage.setItem('user', JSON.stringify(merged));
          } catch {}
        }
      } catch (e) {
        // ignore if endpoint not available
      }
    })();

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    };

    // Fetch statistics from Supabase
    (async () => {
      try {
        const userData = localStorage.getItem('user');
        if (!userData) return;
        
        const user = JSON.parse(userData);
        const userId = user.id;

        if (!userId) {
          console.error('❌ No user ID found, cannot fetch statistics');
          return;
        }

        console.log('📊 Fetching profile statistics for user:', userId);

        // Fetch all data in parallel
        const [
          tasksData,
          xpData,
          notesData,
          notebooksData,
          decksData,
          flashcardsData,
          reviewerData,
          streakProductivityData
        ] = await Promise.all([
          // Tasks
          supabase.from('tasks').select('id, completed, time_spent_minutes, is_deleted').eq('user_id', userId).eq('is_deleted', false),
          // XP
          supabase.from('xp_logs').select('xp_amount').eq('user_id', userId),
          // Notes
          supabase.from('notes').select('id').eq('user_id', userId).eq('is_deleted', false),
          // Notebooks
          supabase.from('notebooks').select('id').eq('user_id', userId).eq('is_archived', false),
          // Decks
          supabase.from('decks').select('id').eq('user_id', userId),
          // Flashcards
          supabase.from('flashcards').select('id').eq('user_id', userId),
          // Reviewers (includes both reviewers and quizzes - quizzes have 'quiz' tag)
          supabase.from('reviewers').select('id, tags').eq('user_id', userId).eq('is_deleted', false),
          // Productivity logs for longest streak
          supabase.from('productivity_logs').select('period_start, completion_rate, total_tasks, completed_tasks').eq('user_id', userId).eq('period_type', 'daily').order('period_start', { ascending: true })
        ]);

        // Calculate totals
        const totalTasks = tasksData.data?.filter(t => t.completed).length || 0;
        const totalXP = xpData.data?.reduce((sum, log) => sum + (log.xp_amount || 0), 0) || 0;
        const totalNotes = notesData.data?.length || 0;
        const totalNotebooks = notebooksData.data?.length || 0;
        const totalDecks = decksData.data?.length || 0;
        const totalFlashcards = flashcardsData.data?.length || 0;
        
        // Separate quizzes from reviewers (quizzes have 'quiz' tag)
        const allReviewers = reviewerData.data || [];
        const totalQuiz = allReviewers.filter((r: any) => r.tags && Array.isArray(r.tags) && r.tags.includes('quiz')).length;
        const totalReviewer = allReviewers.filter((r: any) => !r.tags || !Array.isArray(r.tags) || !r.tags.includes('quiz')).length;
        
        // Calculate total study time in MINUTES (to match Progress page calculation)
        const totalStudyTimeMinutes = tasksData.data?.reduce((sum, task) => sum + (task.time_spent_minutes || 0), 0) || 0;
        const totalStudyHours = Math.round(totalStudyTimeMinutes / 60);

        // Calculate longest streak from productivity logs
        let longestStreak = 0;
        if (streakProductivityData.data && streakProductivityData.data.length > 0) {
          const parseYMD = (s: string) => {
            const [y, m, d] = s.split('-').map((v: string) => parseInt(v, 10));
            return new Date(y, (m || 1) - 1, d || 1);
          };
          const isConsecutive = (prev: Date, curr: Date) => {
            const next = new Date(prev);
            next.setDate(next.getDate() + 1);
            return next.getFullYear() === curr.getFullYear() && next.getMonth() === curr.getMonth() && next.getDate() === curr.getDate();
          };
          
          // Filter to only streak days (days with completed tasks)
          const streakDays = streakProductivityData.data
            .filter((d: any) => d.total_tasks > 0 && d.completed_tasks > 0)
            .map((d: any) => ({ ...d, _date: parseYMD(d.period_start) }))
            .sort((a: any, b: any) => a._date.getTime() - b._date.getTime());
          
          let best = 0;
          let cur = 0;
          let prev: Date | null = null;
          
          for (const d of streakDays) {
            if (!prev) {
              cur = 1;
            } else if (isConsecutive(prev, d._date)) {
              cur += 1;
            } else {
              cur = 1;
            }
            best = Math.max(best, cur);
            prev = d._date;
          }
          longestStreak = best;
        }

        console.log('📊 Profile statistics for user', userId, ':', {
          totalTasks,
          totalXP,
          totalNotes,
          totalNotebooks,
          totalDecks,
          totalFlashcards,
          totalQuiz,
          totalReviewer,
          totalStudyHours,
          longestStreak
        });

        // Verify data is user-specific
        console.log('✅ All data fetched with user_id filter:', userId);

        setStats({
          longestStreak,
          totalXP,
          totalNotebooks,
          totalNotes,
          totalDecks,
          totalFlashcards,
          totalTasks,
          totalReviewer,
          totalQuiz,
          totalSchedule: 0, // Schedule feature not implemented yet
          totalStudyHours,
        });
        
        // Calculate user level based on PROGRESSIVE XP system (matching Progress page)
        // Level 1: 0-100 XP, Level 2: 100-300 XP, Level 3: 300-600 XP, etc.
        let currentLevel = 1;
        let currentXP = totalXP;
        let xpToNextLevel = 100;
        let cumulativeXP = 0;
        
        for (let level = 1; level <= 100; level++) {
          const xpNeededForThisLevel = level * 100;
          cumulativeXP += xpNeededForThisLevel;
          
          if (totalXP < cumulativeXP) {
            currentLevel = level;
            currentXP = totalXP - (cumulativeXP - xpNeededForThisLevel);
            xpToNextLevel = xpNeededForThisLevel;
            break;
          } else if (totalXP === cumulativeXP) {
            currentLevel = level + 1;
            currentXP = 0;
            xpToNextLevel = (level + 1) * 100;
            break;
          }
        }
        
        // Cap at level 100
        if (totalXP >= 100 * 100 * 50) {
          currentLevel = 100;
          currentXP = totalXP;
          xpToNextLevel = 100 * 100;
        }
        
        setUserLevel({ currentLevel, currentXP, xpToNextLevel });
        
        // Get average productivity
        const { data: avgProductivityData, error: productivityError } = await supabase
          .from('productivity_logs')
          .select('completion_rate')
          .eq('user_id', userId)
          .order('logged_at', { ascending: false })
          .limit(30); // Last 30 entries for average
        
        let avgProd = 0;
        if (!productivityError && avgProductivityData && avgProductivityData.length > 0) {
          const totalRate = avgProductivityData.reduce((sum: number, log: any) => sum + log.completion_rate, 0);
          avgProd = Math.round(totalRate / avgProductivityData.length);
        }
        setAverageProductivity(avgProd);
        
        // Calculate achievements dynamically (EXACT same 14 achievements as Progress page)
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
            unlocked: totalTasks >= 10,
            rarity: 'common'
          },
          {
            id: 'tasks-50',
            title: 'Task Master',
            description: 'Complete 50 tasks',
            icon: <Target size={20} className="text-blue-500" />,
            category: 'tasks',
            requirement: 50,
            unlocked: totalTasks >= 50,
            rarity: 'rare'
          },
          {
            id: 'tasks-100',
            title: 'Task Legend',
            description: 'Complete 100 tasks',
            icon: <Target size={20} className="text-purple-500" />,
            category: 'tasks',
            requirement: 100,
            unlocked: totalTasks >= 100,
            rarity: 'epic'
          },
          
          // Study Achievements (use MINUTES to match Progress page)
          {
            id: 'study-5',
            title: 'Study Beginner',
            description: 'Study for 5 hours',
            icon: <Clock size={20} className="text-blue-500" />,
            category: 'study',
            requirement: 5,
            unlocked: totalStudyTimeMinutes >= 5,
            rarity: 'common'
          },
          {
            id: 'study-25',
            title: 'Study Champion',
            description: 'Study for 25 hours',
            icon: <Clock size={20} className="text-indigo-500" />,
            category: 'study',
            requirement: 25,
            unlocked: totalStudyTimeMinutes >= 25,
            rarity: 'rare'
          },
          {
            id: 'study-100',
            title: 'Study Sage',
            description: 'Study for 100 hours',
            icon: <Clock size={20} className="text-purple-500" />,
            category: 'study',
            requirement: 100,
            unlocked: totalStudyTimeMinutes >= 100,
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
            unlocked: currentLevel >= 5,
            rarity: 'common'
          },
          {
            id: 'level-10',
            title: 'Level Up',
            description: 'Reach level 10',
            icon: <Trophy size={20} className="text-orange-500" />,
            category: 'level',
            requirement: 10,
            unlocked: currentLevel >= 10,
            rarity: 'rare'
          },
          
          // Productivity Achievements
          {
            id: 'productivity-80',
            title: 'Highly Productive',
            description: 'Achieve 80% productivity rate',
            icon: <Zap size={20} className="text-green-500" />,
            category: 'productivity',
            requirement: 80,
            unlocked: avgProd >= 80,
            rarity: 'rare'
          },
          {
            id: 'productivity-95',
            title: 'Perfectionist',
            description: 'Achieve 95% productivity rate',
            icon: <Zap size={20} className="text-purple-500" />,
            category: 'productivity',
            requirement: 95,
            unlocked: avgProd >= 95,
            rarity: 'legendary'
          }
        ];
        
        // Only show unlocked achievements in Profile
        const unlockedOnly = allAchievements.filter(a => a.unlocked);
        setAchievements(unlockedOnly);
      } catch (e) {
        console.error('Error fetching profile statistics:', e);
      }
    })();
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase() || 'U';
  };

  const joinedLabel = (() => {
    const raw =
      user?.date_joined ||
      user?.created_at ||
      user?.createdAt ||
      user?.joinedAt ||
      user?.dateJoined ||
      user?.joined ||
      user?.signup_date;
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    const formatted = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    return formatted;
  })();
  
  // Get rarity colors (same as Progress page)
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

  // Profile only shows unlocked achievements (no locked section)

  return (
    <PageLayout>
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="w-24 h-24 rounded-full object-cover border-4 border-indigo-200 dark:border-indigo-800" />
              ) : (
                <span className="w-24 h-24 flex items-center justify-center rounded-full bg-indigo-600 text-white text-3xl font-bold border-4 border-indigo-200 dark:border-indigo-800">
                  {getInitials(user?.displayName || user?.username)}
                </span>
              )}
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">{user?.displayName || user?.username || 'Profile'}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Joined {joinedLabel || '—'}</p>
              </div>
            </div>
            
            {/* Settings Button */}
            <button
              onClick={() => navigate('/settings')}
              className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 flex items-center gap-2 text-gray-700 dark:text-gray-300"
              title="Edit Profile"
            >
              <Settings size={20} />
              <span className="text-sm font-medium">Edit Profile</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <BarChart3 size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="ml-4 text-xl font-semibold text-gray-900 dark:text-white">Statistics</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <Flame className="text-orange-500" size={20} />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Longest Streak</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.longestStreak}</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <Trophy className="text-yellow-500" size={20} />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total XP</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalXP}</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <Notebook className="text-purple-500" size={20} />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Notebooks</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalNotebooks}</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <FileText className="text-blue-500" size={20} />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Notes</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalNotes}</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <Layers className="text-indigo-500" size={20} />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Decks</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalDecks}</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <BookOpen className="text-green-600" size={20} />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Flashcards</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalFlashcards}</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <CheckSquare className="text-emerald-600" size={20} />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalTasks}</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <Brain className="text-purple-600" size={20} />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Reviewer</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalReviewer}</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <HelpCircle className="text-pink-600" size={20} />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Quiz</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalQuiz}</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <Calendar className="text-teal-600" size={20} />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Schedule</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalSchedule}</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <Clock className="text-sky-600" size={20} />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Study Hours</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalStudyHours}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements - Only Unlocked */}
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
              {achievements.length} unlocked
            </div>
          </div>

          {achievements.length === 0 ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              No achievements unlocked yet. Keep going!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement) => (
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
                  <div className="mt-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getRarityTextColor(achievement.rarity)} bg-opacity-20`}>
                      {achievement.rarity.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </PageLayout>
  );
};

export default Profile;



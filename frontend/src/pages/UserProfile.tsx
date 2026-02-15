import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Flame, Target, Clock, Star, Trophy, Zap, UserPlus, UserMinus, MessageCircle, Mail, GraduationCap, Calendar, CheckSquare, FileText, Layers, Brain, HelpCircle, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import axiosInstance from '../utils/axiosConfig';
import PageLayout from '../components/PageLayout';
import { getAvatarUrl } from '../components/chat/utils';

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

const UserProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any | null>(null);
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setError('Username is required');
      setLoading(false);
      return;
    }

    fetchUserProfile();
  }, [username]);

  useEffect(() => {
    if (profile?.id) {
      fetchUserStatistics();
    }
  }, [profile?.id]);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get(`/profile/${username}/`);
      const data = response.data;
      
      setProfile(data);
      setIsFollowing(data.is_following || false);
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
      setError(err.response?.data?.message || 'Failed to load profile');
      setLoading(false);
    }
  };

  const fetchUserStatistics = async () => {
    if (!username || !profile?.id) return;

    try {
      const userId = profile.id;

      // Fetch all statistics from Supabase
      const [
        tasksData,
        xpData,
        notesData,
        notebooksData,
        decksData,
        flashcardsData,
        reviewerData,
        streakProductivityData,
        eventsData
      ] = await Promise.all([
        supabase.from('tasks').select('id, completed, time_spent_minutes, is_deleted').eq('user_id', userId).eq('is_deleted', false),
        supabase.from('xp_logs').select('xp_amount').eq('user_id', userId),
        supabase.from('notes').select('id').eq('user_id', userId).eq('is_deleted', false),
        supabase.from('notebooks').select('id').eq('user_id', userId).eq('is_archived', false),
        supabase.from('decks').select('id').eq('user_id', userId),
        supabase.from('flashcards').select('id').eq('user_id', userId),
        supabase.from('reviewers').select('id, tags').eq('user_id', userId).eq('is_deleted', false),
        supabase.from('productivity_logs').select('period_start, completion_rate, total_tasks, completed_tasks').eq('user_id', userId).eq('period_type', 'daily').order('period_start', { ascending: true }),
        supabase.from('events').select('id').eq('user_id', userId)
      ]);

      const totalTasks = tasksData.data?.filter(t => t.completed).length || 0;
      const totalXP = xpData.data?.reduce((sum, log) => sum + (log.xp_amount || 0), 0) || 0;
      const totalNotes = notesData.data?.length || 0;
      const totalNotebooks = notebooksData.data?.length || 0;
      const totalDecks = decksData.data?.length || 0;
      const totalFlashcards = flashcardsData.data?.length || 0;
      const totalSchedule = eventsData.data?.length || 0;
      
      const allReviewers = reviewerData.data || [];
      const totalQuiz = allReviewers.filter((r: any) => r.tags && Array.isArray(r.tags) && r.tags.includes('quiz')).length;
      const totalReviewer = allReviewers.filter((r: any) => !r.tags || !Array.isArray(r.tags) || !r.tags.includes('quiz')).length;
      
      // Calculate total study time
      const { data: studySessions } = await supabase
        .from('study_timer_sessions')
        .select('duration')
        .eq('user_id', userId.toString())
        .eq('session_type', 'Study');
      
      let totalStudyTimeMinutes = 0;
      if (studySessions) {
        const totalSeconds = studySessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
        totalStudyTimeMinutes = Math.round(totalSeconds / 60);
      }
      
      const totalStudyHours = Math.round(totalStudyTimeMinutes / 60);

      // Calculate longest streak
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
            cur++;
          } else {
            best = Math.max(best, cur);
            cur = 1;
          }
          prev = d._date;
        }
        longestStreak = Math.max(best, cur);
      }

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
        totalSchedule,
        totalStudyHours,
      });

      // Calculate user level
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
      
      if (totalXP >= 100 * 100 * 50) {
        currentLevel = 100;
        currentXP = totalXP;
        xpToNextLevel = 100 * 100;
      }
      
      setUserLevel({ currentLevel, currentXP, xpToNextLevel });

      // Get average productivity
      const { data: avgProductivityData } = await supabase
        .from('productivity_logs')
        .select('completion_rate')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(30);
      
      let avgProd = 0;
      if (avgProductivityData && avgProductivityData.length > 0) {
        const totalRate = avgProductivityData.reduce((sum: number, log: any) => sum + log.completion_rate, 0);
        avgProd = Math.round(totalRate / avgProductivityData.length);
      }
      setAverageProductivity(avgProd);

      // Calculate achievements
      const allAchievements: Achievement[] = [
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
        {
          id: 'study-5',
          title: 'Study Beginner',
          description: 'Study for 5 hours',
          icon: <Clock size={20} className="text-blue-500" />,
          category: 'study',
          requirement: 5,
          unlocked: totalStudyHours >= 5,
          rarity: 'common'
        },
        {
          id: 'study-25',
          title: 'Study Champion',
          description: 'Study for 25 hours',
          icon: <Clock size={20} className="text-indigo-500" />,
          category: 'study',
          requirement: 25,
          unlocked: totalStudyHours >= 25,
          rarity: 'rare'
        },
        {
          id: 'study-100',
          title: 'Study Sage',
          description: 'Study for 100 hours',
          icon: <Clock size={20} className="text-purple-500" />,
          category: 'study',
          requirement: 100,
          unlocked: totalStudyHours >= 100,
          rarity: 'legendary'
        },
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

      const unlockedOnly = allAchievements.filter(a => a.unlocked);
      setAchievements(unlockedOnly);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching user statistics:', err);
      setError('Failed to load statistics');
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!username || !profile || followLoading) return;
    
    try {
      setFollowLoading(true);
      if (isFollowing) {
        await axiosInstance.post(`/unfollow/${username}/`);
        setIsFollowing(false);
        setProfile((prev: any) => prev ? { ...prev, followers_count: Math.max(0, prev.followers_count - 1) } : null);
      } else {
        await axiosInstance.post(`/follow/${username}/`);
        setIsFollowing(true);
        setProfile((prev: any) => prev ? { ...prev, followers_count: prev.followers_count + 1 } : null);
      }
    } catch (err: any) {
      console.error('Error following/unfollowing:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!profile) return;
    navigate(`/chat/${profile.id}`);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50';
      case 'rare': return 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'epic': return 'border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20';
      case 'legendary': return 'border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50';
    }
  };

  const getRarityTextColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-600 dark:text-gray-400';
      case 'rare': return 'text-blue-600 dark:text-blue-400';
      case 'epic': return 'text-purple-600 dark:text-purple-400';
      case 'legendary': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error || !profile) {
    return (
      <PageLayout>
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 text-lg mb-4">{error || 'User not found'}</p>
            <button
              onClick={() => navigate('/chat')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              aria-label="Back"
            >
              Back
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const avatarUrl = profile.avatar ? getAvatarUrl(profile.avatar) : null;
  const progressPercentage = (userLevel.currentXP / userLevel.xpToNextLevel) * 100;

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={profile.username}
                    className="w-24 h-24 rounded-full object-cover border-4 border-indigo-200 dark:border-indigo-800"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border-4 border-indigo-200 dark:border-indigo-800">
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold text-3xl">
                      {profile.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {profile.username}
                  </h1>
                  {(profile.school || profile.course) && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {profile.school && <span>{profile.school}</span>}
                      {profile.course && profile.school && <span> • </span>}
                      {profile.course && <span>{profile.course}</span>}
                      {profile.year && <span> • {profile.year}</span>}
                    </p>
                  )}
                  {profile.bio && (
                    <p className="text-gray-700 dark:text-gray-300 text-sm max-w-md mt-2">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>
              {!profile.is_own_profile && (
                <div className="flex gap-3">
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isFollowing
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {followLoading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : isFollowing ? (
                      <>
                        <UserMinus size={18} />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus size={18} />
                        Follow
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleStartChat}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    <MessageCircle size={18} />
                    Message
                  </button>
                </div>
              )}
            </div>

            {/* Follow Stats */}
            <div className="flex gap-6">
              <div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {profile.followers_count || 0}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Followers</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {profile.following_count || 0}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Following</div>
              </div>
            </div>
          </div>
        </div>

        {/* Level Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Level {userLevel.currentLevel}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {userLevel.currentXP} / {userLevel.xpToNextLevel} XP to Level {userLevel.currentLevel + 1}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalXP}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total XP</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Statistics Grid - with icons to match own Profile Overview */}
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
                <CheckSquare className="text-emerald-600 dark:text-emerald-400" size={20} />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tasks Completed</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalTasks}</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <Flame className="text-orange-500" size={20} />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Longest Streak</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.longestStreak}</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <Clock className="text-sky-600 dark:text-sky-400" size={20} />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Study Hours</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalStudyHours}</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <Zap className="text-green-600 dark:text-green-400" size={20} />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg Productivity</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{averageProductivity}%</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <FileText className="text-blue-500" size={20} />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Notes</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalNotes}</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <Layers className="text-indigo-500" size={20} />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Decks</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalDecks}</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <Brain className="text-purple-600 dark:text-purple-400" size={20} />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Reviewers</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalReviewer}</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <HelpCircle className="text-pink-600 dark:text-pink-400" size={20} />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Quizzes</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalQuiz}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Achievements</h2>
          {achievements.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No achievements unlocked yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`border-2 rounded-lg p-4 ${getRarityColor(achievement.rarity)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">{achievement.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold ${getRarityTextColor(achievement.rarity)} mb-1`}>
                        {achievement.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {achievement.description}
                      </p>
                      <span className={`inline-block mt-2 text-xs px-2 py-1 rounded ${getRarityTextColor(achievement.rarity)}`}>
                        {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default UserProfile;


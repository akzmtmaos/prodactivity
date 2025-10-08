import React, { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import axiosInstance from '../utils/axiosConfig';
import { Flame, Trophy, FileText, Layers, BookOpen, CheckSquare, Brain, HelpCircle, Calendar, Clock, BarChart3, Settings, Notebook } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedAt?: string;
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

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    try {
      const parsed = rawUser ? JSON.parse(rawUser) : null;
      // Normalize stored shape: some places store { user: {...} }
      setUser(parsed && typeof parsed === 'object' && parsed.user ? parsed.user : parsed);
    } catch {
      setUser(null);
    }

    // Placeholder achievements; replace with API data when available
    setAchievements([
      { id: 'streak_7', title: '7-Day Streak', description: 'Studied for 7 consecutive days' },
      { id: 'first_review', title: 'First Reviewer', description: 'Generated your first reviewer' },
      { id: 'quiz_master', title: 'Quiz Master', description: 'Completed 10 quizzes' },
    ]);
    
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
          productivityData
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
        
        const totalStudyHours = Math.round((tasksData.data?.reduce((sum, task) => sum + (task.time_spent_minutes || 0), 0) || 0) / 60);

        // Calculate longest streak from productivity logs
        let longestStreak = 0;
        if (productivityData.data && productivityData.data.length > 0) {
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
          const streakDays = productivityData.data
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

      {/* Achievements */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Trophy size={24} className="text-yellow-600 dark:text-yellow-400" />
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
              No achievements yet. Keep going!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((a) => (
                <div 
                  key={a.id} 
                  className="p-4 rounded-lg border-2 border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 transition-all duration-200 hover:scale-105"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Trophy size={20} className="text-blue-500" />
                      <h4 className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                        {a.title}
                      </h4>
                    </div>
                    <CheckSquare size={16} className="text-green-500" />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {a.description}
                  </p>
                  <div className="mt-2">
                    <span className="text-xs font-medium px-2 py-1 rounded-full text-blue-600 dark:text-blue-400">
                      UNLOCKED
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



import React, { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import axiosInstance from '../utils/axiosConfig';
import { Flame, Trophy, FileText, Layers, BookOpen, CheckSquare, Brain, HelpCircle, Calendar, Clock } from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedAt?: string;
}

const Profile: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState({
    longestStreak: 0,
    totalXP: 0,
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

    // Fetch statistics
    (async () => {
      // Helper to get count from various list endpoints
      const getCount = (data: any): number => {
        if (!data) return 0;
        if (typeof data.count === 'number') return data.count;
        if (Array.isArray(data)) return data.length;
        if (Array.isArray(data.results)) return data.results.length;
        return 0;
      };

      try {
        // Progress stats
        const [progressRes, levelRes] = await Promise.all([
          axiosInstance.get('/progress/stats/'),
          axiosInstance.get('/progress/level/'),
        ]);

        const totalStudyTime = progressRes?.data?.totalStudyTime || 0; // minutes or units
        const totalQuizzesCompleted = progressRes?.data?.totalQuizzesCompleted || 0;
        const currentStreak = progressRes?.data?.streak || 0;
        const totalXP = levelRes?.data?.currentXP + (levelRes?.data?.currentLevel ? (levelRes.data.currentLevel - 1) * 100 : 0) || levelRes?.data?.currentXP || 0;

        // Compute longest streak from streaks endpoint if available
        let longestStreak = currentStreak;
        try {
          const streaksRes = await axiosInstance.get('/progress/streaks/');
          const dataArr = Array.isArray(streaksRes.data) ? streaksRes.data : [];
          if (dataArr.length > 0) {
            const parseYMD = (s: string) => {
              const [y, m, d] = s.split('-').map((v: string) => parseInt(v, 10));
              return new Date(y, (m || 1) - 1, d || 1);
            };
            const isConsecutive = (prev: Date, curr: Date) => {
              const next = new Date(prev);
              next.setDate(next.getDate() + 1);
              return next.getFullYear() === curr.getFullYear() && next.getMonth() === curr.getMonth() && next.getDate() === curr.getDate();
            };
            // Filter to only streak days and sort ascending by date
            const streakDays = dataArr.filter((d: any) => !!d.streak).map((d: any) => ({ ...d, _date: parseYMD(d.date) }))
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
        } catch {}

        // Entity counts (best-effort; endpoints may vary)
        const [notesRes, decksRes, reviewersRes, tasksRes, flashcardsRes] = await Promise.all([
          axiosInstance.get('/notes/'),
          axiosInstance.get('/decks/'),
          axiosInstance.get('/reviewers/'),
          axiosInstance.get('/tasks/').catch(() => ({ data: null })),
          axiosInstance.get('/decks/flashcards/').catch(() => ({ data: null })),
        ]);

        const totalNotes = getCount(notesRes?.data);
        const totalDecks = getCount(decksRes?.data);
        const totalReviewer = getCount(reviewersRes?.data);
        const totalTasks = getCount(tasksRes?.data);
        const totalFlashcards = getCount(flashcardsRes?.data);

        setStats({
          longestStreak,
          totalXP: totalXP || 0,
          totalNotes,
          totalDecks,
          totalFlashcards,
          totalTasks,
          totalReviewer,
          totalQuiz: totalQuizzesCompleted || 0,
          totalSchedule: 0,
          totalStudyHours: Math.round((totalStudyTime || 0) / 60),
        });
      } catch (e) {
        // Swallow errors; show zeros if endpoints unavailable
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
      <div className="flex items-center gap-6 mb-10">
        {user?.avatar ? (
          <img src={user.avatar} alt="avatar" className="w-24 h-24 rounded-full object-cover" />
        ) : (
          <span className="w-24 h-24 flex items-center justify-center rounded-full bg-indigo-600 text-white text-3xl font-bold">
            {getInitials(user?.displayName || user?.username)}
          </span>
        )}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">{user?.displayName || user?.username || 'Profile'}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Joined {joinedLabel || '—'}</p>
        </div>
      </div>
      
      {/* Statistics */}
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Statistics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <Flame className="text-orange-500" size={20} />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Longest Streak</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.longestStreak} days</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <Trophy className="text-yellow-500" size={20} />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total XP</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalXP}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <FileText className="text-blue-500" size={20} />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Notes</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalNotes}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <Layers className="text-indigo-500" size={20} />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Decks</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalDecks}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <BookOpen className="text-green-600" size={20} />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Flashcards</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalFlashcards}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <CheckSquare className="text-emerald-600" size={20} />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalTasks}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <Brain className="text-purple-600" size={20} />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Reviewer</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalReviewer}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <HelpCircle className="text-pink-600" size={20} />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Quiz</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalQuiz}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <Calendar className="text-teal-600" size={20} />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Schedule</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalSchedule}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <Clock className="text-sky-600" size={20} />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Study Hours</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalStudyHours}</p>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Achievements</h2>
        {achievements.length === 0 ? (
          <div className="text-gray-600 dark:text-gray-400">No achievements yet. Keep going!</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((a) => (
              <div key={a.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{a.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{a.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </PageLayout>
  );
};

export default Profile;



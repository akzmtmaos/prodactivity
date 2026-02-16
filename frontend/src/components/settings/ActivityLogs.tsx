import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, BookOpen, Clock, Award, Trash2, Target } from 'lucide-react';
import Pagination from '../common/Pagination';

interface ActivityLog {
  id: string;
  type: 'task_completed' | 'task_created' | 'note_created' | 'note_updated' | 'xp_earned' | 'task_deleted' | 'note_deleted';
  description: string;
  timestamp: string;
  details?: string;
  xp_amount?: number;
}

const ActivityLogs: React.FC = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | '7days' | '30days'>('7days');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    fetchActivities();
    setCurrentPage(1);
  }, [filter]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const userId = user.id || 11;

      const now = new Date();
      let startDate = new Date();
      if (filter === '7days') startDate.setDate(now.getDate() - 7);
      else if (filter === '30days') startDate.setDate(now.getDate() - 30);
      else startDate.setDate(now.getDate() - 90);

      const startDateStr = startDate.toISOString();
      const allActivities: ActivityLog[] = [];

      const { data: xpLogs } = await supabase
        .from('xp_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: false })
        .limit(100);

      if (xpLogs) {
        xpLogs.forEach(log => {
          allActivities.push({
            id: `xp-${log.id}`,
            type: 'xp_earned',
            description: log.description || 'Earned XP',
            timestamp: log.created_at,
            xp_amount: log.xp_amount
          });
        });
      }

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, completed, completed_at, created_at, is_deleted')
        .eq('user_id', userId)
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: false })
        .limit(50);

      if (tasks) {
        tasks.forEach(task => {
          allActivities.push({
            id: `task-created-${task.id}`,
            type: 'task_created',
            description: `Created task: ${task.title}`,
            timestamp: task.created_at,
            details: task.is_deleted ? 'DELETED' : undefined
          });
          if (task.completed && task.completed_at) {
            allActivities.push({
              id: `task-completed-${task.id}`,
              type: 'task_completed',
              description: `Completed task: ${task.title}`,
              timestamp: task.completed_at,
              details: task.is_deleted ? 'DELETED' : undefined
            });
          }
        });
      }

      const { data: notes } = await supabase
        .from('notes')
        .select('id, title, created_at, updated_at, is_deleted')
        .eq('user_id', userId)
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: false })
        .limit(50);

      if (notes) {
        notes.forEach(note => {
          allActivities.push({
            id: `note-created-${note.id}`,
            type: 'note_created',
            description: `Created note: ${note.title}`,
            timestamp: note.created_at,
            details: note.is_deleted ? 'DELETED' : undefined
          });
          const createdTime = new Date(note.created_at).getTime();
          const updatedTime = new Date(note.updated_at).getTime();
          if (updatedTime - createdTime > 60000) {
            allActivities.push({
              id: `note-updated-${note.id}-${note.updated_at}`,
              type: 'note_updated',
              description: `Updated note: ${note.title}`,
              timestamp: note.updated_at,
              details: note.is_deleted ? 'DELETED' : undefined
            });
          }
        });
      }

      allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(allActivities);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_completed': return <CheckCircle size={14} className="text-green-500 dark:text-green-400 flex-shrink-0" />;
      case 'task_created': return <Target size={14} className="text-blue-500 dark:text-blue-400 flex-shrink-0" />;
      case 'note_created': return <BookOpen size={14} className="text-indigo-500 dark:text-indigo-400 flex-shrink-0" />;
      case 'note_updated': return <BookOpen size={14} className="text-purple-500 dark:text-purple-400 flex-shrink-0" />;
      case 'xp_earned': return <Award size={14} className="text-yellow-500 dark:text-yellow-400 flex-shrink-0" />;
      case 'task_deleted':
      case 'note_deleted': return <Trash2 size={14} className="text-red-500 dark:text-red-400 flex-shrink-0" />;
      default: return <Clock size={14} className="text-gray-500 flex-shrink-0" />;
    }
  };

  const getActivityBorder = (type: string) => {
    switch (type) {
      case 'task_completed': return 'border-l-green-500 dark:border-l-green-400';
      case 'task_created': return 'border-l-blue-500 dark:border-l-blue-400';
      case 'note_created': return 'border-l-indigo-500 dark:border-l-indigo-400';
      case 'note_updated': return 'border-l-purple-500 dark:border-l-purple-400';
      case 'xp_earned': return 'border-l-yellow-500 dark:border-l-yellow-400';
      default: return 'border-l-gray-400 dark:border-l-gray-500';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const totalPages = Math.ceil(activities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentActivities = activities.slice(startIndex, endIndex);

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header row: title + filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Activity Logs</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Recent activity across tasks and notes</p>
        </div>
        <div className="flex rounded-lg border border-gray-200 dark:border-[#333333] p-0.5 bg-gray-50 dark:bg-[#252525]">
          {(['7days', '30days', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#2d2d2d]'
              }`}
            >
              {f === '7days' ? '7 Days' : f === '30days' ? '30 Days' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* List card */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-[#333333] overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-10">
            <Clock size={32} className="mx-auto text-gray-400 dark:text-gray-500 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No activities for this period</p>
          </div>
        ) : (
          <>
            <div id="activity-list" className="max-h-[480px] overflow-y-auto p-2">
              <div className="flex flex-col gap-1">
                {currentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`flex items-center gap-3 w-full min-w-0 px-3 py-2 rounded-lg border border-l-2 border-gray-200 dark:border-[#333333] ${getActivityBorder(activity.type)} bg-white dark:bg-[#252525] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors`}
                  >
                    {getActivityIcon(activity.type)}
                    <p className="flex-1 min-w-0 text-sm text-gray-900 dark:text-white truncate">
                      {activity.description}
                      {activity.details && (
                        <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                          {activity.details}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {activity.xp_amount != null && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                          +{activity.xp_amount} XP
                        </span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimestamp(activity.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-[#333333] bg-gray-50/50 dark:bg-[#252525]">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {startIndex + 1}–{Math.min(endIndex, activities.length)} of {activities.length}
                </span>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary stats – compact */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Tasks done', value: activities.filter(a => a.type === 'task_completed').length, icon: CheckCircle, color: 'text-green-500 dark:text-green-400' },
          { label: 'Tasks created', value: activities.filter(a => a.type === 'task_created').length, icon: Target, color: 'text-blue-500 dark:text-blue-400' },
          { label: 'Notes created', value: activities.filter(a => a.type === 'note_created').length, icon: BookOpen, color: 'text-indigo-500 dark:text-indigo-400' },
          { label: 'XP earned', value: activities.filter(a => a.type === 'xp_earned').reduce((s, a) => s + (a.xp_amount || 0), 0), icon: Award, color: 'text-yellow-500 dark:text-yellow-400' }
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-[#333333] p-3 flex items-center gap-2">
            <Icon size={16} className={`flex-shrink-0 ${color}`} />
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityLogs;

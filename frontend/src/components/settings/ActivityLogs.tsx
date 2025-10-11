import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, BookOpen, Clock, Award, Calendar, Trash2, Archive, Target } from 'lucide-react';

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
  const [itemsPerPage] = useState(20); // Show 20 items per page

  useEffect(() => {
    fetchActivities();
    setCurrentPage(1); // Reset to page 1 when filter changes
  }, [filter]);

  const fetchActivities = async () => {
    setLoading(true);
    
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;
      
      const user = JSON.parse(userData);
      const userId = user.id || 11;
      
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      if (filter === '7days') {
        startDate.setDate(now.getDate() - 7);
      } else if (filter === '30days') {
        startDate.setDate(now.getDate() - 30);
      } else {
        startDate.setDate(now.getDate() - 90); // All = last 90 days
      }
      
      const startDateStr = startDate.toISOString();
      
      const allActivities: ActivityLog[] = [];
      
      // 1. Fetch XP logs (task completions and other XP earning activities)
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
      
      // 2. Fetch recent tasks (created and completed)
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, completed, completed_at, created_at, is_deleted')
        .eq('user_id', userId)
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (tasks) {
        tasks.forEach(task => {
          // Task created
          allActivities.push({
            id: `task-created-${task.id}`,
            type: 'task_created',
            description: `Created task: ${task.title}`,
            timestamp: task.created_at,
            details: task.is_deleted ? 'DELETED' : undefined
          });
          
          // Task completed
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
      
      // 3. Fetch recent notes (created and updated)
      const { data: notes } = await supabase
        .from('notes')
        .select('id, title, created_at, updated_at, is_deleted')
        .eq('user_id', userId)
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (notes) {
        notes.forEach(note => {
          // Note created
          allActivities.push({
            id: `note-created-${note.id}`,
            type: 'note_created',
            description: `Created note: ${note.title}`,
            timestamp: note.created_at,
            details: note.is_deleted ? 'DELETED' : undefined
          });
          
          // Note updated (if updated time is significantly different from created time)
          const createdTime = new Date(note.created_at).getTime();
          const updatedTime = new Date(note.updated_at).getTime();
          
          if (updatedTime - createdTime > 60000) { // More than 1 minute difference
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
      
      // Sort all activities by timestamp (most recent first)
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
      case 'task_completed':
        return <CheckCircle size={18} className="text-green-500" />;
      case 'task_created':
        return <Target size={18} className="text-blue-500" />;
      case 'note_created':
        return <BookOpen size={18} className="text-indigo-500" />;
      case 'note_updated':
        return <BookOpen size={18} className="text-purple-500" />;
      case 'xp_earned':
        return <Award size={18} className="text-yellow-500" />;
      case 'task_deleted':
        return <Trash2 size={18} className="text-red-500" />;
      case 'note_deleted':
        return <Trash2 size={18} className="text-red-500" />;
      default:
        return <Clock size={18} className="text-gray-500" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'task_completed':
        return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800';
      case 'task_created':
        return 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800';
      case 'note_created':
        return 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800';
      case 'note_updated':
        return 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800';
      case 'xp_earned':
        return 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700';
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
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Pagination logic
  const totalPages = Math.ceil(activities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentActivities = activities.slice(startIndex, endIndex);
  
  const goToPage = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of activity list
    const activityList = document.getElementById('activity-list');
    if (activityList) {
      activityList.scrollTop = 0;
    }
  };
  
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };
  
  const goToPrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-100 dark:border-gray-800/50 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <Clock size={24} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Activity Logs</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Your recent activity across the platform</p>
            </div>
          </div>
          
          {/* Time Filter */}
          <div className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-1">
            <div className="flex space-x-1">
              <button
                onClick={() => setFilter('7days')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  filter === '7days'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setFilter('30days')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  filter === '30days'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  filter === 'all'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-100 dark:border-gray-800/50 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No activities found for this period</p>
          </div>
        ) : (
          <>
            {/* Scrollable Activity List */}
            <div id="activity-list" className="max-h-[600px] overflow-y-auto p-6">
              <div className="space-y-3">
                {currentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${getActivityColor(activity.type)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {activity.description}
                          {activity.details && (
                            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                              {activity.details}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimestamp(activity.timestamp)}
                          </p>
                          {activity.xp_amount && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
                              +{activity.xp_amount} XP
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Pagination Controls - Outside Scrollable Area */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {startIndex + 1}-{Math.min(endIndex, activities.length)} of {activities.length} activities
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                      // Show first page, last page, current page, and pages around current
                      const showPage = page === 1 || 
                                      page === totalPages || 
                                      (page >= currentPage - 1 && page <= currentPage + 1);
                      
                      const showEllipsis = (page === 2 && currentPage > 3) || 
                                          (page === totalPages - 1 && currentPage < totalPages - 2);
                      
                      if (showEllipsis) {
                        return <span key={page} className="px-2 text-gray-400">...</span>;
                      }
                      
                      if (!showPage && page !== 2 && page !== totalPages - 1) {
                        return null;
                      }
                      
                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-indigo-500 text-white'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-100 dark:border-gray-800/50 rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tasks Completed</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {activities.filter(a => a.type === 'task_completed').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-100 dark:border-gray-800/50 rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Target size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tasks Created</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {activities.filter(a => a.type === 'task_created').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-100 dark:border-gray-800/50 rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <BookOpen size={20} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Notes Created</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {activities.filter(a => a.type === 'note_created').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-100 dark:border-gray-800/50 rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Award size={20} className="text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total XP Earned</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {activities.filter(a => a.type === 'xp_earned').reduce((sum, a) => sum + (a.xp_amount || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs;


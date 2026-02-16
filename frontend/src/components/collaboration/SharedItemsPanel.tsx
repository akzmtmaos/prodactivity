import React, { useState, useEffect } from 'react';
import { Share2, UserCheck, FileText, BookOpen, Brain, CheckSquare, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface SharedItem {
  id: string;
  item_type: 'notebook' | 'note' | 'reviewer' | 'task';
  item_id: number;
  shared_by: string;
  shared_by_username?: string;
  permission_level: 'view' | 'edit' | 'comment';
  shared_at: string;
  is_accepted: boolean;
  item_title?: string;
}

interface TaskAssignment {
  id: string;
  task_id: number;
  assigned_by: string;
  assigned_to: string;
  assigned_by_username?: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'declined';
  assigned_at: string;
  task_title?: string;
  due_date?: string;
}

const SharedItemsPanel: React.FC = () => {
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'shared' | 'assigned'>('shared');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSharedItems();
    fetchAssignments();
  }, []);

  const fetchSharedItems = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const currentUser = JSON.parse(userData);

      const { data: sharedData, error } = await supabase
        .from('shared_items')
        .select('*')
        .eq('shared_with', currentUser.id)
        .order('shared_at', { ascending: false });

      if (error) {
        console.error('Error fetching shared items:', error);
        return;
      }

      // Fetch item titles and shared_by usernames
      const enrichedItems = await Promise.all(
        (sharedData || []).map(async (item) => {
          let itemTitle = '';
          
          // Fetch item title based on type
          if (item.item_type === 'notebook') {
            const { data } = await supabase
              .from('notebooks')
              .select('name')
              .eq('id', item.item_id)
              .single();
            itemTitle = data?.name || 'Unknown Notebook';
          } else if (item.item_type === 'note') {
            const { data } = await supabase
              .from('notes')
              .select('title')
              .eq('id', item.item_id)
              .single();
            itemTitle = data?.title || 'Unknown Note';
          } else if (item.item_type === 'reviewer') {
            const { data } = await supabase
              .from('reviewers')
              .select('title')
              .eq('id', item.item_id)
              .single();
            itemTitle = data?.title || 'Unknown Reviewer';
          } else if (item.item_type === 'task') {
            const { data } = await supabase
              .from('tasks')
              .select('title')
              .eq('id', item.item_id)
              .single();
            itemTitle = data?.title || 'Unknown Task';
          }

          // Fetch shared_by username
          const { data: sharedByData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', item.shared_by)
            .single();

          return {
            ...item,
            item_title: itemTitle,
            shared_by_username: sharedByData?.username || 'Unknown User'
          };
        })
      );

      setSharedItems(enrichedItems);
    } catch (error) {
      console.error('Error fetching shared items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const currentUser = JSON.parse(userData);

      const { data: assignmentsData, error } = await supabase
        .from('task_assignments')
        .select('*')
        .eq('assigned_to', currentUser.id)
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('Error fetching assignments:', error);
        return;
      }

      // Fetch task titles and assigned_by usernames
      const enrichedAssignments = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          const { data: taskData } = await supabase
            .from('tasks')
            .select('title, due_date')
            .eq('id', assignment.task_id)
            .single();

          const { data: assignedByData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', assignment.assigned_by)
            .single();

          return {
            ...assignment,
            task_title: taskData?.title || 'Unknown Task',
            due_date: taskData?.due_date || '',
            assigned_by_username: assignedByData?.username || 'Unknown User'
          };
        })
      );

      setAssignments(enrichedAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handleAcceptSharedItem = async (item: SharedItem) => {
    try {
      await supabase
        .from('shared_items')
        .update({
          is_accepted: true,
          accepted_at: new Date().toISOString()
        })
        .eq('id', item.id);

      fetchSharedItems();
    } catch (error) {
      console.error('Error accepting shared item:', error);
    }
  };

  const handleAcceptAssignment = async (assignment: TaskAssignment) => {
    try {
      await supabase
        .from('task_assignments')
        .update({ status: 'accepted' })
        .eq('id', assignment.id);

      // Also add as collaborator
      await supabase
        .from('task_collaborators')
        .upsert({
          task_id: assignment.task_id,
          collaborator_id: assignment.assigned_to,
          role: 'contributor'
        }, {
          onConflict: 'task_id,collaborator_id'
        });

      fetchAssignments();
    } catch (error) {
      console.error('Error accepting assignment:', error);
    }
  };

  const handleNavigateToItem = (item: SharedItem) => {
    if (!item.is_accepted) {
      handleAcceptSharedItem(item);
    }

    switch (item.item_type) {
      case 'notebook':
        navigate(`/notebooks/${item.item_id}`);
        break;
      case 'note':
        navigate(`/notebooks/${item.item_id}/note/${item.item_id}`);
        break;
      case 'reviewer':
        navigate(`/reviewer/r`);
        break;
      case 'task':
        navigate(`/tasks`);
        break;
    }
  };

  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case 'notebook':
        return <BookOpen size={16} />;
      case 'note':
        return <FileText size={16} />;
      case 'reviewer':
        return <Brain size={16} />;
      case 'task':
        return <CheckSquare size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const pendingShared = sharedItems.filter(item => !item.is_accepted);
  const pendingAssignments = assignments.filter(a => a.status === 'pending');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('shared')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'shared'
              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Share2 className="inline-block mr-2" size={16} />
          Shared with Me
          {pendingShared.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-indigo-600 text-white rounded-full">
              {pendingShared.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('assigned')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'assigned'
              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <UserCheck className="inline-block mr-2" size={16} />
          Assigned Tasks
          {pendingAssignments.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-indigo-600 text-white rounded-full">
              {pendingAssignments.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab === 'shared' ? (
          sharedItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Share2 className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">No shared items</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sharedItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    !item.is_accepted
                      ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                      : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        {getItemIcon(item.item_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {item.item_title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Shared by {item.shared_by_username} • {item.item_type}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            item.permission_level === 'edit' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                            item.permission_level === 'comment' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                          }`}>
                            {item.permission_level}
                          </span>
                          {!item.is_accepted && (
                            <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {!item.is_accepted && (
                        <button
                          onClick={() => handleAcceptSharedItem(item)}
                          className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                        >
                          Accept
                        </button>
                      )}
                      <button
                        onClick={() => handleNavigateToItem(item)}
                        className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          assignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <UserCheck className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">No assigned tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    assignment.status === 'pending'
                      ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                      : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <CheckSquare className="text-indigo-600 dark:text-indigo-400 mt-1" size={20} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {assignment.task_title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Assigned by {assignment.assigned_by_username}
                        </p>
                        {assignment.due_date && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                            <Clock size={12} />
                            Due: {new Date(assignment.due_date).toLocaleDateString()}
                          </p>
                        )}
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
                          assignment.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
                          assignment.status === 'accepted' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
                          assignment.status === 'in_progress' ? 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' :
                          assignment.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                        }`}>
                          {assignment.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {assignment.status === 'pending' && (
                        <button
                          onClick={() => handleAcceptAssignment(assignment)}
                          className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                        >
                          Accept
                        </button>
                      )}
                      <button
                        onClick={() => navigate('/tasks')}
                        className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default SharedItemsPanel;


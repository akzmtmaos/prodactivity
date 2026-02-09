import React, { useState, useEffect } from 'react';
import { X, UserCheck, Search, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Toast from '../common/Toast';

interface User {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
}

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  taskTitle: string;
  onAssigned?: () => void;
}

const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  onAssigned
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchAssignedUsers();
    } else {
      setSearchTerm('');
      setSelectedUsers([]);
      setNotes('');
    }
  }, [isOpen, taskId]);

  const fetchUsers = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const currentUser = JSON.parse(userData);
      
      const { data: usersData, error } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .neq('id', currentUser.id)
        .order('username', { ascending: true });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAssignedUsers = async () => {
    try {
      const { data: assignments, error } = await supabase
        .from('task_assignments')
        .select('assigned_to, status')
        .eq('task_id', taskId)
        .in('status', ['pending', 'accepted', 'in_progress']);

      if (error) {
        console.error('Error fetching assignments:', error);
        return;
      }

      const assignedUserIds = (assignments || []).map(a => a.assigned_to);
      setSelectedUsers(assignedUserIds);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAssign = async () => {
    if (selectedUsers.length === 0) {
      setToast({ message: 'Please select at least one user', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        setToast({ message: 'User not found', type: 'error' });
        return;
      }

      const currentUser = JSON.parse(userData);
      
      // Assign to each selected user
      const assignPromises = selectedUsers.map(userId =>
        supabase
          .from('task_assignments')
          .upsert({
            task_id: taskId,
            assigned_by: currentUser.id,
            assigned_to: userId,
            status: 'pending',
            notes: notes.trim() || null
          }, {
            onConflict: 'task_id,assigned_to'
          })
      );

      await Promise.all(assignPromises);

      // Add as collaborators
      const collaboratorPromises = selectedUsers.map(userId =>
        supabase
          .from('task_collaborators')
          .upsert({
            task_id: taskId,
            collaborator_id: userId,
            role: 'contributor'
          }, {
            onConflict: 'task_id,collaborator_id'
          })
      );

      await Promise.all(collaboratorPromises);

      setToast({ message: `Assigned task to ${selectedUsers.length} user(s)`, type: 'success' });
      
      // Log activity
      await supabase
        .from('collaboration_activities')
        .insert(
          selectedUsers.map(userId => ({
            item_type: 'task',
            item_id: taskId,
            user_id: currentUser.id,
            activity_type: 'assigned',
            description: `Assigned task "${taskTitle}" to user`
          }))
        );

      if (onAssigned) {
        onAssigned();
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error assigning task:', error);
      setToast({ message: 'Failed to assign task', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <UserCheck className="text-indigo-600 dark:text-indigo-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assign Task</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">{taskTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="text-gray-500 dark:text-gray-400" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assignment Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or instructions for the assigned users..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* User List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <UserCheck className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">No users found</p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUsers.includes(user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => handleUserToggle(user.id)}
                    className={`w-full p-3 rounded-lg border transition-colors flex items-center gap-3 ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                    }`}
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 dark:text-white">{user.username}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                    {isSelected && (
                      <Check className="text-indigo-600 dark:text-indigo-400" size={20} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={loading || selectedUsers.length === 0}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? 'Assigning...' : `Assign to ${selectedUsers.length} user(s)`}
          </button>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default AssignTaskModal;


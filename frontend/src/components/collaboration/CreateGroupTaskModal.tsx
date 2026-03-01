import React, { useState, useEffect } from 'react';
import { X, Users, Search, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import axiosInstance from '../../utils/axiosConfig';
import Toast from '../common/Toast';

interface User {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
}

interface CreateGroupTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  taskTitle: string;
  onCreateSuccess?: () => void;
}

const CreateGroupTaskModal: React.FC<CreateGroupTaskModalProps> = ({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  onCreateSuccess
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setTitle(`Group Task: ${taskTitle}`);
    } else {
      setSearchTerm('');
      setSelectedUsers([]);
      setTitle('');
      setDescription('');
    }
  }, [isOpen, taskId, taskTitle]);

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

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setToast({ message: 'Please enter a title', type: 'error' });
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
      
      // Convert user IDs to integers for backend
      const participantUserIds = selectedUsers.map(id => parseInt(id));

      const response = await axiosInstance.post('/group-tasks/', {
        task_id: taskId,
        title: title.trim(),
        description: description.trim(),
        participant_user_ids: participantUserIds
      });

      setToast({ message: 'Group task created successfully!', type: 'success' });
      
      if (onCreateSuccess) {
        onCreateSuccess();
      }
      
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      console.error('Error creating group task:', error);
      setToast({ 
        message: error.response?.data?.error || 'Failed to create group task', 
        type: 'error' 
      });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1e1e1e] shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header – compact */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Create Group Task</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content – compact */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Task info */}
          <div className="rounded-lg border border-gray-200 dark:border-[#333333] bg-indigo-50/50 dark:bg-indigo-900/10 px-3 py-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">Task</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{taskTitle}</p>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Group Task Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="Enter group task title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
              placeholder="Add a description"
            />
          </div>

          {/* Participants */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Select participants</label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-sm rounded-md border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="Search users..."
              />
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] max-h-48 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400">No users found</div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleUserToggle(user.id)}
                    className={`w-full flex items-center justify-between gap-2 min-h-[52px] px-3 py-2.5 rounded-lg border-b border-gray-100 dark:border-[#333333] last:border-b-0 transition-colors ${
                      selectedUsers.includes(user.id)
                        ? 'bg-indigo-50 dark:bg-indigo-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                        {user.avatar ? (
                          <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    {selectedUsers.includes(user.id) && (
                      <Check size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
            {selectedUsers.length > 0 && (
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                {selectedUsers.length} participant{selectedUsers.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        </div>

        {/* Footer – compact */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-[#333333] text-gray-700 dark:text-gray-300 bg-white dark:bg-[#252525] hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading || !title.trim()}
            className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Group Task'}
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

export default CreateGroupTaskModal;

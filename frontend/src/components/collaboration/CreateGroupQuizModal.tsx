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

interface SimpleDeck {
  id: string;
  title: string;
}

interface CreateGroupQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided, the modal is locked to this deck */
  deckId?: string;
  deckTitle?: string;
  /** When provided (and no deckId), user can pick from these decks */
  availableDecks?: SimpleDeck[];
  onCreateSuccess?: () => void;
}

const CreateGroupQuizModal: React.FC<CreateGroupQuizModalProps> = ({
  isOpen,
  onClose,
  deckId,
  deckTitle,
  availableDecks = [],
  onCreateSuccess
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [selectedDeckTitle, setSelectedDeckTitle] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();

      if (deckId && deckTitle) {
        setSelectedDeckId(deckId);
        setSelectedDeckTitle(deckTitle);
        setTitle((prev) => prev || `Group Quiz: ${deckTitle}`);
      } else if (!deckId && availableDecks && availableDecks.length > 0) {
        const first = availableDecks[0];
        setSelectedDeckId(first.id);
        setSelectedDeckTitle(first.title);
        setTitle((prev) => prev || `Group Quiz: ${first.title}`);
      }
    } else {
      setSearchTerm('');
      setSelectedUsers([]);
      setSelectedDeckId(null);
      setSelectedDeckTitle('');
      setTitle('');
      setDescription('');
    }
  }, [isOpen, deckId, deckTitle, availableDecks]);

  const fetchUsers = async () => {
    try {
      // Only use people you already follow (friends) as potential participants
      const res = await axiosInstance.get('/following/');
      const list = res.data?.following || [];

      const mapped: User[] = list.map((item: any) => ({
        id: String(item.id),
        username: item.username,
        // Use school/course as secondary text instead of exposing all emails
        email: item.school || item.course || '',
        avatar: item.avatar || null,
      }));

      setUsers(mapped);
    } catch (error) {
      console.error('Error fetching following for group quiz participants:', error);
      setUsers([]);
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
    if (!selectedDeckId) {
      setToast({ message: 'Please select a deck', type: 'error' });
      return;
    }

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

      const response = await axiosInstance.post('/decks/group-quizzes/', {
        deck_id: parseInt(selectedDeckId, 10),
        title: title.trim(),
        description: description.trim(),
        participant_user_ids: participantUserIds
      });

      setToast({ message: 'Group quiz created successfully!', type: 'success' });
      
      if (onCreateSuccess) {
        onCreateSuccess();
      }
      
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      console.error('Error creating group quiz:', error);
      setToast({ 
        message: error.response?.data?.error || 'Failed to create group quiz', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const trimmedSearch = searchTerm.trim();
  const filteredUsers =
    trimmedSearch.length >= 2
      ? users.filter(user =>
          user.username.toLowerCase().includes(trimmedSearch.toLowerCase()) ||
          user.email.toLowerCase().includes(trimmedSearch.toLowerCase())
        )
      : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative bg-white dark:bg-[#1e1e1e] rounded-md shadow-xl w-full max-w-lg mx-4 border border-gray-200 dark:border-[#333333] max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2.5">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Create Group Quiz
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Deck selection: when not locked to a deck, show existing decks for challenge */}
          {!deckId && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Deck for challenge *
              </label>
              {availableDecks && availableDecks.length > 0 ? (
                <select
                  value={selectedDeckId ?? ''}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedDeckId(newId || null);
                    const found = availableDecks.find((d) => d.id === newId);
                    const newTitle = found?.title ?? '';
                    setSelectedDeckTitle(newTitle);
                    setTitle((prev) => prev || `Group Quiz: ${newTitle}`);
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">
                    Select a deck to quiz with friends
                  </option>
                  {availableDecks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title || 'Untitled'}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-3 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-xs">
                  No decks yet. Create a deck from the Decks tab first, then start a group quiz.
                </div>
              )}
            </div>
          )}

          {/* Deck Info */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-md px-3 py-2.5">
            <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Deck</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {selectedDeckTitle || deckTitle || (availableDecks?.length ? 'Select a deck above' : '—')}
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Quiz Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter quiz title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="Add a description for this group quiz"
            />
          </div>

          {/* User Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Select Participants
            </label>
            
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Type a name or email (min 2 chars)"
              />
            </div>

            {/* User List */}
            <div className="border border-gray-300 dark:border-gray-600 rounded-md max-h-64 overflow-y-auto">
              {trimmedSearch.length < 2 ? (
                <div className="px-3 py-5 text-center text-xs text-gray-500 dark:text-gray-400">
                  <p>Start typing to search for participants.</p>
                  <p className="mt-0.5">Use at least 2 characters.</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="px-3 py-5 text-center text-xs text-gray-500 dark:text-gray-400">
                  <p>No users found.</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserToggle(user.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      selectedUsers.includes(user.id)
                        ? 'bg-indigo-50 dark:bg-indigo-900/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.username}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    {selectedUsers.includes(user.id) && (
                      <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </button>
                ))
              )}
            </div>

            {selectedUsers.length > 0 && (
              <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-400">
                {selectedUsers.length} participant{selectedUsers.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2.5 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#181818]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !title.trim() || (!deckId && !selectedDeckId)}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Group Quiz'}
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

export default CreateGroupQuizModal;

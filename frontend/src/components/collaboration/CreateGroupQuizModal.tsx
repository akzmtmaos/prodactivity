import React, { useState, useEffect, useRef } from 'react';
import { X, Users, Search, Check, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getAvatarUrl } from '../chat/utils';
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

interface GroupChatOption {
  id: string;
  name: string;
  members: User[];
}

const CreateGroupQuizModal: React.FC<CreateGroupQuizModalProps> = ({
  isOpen,
  onClose,
  deckId,
  deckTitle,
  availableDecks = [],
  onCreateSuccess
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [selectedDeckTitle, setSelectedDeckTitle] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [groupChats, setGroupChats] = useState<GroupChatOption[]>([]);
  const [loadingGroupChats, setLoadingGroupChats] = useState(false);
  const [expandedChatId, setExpandedChatId] = useState<string | null>(null);
  // Which invite method the participant picker is showing
  const [inviteMode, setInviteMode] = useState<'groupChat' | 'invite'>('groupChat');
  // Once the user picks a method, the group-chat load must not switch it for them
  const inviteModePicked = useRef(false);

  const handleInviteModeChange = (mode: 'groupChat' | 'invite') => {
    inviteModePicked.current = true;
    setInviteMode(mode);
  };

  useEffect(() => {
    if (isOpen) {
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
      setGroupChats([]);
      setExpandedChatId(null);
      setInviteMode('groupChat');
      inviteModePicked.current = false;
    }
  }, [isOpen, deckId, deckTitle, availableDecks]);

  // Group chat members the user can invite straight into the quiz
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    // A quiz with no group chats to pick from should open on the search tab instead
    const applyChats = (chats: GroupChatOption[]) => {
      if (cancelled) return;
      setGroupChats(chats);
      if (chats.length === 0 && !inviteModePicked.current) setInviteMode('invite');
    };

    const loadGroupChats = async () => {
      setLoadingGroupChats(true);
      try {
        const userData = localStorage.getItem('user');
        if (!userData) return;
        const currentUserId = String(JSON.parse(userData)?.id ?? '');
        if (!currentUserId) return;

        const { data: myRooms, error: roomsError } = await supabase
          .from('room_participants')
          .select('room_id, chat_rooms(id, name, room_type)')
          .eq('user_id', currentUserId);
        if (roomsError) throw roomsError;

        const groupRooms = (myRooms || [])
          .map((row: any) => row.chat_rooms)
          .filter((room: any) => room && room.room_type === 'group');
        if (groupRooms.length === 0) {
          applyChats([]);
          return;
        }

        const roomIds = groupRooms.map((room: any) => room.id);
        const { data: rows } = await supabase
          .from('room_participants')
          .select('room_id, user_id')
          .in('room_id', roomIds);

        const memberIds = Array.from(
          new Set((rows || []).map((row: any) => String(row.user_id)).filter(id => id !== currentUserId))
        );

        let profilesById = new Map<string, User>();
        if (memberIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, email, avatar')
            .in('id', memberIds);
          profilesById = new Map(
            (profiles || []).map((profile: any) => [
              String(profile.id),
              { ...profile, id: String(profile.id), avatar: getAvatarUrl(profile.avatar) } as User
            ])
          );
        }

        const chats: GroupChatOption[] = groupRooms
          .map((room: any) => ({
            id: String(room.id),
            name: room.name || 'Group chat',
            members: (rows || [])
              .filter((row: any) => String(row.room_id) === String(room.id))
              .map((row: any) => profilesById.get(String(row.user_id)))
              .filter((member: User | undefined): member is User => !!member)
          }))
          .filter(chat => chat.members.length > 0);

        applyChats(chats);
      } catch (error) {
        console.error('Error loading group chats for quiz invite:', error);
        applyChats([]);
      } finally {
        if (!cancelled) setLoadingGroupChats(false);
      }
    };

    loadGroupChats();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Search fires only when the term is a complete username or email (exact match)
  useEffect(() => {
    if (!isOpen) return;
    const term = searchTerm.trim();
    if (term.length === 0) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const userData = localStorage.getItem('user');
        if (!userData) {
          setSearchResults([]);
          setSearchLoading(false);
          return;
        }
        const currentUser = JSON.parse(userData);

        // Exact match only (case-insensitive) — prevents large result sets
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, email, avatar')
          .neq('id', currentUser.id)
          .or(`email.ilike.${term},username.ilike.${term}`)
          .limit(20)
          .order('username', { ascending: true });

        if (error) {
          console.error('Error searching users for group quiz:', error);
          setSearchResults([]);
          setSearchLoading(false);
          return;
        }

        setSearchResults(
          (data || []).map((user: any) => ({ ...user, avatar: getAvatarUrl(user.avatar) })) as User[]
        );
      } catch (err) {
        console.error(err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, searchTerm]);

  const handleUserToggle = (userId: string) => {
    const id = String(userId);
    setSelectedUsers(prev =>
      prev.includes(id)
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  // Invite every member of one group chat at once
  const handleAddChatMembers = (chat: GroupChatOption) => {
    const memberIds = chat.members.map(member => String(member.id));
    setSelectedUsers(prev => Array.from(new Set([...prev, ...memberIds])));
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
                    Select a deck to quiz with
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
            {/* Invite method tabs: pick a whole chat at once, or find people by handle */}
            <div
              role="tablist"
              aria-label="How to invite participants"
              className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 p-0.5 mb-3"
            >
              <button
                type="button"
                role="tab"
                aria-selected={inviteMode === 'groupChat'}
                onClick={() => handleInviteModeChange('groupChat')}
                className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  inviteMode === 'groupChat'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Users size={13} className="mr-1.5" />
                Group Chat
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inviteMode === 'invite'}
                onClick={() => handleInviteModeChange('invite')}
                className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  inviteMode === 'invite'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Search size={13} className="mr-1.5" />
                Invite
              </button>
            </div>

            {inviteMode === 'groupChat' ? (
              <div>
            {loadingGroupChats ? (
              <div className="mb-3 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="w-3 h-3 border-2 border-gray-300 dark:border-gray-600 border-t-indigo-500 rounded-full animate-spin" />
                <span>Loading your group chats…</span>
              </div>
            ) : groupChats.length > 0 ? (
              <div className="mb-3">
                <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Invite from a group chat
                </p>
                <div className="space-y-1.5">
                  {groupChats.map(chat => {
                    const selectedCount = chat.members.filter(member => selectedUsers.includes(String(member.id))).length;
                    const isExpanded = expandedChatId === chat.id;
                    return (
                      <div key={chat.id} className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedChatId(isExpanded ? null : chat.id)}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          aria-expanded={isExpanded}
                        >
                          <span className="flex items-center space-x-2 min-w-0">
                            <Users size={14} className="text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-900 dark:text-white truncate">{chat.name}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                              {chat.members.length} member{chat.members.length !== 1 ? 's' : ''}
                            </span>
                          </span>
                          <span className="flex items-center space-x-2 flex-shrink-0">
                            {selectedCount > 0 && (
                              <span className="text-[11px] text-indigo-600 dark:text-indigo-400">{selectedCount} selected</span>
                            )}
                            <ChevronDown
                              size={14}
                              className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[#181818]">
                            <button
                              type="button"
                              onClick={() => handleAddChatMembers(chat)}
                              className="w-full px-3 py-2 text-left text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              Invite all {chat.members.length} member{chat.members.length !== 1 ? 's' : ''}
                            </button>
                            {chat.members.map(member => (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => handleUserToggle(String(member.id))}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                  selectedUsers.includes(String(member.id)) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                                }`}
                              >
                                <span className="flex items-center space-x-2.5 min-w-0">
                                  <span className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                                    {member.avatar ? (
                                      <img src={member.avatar} alt={member.username} className="w-7 h-7 rounded-full object-cover" />
                                    ) : (
                                      <span className="text-indigo-600 dark:text-indigo-400 text-[11px] font-medium">
                                        {(member.username || '?').charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </span>
                                  <span className="min-w-0 text-left">
                                    <span className="block text-sm text-gray-900 dark:text-white truncate">{member.username}</span>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{member.email}</span>
                                  </span>
                                </span>
                                {selectedUsers.includes(String(member.id)) && (
                                  <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400">
                No group chats yet — switch to Invite to find someone by username or email.
              </p>
            )}
              </div>
            ) : (
              <div>
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Type the full username or email"
              />
              {searchLoading && (
                <div
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-gray-300 dark:border-gray-600 border-t-indigo-500 rounded-full animate-spin"
                  aria-hidden
                />
              )}
            </div>

            {/* User List */}
            <div className="border border-gray-300 dark:border-gray-600 rounded-md max-h-64 overflow-y-auto">
              {searchLoading ? (
                <div className="animate-pulse" aria-live="polite" aria-label="Searching for users">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center space-x-3 px-3 py-2.5">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-2.5 w-1/2 bg-gray-100 dark:bg-gray-800 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchTerm.trim().length === 0 ? (
                <div className="px-3 py-5 text-center text-xs text-gray-500 dark:text-gray-400">
                  <p>Type the person's full username or email to find them.</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="px-3 py-5 text-center text-xs text-gray-500 dark:text-gray-400">
                  <p>No users found. Check the spelling — search matches the full username or email.</p>
                </div>
              ) : (
                searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserToggle(String(user.id))}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      selectedUsers.includes(String(user.id))
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
                    {selectedUsers.includes(String(user.id)) && (
                      <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </button>
                ))
              )}
            </div>
              </div>
            )}

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

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Users, Search, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Toast from '../common/Toast';

interface User {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: 'notebook' | 'note' | 'reviewer' | 'task';
  itemId: number;
  itemTitle: string;
  onShared?: () => void;
}

// —— Subcomponents (refined, compact) ——

const ShareModalHeader: React.FC<{ itemType: string; itemTitle: string; onClose: () => void }> = ({
  itemType,
  itemTitle,
  onClose,
}) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#333333]">
    <div className="flex items-center gap-2 min-w-0">
      <UserPlus size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Share {itemType}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{itemTitle}</p>
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] shrink-0"
      aria-label="Close"
    >
      <X size={18} />
    </button>
  </div>
);

const PermissionRow: React.FC<{
  value: 'view' | 'edit' | 'comment';
  onChange: (v: 'view' | 'edit' | 'comment') => void;
}> = ({ value, onChange }) => (
  <div>
    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Permission</label>
    <div className="flex gap-1.5">
      {(['view', 'edit', 'comment'] as const).map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => onChange(level)}
          className={`flex-1 px-2.5 py-1.5 text-xs rounded-md border transition-colors ${
            value === level
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white dark:bg-[#252525] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-[#333333] hover:border-indigo-500'
          }`}
        >
          {level === 'comment' ? 'Comment' : level === 'edit' ? 'Edit' : 'View'}
        </button>
      ))}
    </div>
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      {value === 'view' && 'Can only view'}
      {value === 'edit' && 'Can view and edit'}
      {value === 'comment' && 'Can view and comment'}
    </p>
  </div>
);

const ShareSearchInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = 'Search users...' }) => (
  <div className="relative">
    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-8 pr-2.5 py-1.5 text-sm rounded-md border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
    />
  </div>
);

const ShareUserRow: React.FC<{
  user: User;
  selected: boolean;
  onToggle: () => void;
}> = ({ user, selected, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`w-full flex items-center gap-2 min-h-[48px] px-3 py-2 rounded-lg border-b border-gray-100 dark:border-[#333333] last:border-b-0 transition-colors text-left ${
      selected
        ? 'bg-indigo-50 dark:bg-indigo-900/20'
        : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
    }`}
  >
    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 overflow-hidden">
      {user.avatar ? (
        <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
          {user.username.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.username}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
    </div>
    {selected && <Check size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
  </button>
);

const ShareModalFooter: React.FC<{
  onClose: () => void;
  onShare: () => void;
  loading: boolean;
  selectedCount: number;
}> = ({ onClose, onShare, loading, selectedCount }) => (
  <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-[#333333]">
    <button
      type="button"
      onClick={onClose}
      className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-[#333333] text-gray-700 dark:text-gray-300 bg-white dark:bg-[#252525] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] disabled:opacity-50"
      disabled={loading}
    >
      Cancel
    </button>
    <button
      type="button"
      onClick={onShare}
      disabled={loading || selectedCount === 0}
      className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Sharing...' : selectedCount > 0 ? `Share (${selectedCount})` : 'Share'}
    </button>
  </div>
);

// —— Main modal ——

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  itemType,
  itemId,
  itemTitle,
  onShared
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [permissionLevel, setPermissionLevel] = useState<'view' | 'edit' | 'comment'>('view');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsersWithChatRooms();
      fetchSharedUsers();
    } else {
      setSearchTerm('');
      setSelectedUsers([]);
      setPermissionLevel('view');
    }
  }, [isOpen, itemType, itemId]);

  const fetchUsersWithChatRooms = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const currentUser = JSON.parse(userData);
      const currentUserId = String(currentUser.id);

      const { data: participants, error: participantsError } = await supabase
        .from('room_participants')
        .select('room_id, chat_rooms!inner(*)')
        .eq('user_id', currentUserId);

      if (participantsError) {
        console.error('Error fetching chat rooms:', participantsError);
        return;
      }

      const userIds = new Set<string>();
      for (const participant of participants || []) {
        const room = Array.isArray(participant.chat_rooms)
          ? participant.chat_rooms[0]
          : participant.chat_rooms;

        if (room && typeof room === 'object' && 'id' in room) {
          const { data: roomParticipants } = await supabase
            .from('room_participants')
            .select('user_id')
            .eq('room_id', room.id);

          (roomParticipants || []).forEach((p: { user_id: string }) => {
            const userId = String(p.user_id);
            if (userId !== currentUserId) userIds.add(userId);
          });
        }
      }

      if (userIds.size > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, username, email, avatar')
          .in('id', Array.from(userIds))
          .order('username', { ascending: true });

        if (!usersError) setUsers(usersData || []);
      } else {
        setUsers([]);
      }

      const { data: allUsersData, error: allUsersError } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .neq('id', currentUserId)
        .order('username', { ascending: true });

      if (!allUsersError) setAllUsers(allUsersData || []);
    } catch (error) {
      console.error('Error fetching users with chat rooms:', error);
    }
  };

  const fetchSharedUsers = async () => {
    try {
      await supabase
        .from('shared_items')
        .select('shared_with, is_accepted')
        .eq('item_type', itemType)
        .eq('item_id', itemId);
    } catch (error) {
      console.error('Error fetching shared users:', error);
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const createOrGetDirectRoom = async (otherUserId: string, currentUserId: string) => {
    try {
      const otherUserStr = String(otherUserId);
      const currentUserStr = String(currentUserId);

      const { data: userRooms } = await supabase
        .from('room_participants')
        .select('room_id, chat_rooms!inner(*)')
        .eq('user_id', currentUserStr);

      if (userRooms) {
        for (const userRoom of userRooms) {
          const room = Array.isArray(userRoom.chat_rooms) ? userRoom.chat_rooms[0] : userRoom.chat_rooms;
          if (room && typeof room === 'object' && 'room_type' in room && room.room_type === 'direct') {
            const roomId = room.id as string;
            const { data: participants } = await supabase
              .from('room_participants')
              .select('user_id')
              .eq('room_id', roomId);
            const participantIds = (participants || []).map((p: { user_id: string }) => String(p.user_id));
            if (participantIds.length === 2 && participantIds.includes(currentUserStr) && participantIds.includes(otherUserStr)) {
              return room as { id: string };
            }
          }
        }
      }

      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({ room_type: 'direct', created_by: currentUserStr })
        .select()
        .single();

      if (roomError) throw roomError;

      await supabase.from('room_participants').insert([
        { room_id: newRoom.id, user_id: currentUserStr },
        { room_id: newRoom.id, user_id: otherUserStr }
      ]);

      return newRoom;
    } catch (error) {
      console.error('Error creating/getting chat room:', error);
      return null;
    }
  };

  const sendShareMessage = async (roomId: string, currentUserId: string) => {
    const shareData = {
      type: 'share',
      itemType,
      itemId,
      itemTitle,
      permissionLevel
    };
    const messageContent = `__SHARED_ITEM__${JSON.stringify(shareData)}`;
    await supabase.from('messages').insert({
      room_id: roomId,
      sender_id: currentUserId,
      content: messageContent
    });
  };

  const sendShareEmailNotification = async (sharedUserId: string, currentUser: { username?: string }) => {
    try {
      const { getApiBaseUrl } = await import('../../config/api');
      const apiBaseUrl = getApiBaseUrl();
      await fetch(`${apiBaseUrl}/collaboration/send-share-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          shared_user_id: sharedUserId,
          item_type: itemType,
          item_id: itemId,
          item_title: itemTitle,
          permission_level: permissionLevel,
          shared_by_username: currentUser.username || 'Someone'
        })
      });
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  };

  const handleShare = async () => {
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
      const currentUserId = String(currentUser.id);

      await Promise.all(
        selectedUsers.map(async (userId) => {
          await supabase.from('shared_items').upsert(
            {
              item_type: itemType,
              item_id: itemId,
              shared_by: currentUserId,
              shared_with: userId,
              permission_level: permissionLevel,
              is_accepted: false
            },
            { onConflict: 'item_type,item_id,shared_with' }
          );

          const room = await createOrGetDirectRoom(userId, currentUserId);
          if (room) await sendShareMessage(room.id, currentUserId);
          await sendShareEmailNotification(userId, currentUser);
        })
      );

      setToast({
        message: `Shared ${itemType} with ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`,
        type: 'success'
      });

      await supabase.from('collaboration_activities').insert(
        selectedUsers.map(userId => ({
          item_type: itemType,
          item_id: itemId,
          user_id: currentUserId,
          activity_type: 'shared',
          description: `Shared ${itemTitle} with user`
        }))
      );

      setSelectedUsers([]);
      if (onShared) onShared();
      setTimeout(() => onClose(), 1000);
    } catch (error) {
      console.error('Error sharing item:', error);
      setToast({ message: 'Failed to share item', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = (searchTerm.trim() ? allUsers : users).filter(
    user =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative bg-white dark:bg-[#1e1e1e] rounded-md shadow-xl w-full max-w-md mx-4 border border-gray-200 dark:border-[#333333] max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <ShareModalHeader itemType={itemType} itemTitle={itemTitle} onClose={onClose} />

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <PermissionRow value={permissionLevel} onChange={setPermissionLevel} />

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Select people</label>
            <ShareSearchInput value={searchTerm} onChange={setSearchTerm} />
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] max-h-48 overflow-y-auto">
            {!searchTerm.trim() && users.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                <Users className="mx-auto h-10 w-10 mb-2 opacity-50" />
                <p>No users with existing conversations</p>
                <p className="mt-0.5">Search to find other users</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                <Users className="mx-auto h-10 w-10 mb-2 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              filteredUsers.map(user => (
                <ShareUserRow
                  key={user.id}
                  user={user}
                  selected={selectedUsers.includes(user.id)}
                  onToggle={() => handleUserToggle(user.id)}
                />
              ))
            )}
          </div>
          {selectedUsers.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedUsers.length} selected
            </p>
          )}
        </div>

        <ShareModalFooter
          onClose={onClose}
          onShare={handleShare}
          loading={loading}
          selectedCount={selectedUsers.length}
        />
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default ShareModal;

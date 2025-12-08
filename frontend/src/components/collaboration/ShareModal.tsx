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

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  itemType,
  itemId,
  itemTitle,
  onShared
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); // Store all users for search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [permissionLevel, setPermissionLevel] = useState<'view' | 'edit' | 'comment'>('view');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsersWithChatRooms();
      // Fetch already shared users
      fetchSharedUsers();
    } else {
      setSearchTerm('');
      setSelectedUsers([]);
      setPermissionLevel('view');
    }
  }, [isOpen, itemType, itemId]);

  // Fetch users that have chat rooms with current user
  const fetchUsersWithChatRooms = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const currentUser = JSON.parse(userData);
      const currentUserId = String(currentUser.id);
      
      // Get all chat rooms where current user is a participant
      const { data: participants, error: participantsError } = await supabase
        .from('room_participants')
        .select('room_id, chat_rooms!inner(*)')
        .eq('user_id', currentUserId);

      if (participantsError) {
        console.error('Error fetching chat rooms:', participantsError);
        return;
      }

      // Get all unique user IDs from chat rooms (excluding current user)
      const userIds = new Set<string>();
      
      for (const participant of participants || []) {
        const room = Array.isArray(participant.chat_rooms) 
          ? participant.chat_rooms[0] 
          : participant.chat_rooms;
        
        if (room && typeof room === 'object' && 'id' in room) {
          // Get all participants of this room
          const { data: roomParticipants } = await supabase
            .from('room_participants')
            .select('user_id')
            .eq('room_id', room.id);

          (roomParticipants || []).forEach((p: any) => {
            const userId = String(p.user_id);
            if (userId !== currentUserId) {
              userIds.add(userId);
            }
          });
        }
      }

      // Fetch user profiles for these IDs
      if (userIds.size > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, username, email, avatar')
          .in('id', Array.from(userIds))
          .order('username', { ascending: true });

        if (usersError) {
          console.error('Error fetching user profiles:', usersError);
          return;
        }

        setUsers(usersData || []);
      } else {
        setUsers([]);
      }

      // Also fetch all users for search functionality
      const { data: allUsersData, error: allUsersError } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .neq('id', currentUserId)
        .order('username', { ascending: true });

      if (!allUsersError) {
        setAllUsers(allUsersData || []);
      }
    } catch (error) {
      console.error('Error fetching users with chat rooms:', error);
    }
  };

  const fetchSharedUsers = async () => {
    try {
      const { data: sharedData, error } = await supabase
        .from('shared_items')
        .select('shared_with, is_accepted')
        .eq('item_type', itemType)
        .eq('item_id', itemId);

      if (error) {
        console.error('Error fetching shared users:', error);
        return;
      }

      // Don't auto-select already shared users - let user choose who to share with
      // The shared users list is just for reference, not for pre-selection
    } catch (error) {
      console.error('Error fetching shared users:', error);
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const createOrGetDirectRoom = async (otherUserId: string, currentUserId: string) => {
    try {
      const otherUserStr = String(otherUserId);
      const currentUserStr = String(currentUserId);

      // Check if room already exists
      const { data: userRooms, error: userRoomsError } = await supabase
        .from('room_participants')
        .select('room_id, chat_rooms!inner(*)')
        .eq('user_id', currentUserStr);

      if (userRooms) {
        for (const userRoom of userRooms) {
          const room = Array.isArray(userRoom.chat_rooms) 
            ? userRoom.chat_rooms[0] 
            : userRoom.chat_rooms;
          
          if (room && typeof room === 'object' && 'room_type' in room && room.room_type === 'direct') {
            const roomId = room.id as string;
            const { data: participants } = await supabase
              .from('room_participants')
              .select('user_id')
              .eq('room_id', roomId);

            const participantIds = (participants || []).map((p: any) => String(p.user_id));
            if (participantIds.length === 2 && 
                participantIds.includes(currentUserStr) && 
                participantIds.includes(otherUserStr)) {
              return room as any;
            }
          }
        }
      }

      // Create new room
      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          room_type: 'direct',
          created_by: currentUserStr
        })
        .select()
        .single();

      if (roomError) {
        throw roomError;
      }

      // Add participants
      const { error: participantsError } = await supabase
        .from('room_participants')
        .insert([
          { room_id: newRoom.id, user_id: currentUserStr },
          { room_id: newRoom.id, user_id: otherUserStr }
        ]);

      if (participantsError) {
        await supabase.from('chat_rooms').delete().eq('id', newRoom.id);
        throw participantsError;
      }

      return newRoom;
    } catch (error) {
      console.error('Error creating/getting chat room:', error);
      return null;
    }
  };

  const sendShareMessage = async (roomId: string, currentUserId: string, sharedUserId: string) => {
    try {
      // Create share message content with special format
      const shareData = {
        type: 'share',
        itemType: itemType,
        itemId: itemId,
        itemTitle: itemTitle,
        permissionLevel: permissionLevel
      };
      
      const messageContent = `__SHARED_ITEM__${JSON.stringify(shareData)}`;

      const { error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          sender_id: currentUserId,
          content: messageContent
        });

      if (error) {
        console.error('Error sending share message:', error);
      }
    } catch (error) {
      console.error('Error sending share message:', error);
    }
  };

  const sendShareEmailNotification = async (sharedUserId: string, currentUser: any) => {
    try {
      // Import getApiBaseUrl to get the correct API URL
      const { getApiBaseUrl } = await import('../../config/api');
      const apiBaseUrl = getApiBaseUrl();
      
      const response = await fetch(`${apiBaseUrl}/collaboration/send-share-email/`, {
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

      if (!response.ok) {
        console.error('Failed to send email notification');
      }
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
      
      // Share with each selected user
      const sharePromises = selectedUsers.map(async (userId) => {
        // 1. Create share record
        await supabase
          .from('shared_items')
          .upsert({
            item_type: itemType,
            item_id: itemId,
            shared_by: currentUserId,
            shared_with: userId,
            permission_level: permissionLevel,
            is_accepted: false
          }, {
            onConflict: 'item_type,item_id,shared_with'
          });

        // 2. Create/get chat room and send message
        const room = await createOrGetDirectRoom(userId, currentUserId);
        if (room) {
          await sendShareMessage(room.id, currentUserId, userId);
        }

        // 3. Send email notification
        await sendShareEmailNotification(userId, currentUser);
      });

      await Promise.all(sharePromises);

      setToast({ message: `Shared ${itemType} with ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`, type: 'success' });
      
      // Log activity
      await supabase
        .from('collaboration_activities')
        .insert(
          selectedUsers.map(userId => ({
            item_type: itemType,
            item_id: itemId,
            user_id: currentUserId,
            activity_type: 'shared',
            description: `Shared ${itemTitle} with user`
          }))
        );

      // Reset selected users after sharing
      setSelectedUsers([]);

      if (onShared) {
        onShared();
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error sharing item:', error);
      setToast({ message: 'Failed to share item', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Filter users: if searching, show all users; otherwise show only users with chat rooms
  const filteredUsers = (searchTerm.trim() 
    ? allUsers 
    : users
  ).filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <UserPlus className="text-indigo-600 dark:text-indigo-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Share {itemType}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">{itemTitle}</p>
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
          {/* Permission Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Permission Level
            </label>
            <div className="flex gap-2">
              {(['view', 'edit', 'comment'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setPermissionLevel(level)}
                  className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                    permissionLevel === level
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-500'
                  }`}
                >
                  <span className="capitalize">{level}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {permissionLevel === 'view' && 'Can only view'}
              {permissionLevel === 'edit' && 'Can view and edit'}
              {permissionLevel === 'comment' && 'Can view and comment'}
            </p>
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
            {!searchTerm.trim() && users.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">No users with existing conversations</p>
                <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">Search to find other users</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="mx-auto h-12 w-12 mb-2 opacity-50" />
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
            onClick={handleShare}
            disabled={loading || selectedUsers.length === 0}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? 'Sharing...' : selectedUsers.length > 0 ? `Share (${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''})` : 'Share'}
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

export default ShareModal;


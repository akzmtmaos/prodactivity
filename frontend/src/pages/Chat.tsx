import React, { useState, useEffect, useRef } from 'react';
import PageLayout from '../components/PageLayout';
import HelpButton from '../components/HelpButton';
import { MessageCircle, Search, Users, Send, MoreVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Toast from '../components/common/Toast';

interface User {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
}

interface ChatRoom {
  id: string;
  name: string | null;
  room_type: 'direct' | 'group';
  created_at: string;
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  participants?: User[];
  unread_count?: number;
}

interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_edited: boolean;
  is_deleted: boolean;
  sender?: User;
}

const Chat = () => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'chats' | 'users'>('chats');
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        // Ensure ID is converted to string for Supabase compatibility
        if (parsedUser.id) {
          parsedUser.id = String(parsedUser.id);
        }
        console.log('Chat: User loaded:', parsedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    } else {
      console.error('Chat: No user data in localStorage');
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchChatRooms();
      fetchAllUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (selectedRoom?.id) {
      // Load messages in background without clearing existing UI
      fetchMessages(selectedRoom.id);
      const unsubscribe = subscribeToMessages(selectedRoom.id);
      markAsRead(selectedRoom.id);
      
      return () => {
        // Cleanup subscription when room changes
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatRooms = async () => {
    if (!user?.id) {
      console.error('Cannot fetch chat rooms: user.id is missing');
      return;
    }
    
    try {
      setLoading(true);
      const currentUserId = String(user.id);
      
      // Fetch rooms where user is a participant
      const { data: participants, error: participantsError } = await supabase
        .from('room_participants')
        .select('*, chat_rooms(*)')
        .eq('user_id', currentUserId);

      if (participantsError) {
        console.error('Error fetching chat rooms:', participantsError);
        return;
      }

      // Process rooms and get last messages
      const roomPromises = (participants || []).map(async (participant: any) => {
        const room = participant.chat_rooms;
        
        // Get last message
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get participants for this room
        const { data: roomParticipants } = await supabase
          .from('room_participants')
          .select('user_id')
          .eq('room_id', room.id);

        const participantIds = (roomParticipants || []).map((p: any) => p.user_id);
        
        // Get user details for participants
        const { data: participantUsers } = await supabase
          .from('profiles')
          .select('id, username, email, avatar')
          .in('id', participantIds);

        // For direct messages, set name to other user's name
        let roomName = room.name;
        if (room.room_type === 'direct' && participantUsers) {
          const currentUserId = String(user.id);
          const otherUser = participantUsers.find((u: User) => String(u.id) !== currentUserId);
          if (otherUser) {
            roomName = otherUser.username;
          }
        }

        // Count unread messages
        const { data: unreadMessages } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('room_id', room.id)
          .gt('created_at', participant.last_read_at || '1970-01-01');

        return {
          id: room.id,
          name: roomName,
          room_type: room.room_type,
          created_at: room.created_at,
          last_message: lastMessage ? {
            content: lastMessage.content,
            created_at: lastMessage.created_at,
            sender_id: lastMessage.sender_id
          } : undefined,
          participants: participantUsers || [],
          unread_count: unreadMessages?.length || 0
        };
      });

      const rooms = await Promise.all(roomPromises);
      // Sort by last message time (most recent first)
      rooms.sort((a, b) => {
        const aTime = a.last_message?.created_at || a.created_at;
        const bTime = b.last_message?.created_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
      
      setChatRooms(rooms);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      setToast({ message: 'Failed to load chats', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    if (!user?.id) {
      console.error('Cannot fetch users: user.id is missing');
      return;
    }
    
    try {
      const currentUserId = String(user.id);
      console.log('Fetching all users (excluding:', currentUserId, ')');
      
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .neq('id', currentUserId)
        .order('username', { ascending: true });

      if (error) {
        console.error('Error fetching users:', error);
        setToast({ message: 'Failed to load users', type: 'error' });
        return;
      }

      // Ensure all user IDs are strings
      const normalizedUsers = (users || []).map(u => ({
        ...u,
        id: String(u.id)
      }));
      
      console.log('Fetched users:', normalizedUsers.length);
      setAllUsers(normalizedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setToast({ message: 'Failed to load users', type: 'error' });
    }
  };

  const fetchMessages = async (roomId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      // Get sender details for each message
      const senderIds = Array.from(new Set(messagesData?.map((m: any) => m.sender_id) || []));
      const { data: senders } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .in('id', senderIds);

      const messagesWithSenders = (messagesData || []).map((msg: any) => ({
        ...msg,
        sender: senders?.find((s: User) => s.id === msg.sender_id)
      }));

      setMessages(messagesWithSenders);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = (roomId: string) => {
    const channel = supabase
      .channel(`messages:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        // Fetch sender details for new message
        const newMsg = payload.new as Message;
        
        // Check if message already exists (to avoid duplicates from optimistic updates)
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === newMsg.id);
          if (exists) return prev;
          
          // Fetch sender details and add message
          supabase
            .from('profiles')
            .select('id, username, email, avatar')
            .eq('id', newMsg.sender_id)
            .single()
            .then(({ data: sender }) => {
              const messageWithSender: Message = {
                ...newMsg,
                sender: sender || undefined
              };
              setMessages(prevMsgs => {
                // Double check it doesn't exist
                if (prevMsgs.some(msg => msg.id === messageWithSender.id)) {
                  return prevMsgs;
                }
                return [...prevMsgs, messageWithSender];
              });
              markAsRead(roomId);
            });
          
          return prev;
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
          )
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (roomId: string) => {
    if (!user?.id) return;
    
    try {
      const currentUserId = String(user.id);
      await supabase
        .from('room_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', currentUserId);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const createOrGetDirectRoom = async (otherUserId: string) => {
    if (!user?.id) return null;

    try {
      // Ensure user IDs are strings
      const currentUserId = String(user.id);
      const otherUserStr = String(otherUserId);

      console.log('Creating/checking room between:', currentUserId, 'and', otherUserStr);

      // Check if direct room already exists - simpler approach
      // Get all rooms where current user is a participant
      const { data: userRooms, error: userRoomsError } = await supabase
        .from('room_participants')
        .select('room_id, chat_rooms!inner(*)')
        .eq('user_id', currentUserId);

      if (userRoomsError) {
        console.error('Error fetching user rooms:', userRoomsError);
      }

      // Check each room to see if it's a direct message with the other user
      if (userRooms) {
        for (const userRoom of userRooms) {
          // Handle the join result - chat_rooms might be an array or object
          const room = Array.isArray(userRoom.chat_rooms) 
            ? userRoom.chat_rooms[0] 
            : userRoom.chat_rooms;
          
          if (room && typeof room === 'object' && 'room_type' in room && room.room_type === 'direct') {
            const roomId = room.id as string;
            // Check participants of this room
            const { data: participants } = await supabase
              .from('room_participants')
              .select('user_id')
              .eq('room_id', roomId);

            const participantIds = (participants || []).map((p: any) => String(p.user_id));
            if (participantIds.length === 2 && 
                participantIds.includes(currentUserId) && 
                participantIds.includes(otherUserStr)) {
              // Room already exists
              console.log('Found existing room:', roomId);
              return room as any;
            }
          }
        }
      }

      // Create new direct room
      console.log('Creating new direct room...');
      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          room_type: 'direct',
          created_by: currentUserId
        })
        .select()
        .single();

      if (roomError) {
        console.error('Error creating room:', roomError);
        throw roomError;
      }

      console.log('Room created:', newRoom.id);

      // Add both users as participants
      const { error: participantsError } = await supabase
        .from('room_participants')
        .insert([
          { room_id: newRoom.id, user_id: currentUserId },
          { room_id: newRoom.id, user_id: otherUserStr }
        ]);

      if (participantsError) {
        console.error('Error adding participants:', participantsError);
        // Try to clean up the room if participants failed
        await supabase.from('chat_rooms').delete().eq('id', newRoom.id);
        throw participantsError;
      }

      console.log('Participants added successfully');
      await fetchChatRooms();
      return newRoom;
    } catch (error: any) {
      console.error('Error creating direct room:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      console.error('Error details:', {
        message: errorMessage,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      setToast({ 
        message: `Failed to start conversation: ${errorMessage}`, 
        type: 'error' 
      });
      return null;
    }
  };

  const handleStartChat = async (otherUser: User) => {
    setIsCreatingRoom(true);
    try {
      const room = await createOrGetDirectRoom(otherUser.id);
      if (room) {
        const chatRoom: ChatRoom = {
          id: room.id,
          name: otherUser.username,
          room_type: 'direct',
          created_at: room.created_at,
          participants: [otherUser]
        };
        setSelectedRoom(chatRoom);
        setActiveView('chats');
      }
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || !user?.id || isSendingMessage) return;

    const messageContent = newMessage.trim();
    const currentUserId = String(user.id);
    
    // Clear input immediately for better UX
    setNewMessage('');
    
    // Optimistically add message to UI immediately - NO LOADING SCREEN
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      room_id: selectedRoom.id,
      sender_id: currentUserId,
      content: messageContent,
      created_at: new Date().toISOString(),
      is_edited: false,
      is_deleted: false,
      sender: {
        id: currentUserId,
        username: user.username || 'You',
        email: user.email || '',
        avatar: user.avatar || null
      }
    };
    
    // Add message immediately to UI - content stays visible
    setMessages(prev => [...prev, optimisticMessage]);
    setIsSendingMessage(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: selectedRoom.id,
          sender_id: currentUserId,
          content: messageContent
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        setNewMessage(messageContent); // Restore message on error
        throw error;
      }

      // Replace optimistic message with real one - content stays visible
      if (data) {
        const realMessage: Message = {
          ...data,
          sender: optimisticMessage.sender
        };
        setMessages(prev => prev.map(msg => 
          msg.id === optimisticMessage.id ? realMessage : msg
        ));
      }
      
      // Update room's updated_at in background (non-blocking)
      supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedRoom.id);

      // Refresh chat rooms list in background (non-blocking)
      fetchChatRooms();
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      setToast({ message: `Failed to send message: ${errorMessage}`, type: 'error' });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const filteredChatRooms = chatRooms.filter(room =>
    room.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = allUsers.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Always show content, never show loading screen
  if (!user) {
    return null;
  }

  return (
    <PageLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            Messages
            <HelpButton 
              content={
                <div>
                  <p className="font-semibold mb-2">Chat & Collaboration</p>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>Direct Messages:</strong> Chat one-on-one with other users</li>
                    <li>• <strong>Group Chats:</strong> Create group conversations for collaboration</li>
                    <li>• <strong>Real-time Messaging:</strong> Messages appear instantly</li>
                    <li>• <strong>User Search:</strong> Find users by name or email to start conversations</li>
                    <li>• <strong>Activity:</strong> See when users are active and message timestamps</li>
                  </ul>
                </div>
              } 
              title="Chat Help" 
            />
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Connect and collaborate with other users
          </p>
        </div>

        <div className="flex-1 flex gap-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Sidebar - Chat List or User List */}
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setActiveView('chats');
                  setSelectedRoom(null);
                }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeView === 'chats'
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <MessageCircle className="inline-block mr-2" size={16} />
                Chats
              </button>
              <button
                onClick={() => setActiveView('users')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeView === 'users'
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Users className="inline-block mr-2" size={16} />
                Users
              </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder={activeView === 'chats' ? 'Search chats...' : 'Search users...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {activeView === 'chats' ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredChatRooms.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      <MessageCircle className="mx-auto h-12 w-12 mb-2 opacity-50" />
                      <p className="text-sm">No conversations yet</p>
                      <p className="text-xs mt-1">Start a chat from the Users tab</p>
                    </div>
                  ) : (
                    filteredChatRooms.map((room) => {
                      const currentUserId = String(user.id);
                      const otherParticipant = room.participants?.find(p => String(p.id) !== currentUserId);
                      const displayName: string = room.room_type === 'direct' 
                        ? (otherParticipant?.username || room.name || 'Unknown User')
                        : (room.name || 'Group Chat');
                      
                      return (
                        <button
                          key={room.id}
                          onClick={() => setSelectedRoom(room)}
                          className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                            selectedRoom?.id === room.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              {room.room_type === 'direct' && otherParticipant?.avatar ? (
                                <img
                                  src={otherParticipant.avatar}
                                  alt={displayName}
                                  className="w-12 h-12 rounded-full"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                  {room.room_type === 'direct' ? (
                                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-lg">
                                      {displayName.charAt(0).toUpperCase()}
                                    </span>
                                  ) : (
                                    <Users className="text-indigo-600 dark:text-indigo-400" size={20} />
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                                  {displayName}
                                </h3>
                                {room.last_message && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                                    {new Date(room.last_message.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                )}
                              </div>
                              {room.last_message && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                  {String(room.last_message.sender_id) === String(user.id) ? 'You: ' : ''}
                                  {room.last_message.content}
                                </p>
                              )}
                              {room.unread_count && room.unread_count > 0 && (
                                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-indigo-600 text-white rounded-full">
                                  {room.unread_count}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      <Users className="mx-auto h-12 w-12 mb-2 opacity-50" />
                      <p className="text-sm">No users found</p>
                    </div>
                  ) : (
                    filteredUsers.map((otherUser) => (
                      <button
                        key={otherUser.id}
                        onClick={() => handleStartChat(otherUser)}
                        disabled={isCreatingRoom}
                        className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {otherUser.avatar ? (
                          <img
                            src={otherUser.avatar}
                            alt={otherUser.username}
                            className="w-12 h-12 rounded-full"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-lg">
                              {otherUser.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                            {otherUser.username}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {otherUser.email}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col transition-opacity duration-200">
            {selectedRoom ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
                  <div className="flex items-center gap-3">
                    {selectedRoom.room_type === 'direct' && selectedRoom.participants?.[0]?.avatar ? (
                      <img
                        src={selectedRoom.participants[0].avatar}
                        alt={selectedRoom.name || ''}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        {selectedRoom.room_type === 'direct' ? (
                          <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                            {selectedRoom.name?.charAt(0).toUpperCase()}
                          </span>
                        ) : (
                          <Users className="text-indigo-600 dark:text-indigo-400" size={18} />
                        )}
                      </div>
                    )}
                    <div>
                      <h2 className="font-semibold text-gray-900 dark:text-white">
                        {selectedRoom.name || 'Chat'}
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedRoom.room_type === 'direct' ? 'Direct message' : `${selectedRoom.participants?.length || 0} participants`}
                      </p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                    <MoreVertical className="text-gray-600 dark:text-gray-400" size={20} />
                  </button>
                </div>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 relative"
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                      <div className="text-center">
                        <MessageCircle className="mx-auto h-12 w-12 mb-2 opacity-50" />
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs mt-1">Start the conversation!</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((message, index) => {
                      const currentUserId = String(user.id);
                      const isOwnMessage = String(message.sender_id) === currentUserId;
                      const prevMessage = index > 0 ? messages[index - 1] : null;
                      const showAvatar = !prevMessage || String(prevMessage.sender_id) !== String(message.sender_id);
                      const messageDate = new Date(message.created_at);
                      const prevMessageDate = prevMessage ? new Date(prevMessage.created_at) : null;
                      const showDateSeparator = !prevMessageDate || 
                        messageDate.toDateString() !== prevMessageDate.toDateString();

                      return (
                        <React.Fragment key={message.id}>
                          {showDateSeparator && (
                            <div className="flex justify-center my-4">
                              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                                {messageDate.toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          )}
                          <div
                            className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                          >
                            {showAvatar && !isOwnMessage && (
                              <div className="flex-shrink-0">
                                {message.sender?.avatar ? (
                                  <img
                                    src={message.sender.avatar}
                                    alt={message.sender.username}
                                    className="w-8 h-8 rounded-full"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                                      {message.sender?.username?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            {!showAvatar && !isOwnMessage && <div className="w-8" />}
                            <div
                              className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}
                            >
                              {showAvatar && !isOwnMessage && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  {message.sender?.username || 'Unknown'}
                                </span>
                              )}
                              <div
                                className={`px-4 py-2 rounded-2xl ${
                                  isOwnMessage
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {messageDate.toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      disabled={isSendingMessage}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || isSendingMessage}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <Send size={18} />
                      Send
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <MessageCircle className="mx-auto h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Select a conversation</p>
                  <p className="text-sm mt-2">Choose a chat from the list or start a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </PageLayout>
  );
};

export default Chat;


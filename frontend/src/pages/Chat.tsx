import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Toast from '../components/common/Toast';
import { useNavbar } from '../context/NavbarContext';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import {
  ChatSidebar,
  ChatHeader,
  MessagesList,
  MessageInput,
  ProfileView,
  CreateGroupChatModal,
  AddMembersToGroupModal,
  GroupInfoPanel,
  type ChatRoom,
  type User,
  type Message,
  type Attachment,
  getAvatarUrl,
} from '../components/chat';

const Chat = () => {
  const { isCollapsed } = useNavbar();
  const { userId, roomId } = useParams<{ userId?: string; roomId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'chats' | 'groups'>('chats');
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const selectedRoomRef = useRef<ChatRoom | null>(null);
  const userRef = useRef<any | null>(null);
  
  // Keep refs in sync with state
  useEffect(() => {
    selectedRoomRef.current = selectedRoom;
  }, [selectedRoom]);
  
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
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
      // Don't fetch all users by default - only fetch when searching
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Sync profile view with URL query (?profile=username)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const profileUsername = params.get('profile');
    const startUsername = params.get('start');

    if (profileUsername) {
      setViewingProfile(profileUsername);
      setSelectedRoom(null);
      setActiveView('chats');
    } else if (startUsername && user?.id) {
      // Start chat with user from Find Friends (navbar)
      setViewingProfile(null);
      setActiveView('chats');
      const username = decodeURIComponent(startUsername);
      navigate('/chat', { replace: true }); // Clear param to avoid re-triggering
      handleStartChat(username);
    } else {
      if (!selectedRoom) {
        setViewingProfile(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, user?.id]);

  // Only clear and refetch messages when the room *id* changes, not when selectedRoom is replaced with a new object ref (e.g. after fetchChatRooms)
  useEffect(() => {
    const roomId = selectedRoom?.id;
    if (roomId) {
      setMessages([]);
      fetchMessages(roomId);
      const unsubscribe = subscribeToMessages(roomId);
      markAsRead(roomId);
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
        if (subscriptionRef.current) {
          supabase.removeChannel(subscriptionRef.current);
          subscriptionRef.current = null;
        }
      };
    } else {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom?.id]);

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
      
      const { data: participants, error: participantsError } = await supabase
        .from('room_participants')
        .select('*, chat_rooms(*)')
        .eq('user_id', currentUserId);

      if (participantsError) {
        console.error('Error fetching chat rooms:', participantsError);
        return;
      }

      const roomPromises = (participants || []).map(async (participant: any) => {
        const room = participant.chat_rooms;
        
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { data: roomParticipants } = await supabase
          .from('room_participants')
          .select('user_id')
          .eq('room_id', room.id);

        const participantIds = (roomParticipants || []).map((p: any) => p.user_id);
        
        const { data: participantUsers } = await supabase
          .from('profiles')
          .select('id, username, email, avatar')
          .in('id', participantIds);

        const processedUsers = (participantUsers || []).map((u: any) => ({
          ...u,
          avatar: getAvatarUrl(u.avatar)
        }));

        let roomName = room.name;
        if (room.room_type === 'direct' && processedUsers) {
          const currentUserId = String(user.id);
          const otherUser = processedUsers.find((u: User) => String(u.id) !== currentUserId);
          if (otherUser) {
            roomName = otherUser.username;
          }
        }

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
          created_by: room.created_by ?? undefined,
          avatar_url: room.avatar_url ?? undefined,
          last_message: lastMessage ? {
            content: lastMessage.content,
            created_at: lastMessage.created_at,
            sender_id: lastMessage.sender_id
          } : undefined,
          participants: processedUsers || [],
          unread_count: unreadMessages?.length || 0
        };
      });

      const rooms = await Promise.all(roomPromises);
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

      const senderIds = Array.from(new Set(messagesData?.map((m: any) => String(m.sender_id)) || []));
      
      if (senderIds.length > 0) {
        const { data: senders, error: sendersError } = await supabase
          .from('profiles')
          .select('id, username, email, avatar')
          .in('id', senderIds);

        if (sendersError) {
          console.error('Error fetching senders:', sendersError);
        }

        const processedSenders = (senders || []).map((s: any) => ({
          ...s,
          id: String(s.id),
          avatar: getAvatarUrl(s.avatar)
        }));

        const participantMap = new Map<string, User>();
        if (selectedRoom?.participants) {
          selectedRoom.participants.forEach(p => {
            participantMap.set(String(p.id), {
              ...p,
              avatar: getAvatarUrl(p.avatar)
            });
          });
        }

        const messagesWithSenders = (messagesData || []).map((msg: any) => {
          const senderId = String(msg.sender_id);
          let sender = processedSenders?.find((s: User) => String(s.id) === senderId);
          
          if (!sender) {
            const participant = participantMap.get(senderId);
            if (participant) {
              sender = participant;
            }
          }
          
          // Parse attachments from content
          const { text, attachments } = parseAttachmentsFromContent(msg.content || '');
          
          console.log('📥 Fetched message:', { 
            msgId: msg.id, 
            hasAttachments: !!attachments, 
            attachmentCount: attachments?.length || 0,
            contentPreview: msg.content?.substring(0, 100)
          });
          
          return {
            ...msg,
            sender_id: senderId,
            content: text,
            attachments: attachments || undefined,
            sender: sender || undefined
          };
        });

        setMessages(messagesWithSenders);
      } else {
        setMessages(messagesData || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = useCallback((roomId: string) => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channel = supabase
      .channel(`messages:${roomId}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      }, async (payload) => {
        console.log('📨 Real-time message received:', payload.new);
        const newMsg = payload.new as any;
        
        // Use functional updates to access latest state
        setMessages(prev => {
          const currentUserId = String(userRef.current?.id || user?.id);
          
          // Check if message already exists
          const existingIndex = prev.findIndex(msg => msg.id === newMsg.id);
          if (existingIndex >= 0) {
            // Update status to 'sent' if it was 'sending'
            const existing = prev[existingIndex];
            if (existing.status === 'sending') {
              const updated = [...prev];
              updated[existingIndex] = {
                ...existing,
                ...newMsg,
                status: 'sent' as const,
                sender: existing.sender
              };
              return updated;
            }
            return prev;
          }
          
          // Try to find and replace optimistic message
          const optimisticIndex = prev.findIndex(msg => 
            msg.id.startsWith('temp-') && 
            String(msg.sender_id) === String(newMsg.sender_id) && 
            msg.content === newMsg.content
          );
          
          // Parse attachments from content
          const { text, attachments } = parseAttachmentsFromContent(newMsg.content || '');
          
          console.log('📨 Processing real-time message:', { 
            msgId: newMsg.id, 
            hasAttachments: !!attachments, 
            attachmentCount: attachments?.length || 0,
            contentPreview: newMsg.content?.substring(0, 100)
          });
          
          if (optimisticIndex >= 0) {
            // Replace optimistic message with real one and mark as sent
            const optimisticMsg = prev[optimisticIndex];
            // Use parsed attachments, fallback to optimistic attachments if parsing failed
            const finalAttachments = attachments || optimisticMsg.attachments;
            console.log('🔄 Replacing optimistic message:', { 
              optimisticAttachments: optimisticMsg.attachments?.length || 0,
              parsedAttachments: attachments?.length || 0,
              finalAttachments: finalAttachments?.length || 0
            });
            const realMessage: Message = {
              ...newMsg,
              content: text,
              attachments: finalAttachments,
              sender: optimisticMsg.sender,
              status: 'sent' as const
            };
            
            const newMsgs = [...prev];
            newMsgs[optimisticIndex] = realMessage;
            markAsRead(roomId);
            return newMsgs;
          }
          
          // Add new message immediately with participant data if available
          const latestRoom = selectedRoomRef.current;
          let senderData: User | undefined;
          
          // Try participant data first (immediate, no fetch needed)
          if (latestRoom?.participants) {
            senderData = latestRoom.participants.find(p => 
              String(p.id) === String(newMsg.sender_id)
            );
          }
          
          console.log('➕ Adding new message to UI:', { 
            msgId: newMsg.id, 
            hasAttachments: !!attachments, 
            attachmentCount: attachments?.length || 0,
            attachments: attachments 
          });
          
          const messageToAdd: Message = {
            ...newMsg,
            content: text,
            attachments: attachments || undefined,
            sender: senderData,
            status: String(newMsg.sender_id) === currentUserId ? ('sent' as const) : undefined
          };
          
          console.log('📨 Message object created:', { 
            id: messageToAdd.id,
            attachmentsCount: messageToAdd.attachments?.length || 0,
            attachments: messageToAdd.attachments 
          });
          
          // Fetch sender details asynchronously if not available from participants
          if (!senderData) {
            (async () => {
              try {
                const { data: sender } = await supabase
                  .from('profiles')
                  .select('id, username, email, avatar')
                  .eq('id', newMsg.sender_id)
                  .single();
                
                if (sender) {
                  const enrichedSender = {
                    ...sender,
                    avatar: getAvatarUrl(sender.avatar)
                  };
                  
                  setMessages(prevMsgs => {
                    return prevMsgs.map(msg => 
                      msg.id === newMsg.id 
                        ? {
                            ...msg,
                            sender: enrichedSender
                          }
                        : msg
                    );
                  });
                }
              } catch (err: any) {
                console.error('Error fetching sender details:', err);
              }
            })();
          }
          
          markAsRead(roomId);
          return [...prev, messageToAdd];
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
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active for room:', roomId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error for room:', roomId);
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Real-time subscription timed out for room:', roomId);
        } else if (status === 'CLOSED') {
          console.log('🔌 Real-time subscription closed for room:', roomId);
        }
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('🧹 Cleaning up subscription for room:', roomId);
      supabase.removeChannel(channel);
      subscriptionRef.current = null;
    };
  }, [user?.id]);

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

  const createGroupChat = async (name: string, memberIds: string[]) => {
    if (!user?.id) return;
    const currentUserId = String(user.id);
    try {
      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          room_type: 'group',
          name: name.trim(),
          created_by: currentUserId,
        })
        .select()
        .single();
      if (roomError) throw roomError;
      const participants = [{ room_id: newRoom.id, user_id: currentUserId }, ...memberIds.map((user_id) => ({ room_id: newRoom.id, user_id }))];
      const { error: participantsError } = await supabase.from('room_participants').insert(participants);
      if (participantsError) throw participantsError;
      await fetchChatRooms();
      const { data: participantUsers } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .in('id', [currentUserId, ...memberIds]);
      const processedUsers = (participantUsers || []).map((u: any) => ({
        ...u,
        id: String(u.id),
        avatar: getAvatarUrl(u.avatar),
      }));
      const chatRoom: ChatRoom = {
        id: newRoom.id,
        name: newRoom.name || name,
        room_type: 'group',
        created_at: newRoom.created_at,
        created_by: newRoom.created_by ?? currentUserId,
        participants: processedUsers,
      };
      setSelectedRoom(chatRoom);
      setActiveView('groups');
      navigate(`/chat/group/${chatRoom.id}`, { replace: true });
      setToast({ message: 'Group created', type: 'success' });
    } catch (error: any) {
      console.error('Error creating group:', error);
      setToast({ message: error?.message || 'Failed to create group', type: 'error' });
      throw error;
    }
  };

  const refreshSelectedRoomParticipants = async () => {
    if (!selectedRoom?.id || !user?.id) return;
    const { data: participants } = await supabase
      .from('room_participants')
      .select('user_id')
      .eq('room_id', selectedRoom.id);
    const ids = (participants || []).map((p: any) => String(p.user_id));
    if (ids.length === 0) return;
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, email, avatar')
      .in('id', ids);
    const processed = (profiles || []).map((p: any) => ({
      ...p,
      id: String(p.id),
      avatar: getAvatarUrl(p.avatar),
    }));
    setSelectedRoom((prev) => (prev ? { ...prev, participants: processed } : null));
    await fetchChatRooms();
  };

  // Updates group name and/or avatar. Requires chat_rooms.avatar_url column for photo (run: ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS avatar_url TEXT;)
  const updateGroupRoom = async (id: string, updates: { name?: string; avatar_url?: string | null }) => {
    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      setSelectedRoom((prev) => {
        if (!prev || prev.id !== id) return prev;
        return { ...prev, ...updates };
      });
      await fetchChatRooms();
    } catch (err: any) {
      const msg = err?.message || 'Failed to update group';
      setToast({ message: msg, type: 'error' });
      throw err;
    }
  };

  const uploadGroupPhoto = async (id: string, file: File): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `group_avatars/${id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('chat_attachments')
        .upload(path, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('chat_attachments').getPublicUrl(path);
      return data?.publicUrl ?? null;
    } catch (err: any) {
      const msg = err?.message || 'Failed to upload photo';
      setToast({ message: msg, type: 'error' });
      throw err;
    }
  };

  const removeGroupMember = async (roomId: string, userId: string) => {
    if (!user?.id || !selectedRoom) return;
    const currentUserId = String(user.id);
    const createdBy = selectedRoom.created_by ?? null;
    if (!createdBy || String(createdBy) !== currentUserId) {
      setToast({ message: 'Only the group owner can remove members', type: 'error' });
      return;
    }
    if (userId === currentUserId) {
      setToast({ message: 'You cannot remove yourself', type: 'error' });
      return;
    }
    try {
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);
      if (error) throw error;
      await refreshSelectedRoomParticipants();
      setToast({ message: 'Member removed', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.message || 'Failed to remove member', type: 'error' });
      throw err;
    }
  };

  const createOrGetDirectRoom = async (otherUserId: string) => {
    if (!user?.id) return null;

    try {
      const currentUserId = String(user.id);
      const otherUserStr = String(otherUserId);

      const { data: userRooms, error: userRoomsError } = await supabase
        .from('room_participants')
        .select('room_id, chat_rooms!inner(*)')
        .eq('user_id', currentUserId);

      if (userRoomsError) {
        console.error('Error fetching user rooms:', userRoomsError);
      }

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
                participantIds.includes(currentUserId) && 
                participantIds.includes(otherUserStr)) {
              console.log('Found existing room:', roomId);
              return room as any;
            }
          }
        }
      }

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

      const { error: participantsError } = await supabase
        .from('room_participants')
        .insert([
          { room_id: newRoom.id, user_id: currentUserId },
          { room_id: newRoom.id, user_id: otherUserStr }
        ]);

      if (participantsError) {
        console.error('Error adding participants:', participantsError);
        await supabase.from('chat_rooms').delete().eq('id', newRoom.id);
        throw participantsError;
      }

      console.log('Participants added successfully');
      await fetchChatRooms();
      return newRoom;
    } catch (error: any) {
      console.error('Error creating direct room:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      setToast({ 
        message: `Failed to start conversation: ${errorMessage}`, 
        type: 'error' 
      });
      return null;
    }
  };

  const handleStartChat = async (otherUser: User | string) => {
    let targetUser: User;
    
    if (typeof otherUser === 'string') {
      try {
        const response = await axiosInstance.get(`/profile/${otherUser}/`);
        const profile = response.data;
        targetUser = {
          id: String(profile.id),
          username: profile.username,
          email: profile.email || '',
          avatar: getAvatarUrl(profile.avatar)
        };
      } catch (error) {
        console.error('Error fetching user:', error);
        setToast({ message: 'Failed to start chat', type: 'error' });
        return;
      }
    } else {
      targetUser = otherUser;
    }

    setIsCreatingRoom(true);
    try {
      const room = await createOrGetDirectRoom(targetUser.id);
      if (room) {
        const { data: participantUsers } = await supabase
          .from('profiles')
          .select('id, username, email, avatar')
          .eq('id', targetUser.id);
        
        const processedUser = participantUsers?.[0] ? {
          ...participantUsers[0],
          avatar: getAvatarUrl(participantUsers[0].avatar)
        } : targetUser;

        const chatRoom: ChatRoom = {
          id: room.id,
          name: processedUser.username,
          room_type: 'direct',
          created_at: room.created_at,
          participants: [processedUser]
        };
        setSelectedRoom(chatRoom);
        setActiveView('chats');
        // Update URL to include userId
        navigate(`/chat/${targetUser.id}`, { replace: true });
      }
    } finally {
      setIsCreatingRoom(false);
    }
  };


  // Handler for room selection that also updates URL
  const handleRoomSelect = (room: ChatRoom | null) => {
    if (!room) {
      setSelectedRoom(null);
      setViewingProfile(null);
      navigate('/chat', { replace: true });
      return;
    }
    setSelectedRoom(room);
    setViewingProfile(null);
    if (room.room_type === 'direct' && user?.id) {
      const otherParticipant = room.participants?.find(p => String(p.id) !== String(user.id));
      if (otherParticipant) {
        navigate(`/chat/${otherParticipant.id}`, { replace: true });
      }
    } else {
      navigate(`/chat/group/${room.id}`, { replace: true });
    }
  };

  // When URL has /chat/group/:roomId, select that group room (avoid replacing same room with new ref so messages don't clear)
  useEffect(() => {
    if (!roomId || !user?.id) return;
    const existing = chatRooms.find((r) => r.id === roomId && r.room_type === 'group');
    if (existing) {
      setSelectedRoom((prev) => (prev?.id === existing.id ? prev : existing));
      setActiveView('groups');
      setViewingProfile(null);
    }
  }, [roomId, user?.id, chatRooms]);

  // Handle URL parameter to automatically start/open chat with user (e.g. from profile page Message button)
  useEffect(() => {
    if (!userId || !user?.id) return;

    // Check if we already have this room in our list
    const existingRoom = chatRooms.find(room => {
      if (room.room_type === 'direct' && room.participants) {
        return room.participants.some(p => String(p.id) === String(userId));
      }
      return false;
    });

    if (existingRoom) {
      handleRoomSelect(existingRoom);
      return;
    }

    // Don't create if we already have this room selected
    if (selectedRoom && selectedRoom.room_type === 'direct' && selectedRoom.participants?.some(p => String(p.id) === String(userId))) {
      return;
    }

    // Room doesn't exist in list - fetch user and create/select room
    (async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, email, avatar')
          .eq('id', userId)
          .single();

        if (profile) {
          const targetUser: User = {
            id: String(profile.id),
            username: profile.username,
            email: profile.email || '',
            avatar: getAvatarUrl(profile.avatar)
          };
          handleStartChat(targetUser);
        }
      } catch (error) {
        console.error('Error fetching user for chat:', error);
      }
    })();
  }, [userId, user?.id, chatRooms]);

  // Clear URL when room is cleared
  useEffect(() => {
    if (selectedRoom === null && (userId || roomId)) {
      navigate('/chat', { replace: true });
    }
  }, [selectedRoom, userId, roomId]);

  const uploadAttachments = async (attachments: Attachment[]): Promise<Attachment[]> => {
    if (!attachments || attachments.length === 0) return [];
    if (!user?.id || !selectedRoom) {
      console.error('❌ Missing user or selectedRoom for attachment upload');
      throw new Error('User or room not available');
    }

    const currentUserId = String(user.id);
    const uploadedAttachments: Attachment[] = [];

    console.log('📤 Starting attachment upload...', { 
      count: attachments.length, 
      roomId: selectedRoom.id,
      attachments: attachments.map(a => ({ name: a.name, type: a.type, url: a.url?.substring(0, 50) }))
    });

    // FIRST: Convert all blob/data URLs to File objects SYNCHRONOUSLY before async uploads
    // This prevents blob URLs from being invalidated during async operations
    console.log('📦 Converting all attachments to File objects...');
    const filePromises: Promise<{ file: File; attachment: Attachment; index: number } | null>[] = [];
    
    for (let i = 0; i < attachments.length; i++) {
      const att = attachments[i];
      
      // If already a permanent URL, we'll handle it separately
      if (att.url.startsWith('http://') || att.url.startsWith('https://')) {
        console.log(`⏭️ Attachment ${i + 1}/${attachments.length} already has permanent URL, skipping conversion`);
        filePromises.push(Promise.resolve({ file: null as any, attachment: att, index: i }));
        continue;
      }

      // Convert blob/data URL to File - do this synchronously for all attachments
      const convertPromise = (async () => {
        try {
          console.log(`📁 Converting attachment ${i + 1}/${attachments.length} to File:`, { name: att.name, urlType: att.url.substring(0, 20) });
          
          let file: File;
          if (att.url.startsWith('blob:') || att.url.startsWith('data:')) {
            const response = await fetch(att.url);
            const blob = await response.blob();
            file = new File([blob], att.name, { type: att.mime_type || blob.type });
            console.log(`✅ Converted attachment ${i + 1}/${attachments.length} to File:`, { name: file.name, size: file.size, type: file.type });
          } else {
            console.warn(`⚠️ Unknown URL type for attachment ${i + 1}/${attachments.length}, skipping:`, att.url);
            return null;
          }
          
          return { file, attachment: att, index: i };
        } catch (error) {
          console.error(`❌ Error converting attachment ${i + 1}/${attachments.length} to File:`, error);
          return null;
        }
      })();
      
      filePromises.push(convertPromise);
    }

    // Wait for ALL conversions to complete before starting uploads
    const convertedFiles = await Promise.all(filePromises);
    console.log(`✅ Converted ${convertedFiles.filter(f => f !== null).length}/${attachments.length} attachments to File objects`);

    // NOW: Upload all the converted files
    for (const converted of convertedFiles) {
      if (!converted) {
        console.warn(`⚠️ Skipping null converted file`);
        continue;
      }

      const { file, attachment: att, index: i } = converted;
      
      try {
        // If it's already a permanent URL, just add it
        if (att.url.startsWith('http://') || att.url.startsWith('https://')) {
          console.log(`⏭️ Skipping upload for existing URL (${i + 1}/${attachments.length}):`, att.url);
          uploadedAttachments.push(att);
          continue;
        }

        if (!file) {
          console.warn(`⚠️ No file to upload for attachment ${i + 1}/${attachments.length}`);
          continue;
        }

        // Create unique filename with index to ensure uniqueness
        const fileExt = att.name.split('.').pop() || 'bin';
        const sanitizedName = att.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const fileName = `${currentUserId}_${timestamp}_${i}_${randomStr}_${sanitizedName}`;
        const filePath = `chat_attachments/${selectedRoom.id}/${fileName}`;

        console.log(`📤 Uploading attachment ${i + 1}/${attachments.length} to Supabase Storage:`, { bucket: 'chat_attachments', path: filePath, size: file.size });

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat_attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('❌ Error uploading attachment:', uploadError);
          const errorMessage = uploadError.message || 'Unknown upload error';
          
          // If bucket doesn't exist, throw a more helpful error
          if (errorMessage.includes('not found') || errorMessage.includes('Bucket') || errorMessage.includes('does not exist')) {
            throw new Error('Storage bucket "chat_attachments" not found. Please create it in Supabase Storage settings.');
          }
          
          throw new Error(`Upload failed: ${errorMessage}`);
        }

        console.log('✅ Upload successful:', uploadData);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('chat_attachments')
          .getPublicUrl(filePath);

        console.log('✅ Public URL generated:', urlData.publicUrl);

        uploadedAttachments.push({
          url: urlData.publicUrl,
          type: att.type,
          name: att.name,
          size: att.size,
          mime_type: att.mime_type,
        });
        
        console.log(`✅ Successfully uploaded attachment ${i + 1}/${attachments.length}:`, { name: att.name, url: urlData.publicUrl });
      } catch (error: any) {
        console.error(`❌ Error processing attachment ${i + 1}/${attachments.length}:`, error, { name: att.name, type: att.type });
        // If it's a critical error (like bucket not found), throw it
        if (error.message?.includes('not found') || error.message?.includes('Bucket')) {
          throw error;
        }
        // Otherwise, continue with other attachments but log the error
        console.warn(`⚠️ Skipping attachment ${i + 1}/${attachments.length}, continuing with others...`);
      }
    }

    console.log('✅ Upload complete:', { 
      uploaded: uploadedAttachments.length, 
      total: attachments.length,
      successRate: uploadedAttachments.length > 0 ? `${((uploadedAttachments.length / attachments.length) * 100).toFixed(1)}%` : '0%'
    });
    
    if (uploadedAttachments.length === 0 && attachments.length > 0) {
      throw new Error('Failed to upload any attachments. Please check your Supabase Storage configuration.');
    }
    
    if (uploadedAttachments.length < attachments.length) {
      console.warn(`⚠️ WARNING: Only ${uploadedAttachments.length} out of ${attachments.length} attachments uploaded successfully`);
    }
    
    return uploadedAttachments;
  };

  const parseAttachmentsFromContent = (content: string): { text: string; attachments: Attachment[] | undefined } => {
    if (!content) return { text: '', attachments: undefined };
    
    // Use [\s\S] instead of . to match newlines as well
    const attachmentsMatch = content.match(/__ATTACHMENTS__([\s\S]+)$/);
    if (attachmentsMatch && attachmentsMatch[1]) {
      try {
        const attachmentsJson = attachmentsMatch[1].trim();
        console.log('📎 Attempting to parse attachments JSON (first 200 chars):', attachmentsJson.substring(0, 200));
        const attachments = JSON.parse(attachmentsJson) as Attachment[];
        if (!Array.isArray(attachments)) {
          console.error('❌ Parsed attachments is not an array:', attachments);
          return { text: content.replace(/__ATTACHMENTS__[\s\S]+$/, '').trim(), attachments: undefined };
        }
        const text = content.replace(/__ATTACHMENTS__[\s\S]+$/, '').trim();
        console.log('✅ Successfully parsed attachments:', { 
          count: attachments.length, 
          attachments: attachments.map(a => ({ type: a.type, name: a.name, url: a.url?.substring(0, 50) }))
        });
        return { text, attachments };
      } catch (e) {
        console.error('❌ Error parsing attachments JSON:', e);
        console.error('❌ JSON string (first 500 chars):', attachmentsMatch[1].substring(0, 500));
        // Return content without attachments part if parsing fails
        return { text: content.replace(/__ATTACHMENTS__[\s\S]+$/, '').trim(), attachments: undefined };
      }
    }
    return { text: content, attachments: undefined };
  };

  const handleSendMessage = async (e: React.FormEvent, attachments?: Attachment[]) => {
    e.preventDefault();
    if ((!newMessage.trim() && (!attachments || attachments.length === 0)) || !selectedRoom || !user?.id || isSendingMessage) return;

    const messageContent = newMessage.trim();
    const currentUserId = String(user.id);
    
    setNewMessage('');
    
    // Upload attachments first
    let uploadedAttachments: Attachment[] = [];
    if (attachments && attachments.length > 0) {
      setIsSendingMessage(true);
      try {
        uploadedAttachments = await uploadAttachments(attachments);
        if (uploadedAttachments.length === 0 && attachments.length > 0) {
          setToast({ 
            message: 'Failed to upload attachments. Please check if the "chat_attachments" storage bucket exists in Supabase.', 
            type: 'error' 
          });
          setIsSendingMessage(false);
          return;
        }
      } catch (error: any) {
        console.error('Error uploading attachments:', error);
        const errorMessage = error?.message || 'Failed to upload attachments. Please try again.';
        setToast({ 
          message: errorMessage, 
          type: 'error' 
        });
        setIsSendingMessage(false);
        return;
      }
    }
    
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      room_id: selectedRoom.id,
      sender_id: currentUserId,
      content: messageContent,
      created_at: new Date().toISOString(),
      is_edited: false,
      is_deleted: false,
      status: 'sending',
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      sender: {
        id: currentUserId,
        username: user.username || 'You',
        email: user.email || '',
        avatar: getAvatarUrl(user.avatar)
      }
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setIsSendingMessage(true);

    try {
      // Store attachments as JSON appended to content (will parse on fetch)
      let contentToStore = messageContent;
      if (uploadedAttachments.length > 0) {
        const attachmentsJson = JSON.stringify(uploadedAttachments);
        console.log('💾 Storing attachments in content:', { 
          count: uploadedAttachments.length,
          attachments: uploadedAttachments.map(a => ({ type: a.type, name: a.name })),
          jsonLength: attachmentsJson.length 
        });
        if (!messageContent) {
          contentToStore = `__ATTACHMENTS__${attachmentsJson}`;
        } else {
          contentToStore = `${messageContent}__ATTACHMENTS__${attachmentsJson}`;
        }
        console.log('💾 Final content to store (first 500 chars):', contentToStore.substring(0, 500));
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: selectedRoom.id,
          sender_id: currentUserId,
          content: contentToStore
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        // Update status to failed instead of removing
        setMessages(prev => prev.map(msg => 
          msg.id === optimisticMessage.id 
            ? { ...msg, status: 'failed' as const }
            : msg
        ));
        setNewMessage(messageContent);
        setIsSendingMessage(false);
        setToast({ message: `Failed to send message: ${error.message}`, type: 'error' });
        return;
      }

      // Immediately update status to 'sent' after successful insert
      if (data) {
        console.log('✅ Message sent successfully, updating status to "sent"', data.id);
        setMessages(prev => {
          // Find optimistic message by temp ID
          const optimisticIndex = prev.findIndex(msg => msg.id === optimisticMessage.id);
          
          if (optimisticIndex >= 0) {
            // Replace with real message and mark as sent
            const newMsgs = [...prev];
            newMsgs[optimisticIndex] = {
              ...data,
              content: messageContent, // Restore original content
              attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
              sender: optimisticMessage.sender,
              status: 'sent' as const
            };
            return newMsgs;
          }
          
          // Fallback: find by content matching
          const matchingIndex = prev.findIndex(msg => 
            msg.id.startsWith('temp-') && 
            String(msg.sender_id) === currentUserId && 
            msg.content === messageContent
          );
          
          if (matchingIndex >= 0) {
            const newMsgs = [...prev];
            newMsgs[matchingIndex] = {
              ...data,
              content: messageContent,
              attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
              sender: prev[matchingIndex].sender || optimisticMessage.sender,
              status: 'sent' as const
            };
            return newMsgs;
          }
          
          return prev;
        });
      }
      
      // Update room timestamp
      supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedRoom.id);

      // Refresh chat rooms list
      fetchChatRooms();
      
      setIsSendingMessage(false);
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Status will be set to 'failed' above if it's a Supabase error
      // This catch is for unexpected errors
      if (!error?.code) {
        setMessages(prev => prev.map(msg => 
          msg.id === optimisticMessage.id 
            ? { ...msg, status: 'failed' as const }
            : msg
        ));
        setIsSendingMessage(false);
      }
    }
  };

  const filteredChatRooms = chatRooms
    .filter(room => activeView === 'chats' ? room.room_type === 'direct' : room.room_type === 'group')
    .filter(room => {
      const search = searchTerm.toLowerCase().trim();
      if (!search) return true;
      const name = room.name?.toLowerCase() || '';
      const participantNames = room.participants?.map(p => p.username?.toLowerCase()).filter(Boolean).join(' ') || '';
      return name.includes(search) || participantNames.includes(search);
    });

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-full h-full flex flex-col" style={{ margin: 0, padding: 0, paddingTop: 0, marginTop: 0, zIndex: 1 }}>
        <div className={`flex-1 flex gap-0 bg-white dark:bg-[#1e1e1e] overflow-hidden h-full mt-12 md:mt-12 ${isCollapsed ? 'md:ml-14' : 'md:ml-48'} transition-[margin] duration-300 ease-in-out`}>
          <ChatSidebar
            activeView={activeView}
            searchTerm={searchTerm}
            filteredChatRooms={filteredChatRooms}
            selectedRoom={selectedRoom}
            currentUserId={String(user.id)}
            onViewChange={setActiveView}
            onSearchChange={setSearchTerm}
            onRoomSelect={handleRoomSelect}
            onCreateGroupClick={() => setShowCreateGroupModal(true)}
          />

          <div className="flex-1 flex flex-col transition-opacity duration-200 h-full min-w-0">
            {selectedRoom ? (
              <>
                <ChatHeader
                  room={selectedRoom}
                  currentUserId={String(user.id)}
                  onAddMembers={selectedRoom.room_type === 'group' ? () => setShowAddMembersModal(true) : undefined}
                />
                
                <MessagesList
                  messages={messages}
                  currentUserId={String(user.id)}
                  selectedRoom={selectedRoom}
                  messagesEndRef={messagesEndRef}
                  messagesContainerRef={messagesContainerRef}
                />

                <MessageInput
                  newMessage={newMessage}
                  isSendingMessage={isSendingMessage}
                  onMessageChange={setNewMessage}
                  onSubmit={handleSendMessage}
                />
              </>
            ) : viewingProfile ? (
              <ProfileView
                username={viewingProfile}
                onClose={() => {
                  setViewingProfile(null);
                  // Remove profile param from URL but stay on /chat
                  navigate('/chat', { replace: true });
                }}
                onStartChat={(username) => handleStartChat(username)}
              />
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

          {selectedRoom?.room_type === 'group' && (
            <GroupInfoPanel
              room={selectedRoom}
              currentUserId={String(user.id)}
              createdBy={selectedRoom.created_by}
              onUpdateRoom={async (updates) => {
                await updateGroupRoom(selectedRoom.id, updates);
              }}
              onPhotoChange={async (file) => uploadGroupPhoto(selectedRoom.id, file)}
              onAddMembers={() => setShowAddMembersModal(true)}
              onRemoveMember={
                selectedRoom.created_by && String(selectedRoom.created_by) === String(user.id)
                  ? (userId) => removeGroupMember(selectedRoom.id, userId)
                  : undefined
              }
            />
          )}
        </div>
      </div>

      {showCreateGroupModal && (
        <CreateGroupChatModal
          isOpen={showCreateGroupModal}
          onClose={() => setShowCreateGroupModal(false)}
          currentUserId={String(user.id)}
          onCreateGroup={createGroupChat}
        />
      )}
      {showAddMembersModal && selectedRoom && selectedRoom.room_type === 'group' && (
        <AddMembersToGroupModal
          isOpen={showAddMembersModal}
          onClose={() => setShowAddMembersModal(false)}
          roomId={selectedRoom.id}
          roomName={selectedRoom.name || 'Group'}
          currentUserId={String(user.id)}
          currentParticipantIds={(selectedRoom.participants || []).map((p) => String(p.id))}
          onAdded={refreshSelectedRoomParticipants}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default Chat;

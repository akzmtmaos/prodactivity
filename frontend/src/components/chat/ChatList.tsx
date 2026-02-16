import React from 'react';
import { MessageCircle, Users } from 'lucide-react';
import { ChatRoom } from './types';
import { formatMessagePreview } from './utils';

interface ChatListProps {
  rooms: ChatRoom[];
  selectedRoom: ChatRoom | null;
  currentUserId: string;
  onRoomSelect: (room: ChatRoom) => void;
  emptyStateSubtext?: string;
}

const ChatList: React.FC<ChatListProps> = ({
  rooms,
  selectedRoom,
  currentUserId,
  onRoomSelect,
  emptyStateSubtext = 'Find friends from the search bar in the sidebar',
}) => {
  if (rooms.length === 0) {
    return (
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <MessageCircle className="mx-auto h-12 w-12 mb-2 opacity-50" />
          <p className="text-sm">No conversations yet</p>
          <p className="text-xs mt-1">{emptyStateSubtext}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {rooms.map((room) => {
        const otherParticipant = room.participants?.find(p => String(p.id) !== currentUserId);
        const displayName: string = room.room_type === 'direct' 
          ? (otherParticipant?.username || room.name || 'Unknown User')
          : (room.name || 'Group Chat');
        const avatarSrc = room.room_type === 'direct' ? otherParticipant?.avatar : room.avatar_url;
        
        return (
          <button
            key={room.id}
            onClick={() => onRoomSelect(room)}
            className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
              selectedRoom?.id === room.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={displayName}
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
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
                    {String(room.last_message.sender_id) === currentUserId ? 'You: ' : ''}
                    {formatMessagePreview(room.last_message.content)}
                    {room.unread_count != null && room.unread_count > 0 && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium ml-1">
                        ({room.unread_count})
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ChatList;


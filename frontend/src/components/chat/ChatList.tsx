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
    <div className="divide-y divide-gray-200 dark:divide-gray-700 px-1 py-0.5 min-w-0">
      {rooms.map((room) => {
        const otherParticipant = room.participants?.find(p => String(p.id) !== currentUserId);
        const displayName: string = room.room_type === 'direct'
          ? (otherParticipant?.username || room.name || 'Unknown User')
          : (room.name || 'Group Chat');
        const avatarSrc = room.room_type === 'direct' ? otherParticipant?.avatar : room.avatar_url;
        const hasLastMessage = !!room.last_message;

        return (
          <button
            key={room.id}
            onClick={() => onRoomSelect(room)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 min-h-[52px] text-left rounded-lg border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:border-gray-200 dark:hover:border-gray-700 transition-colors ${
              selectedRoom?.id === room.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : ''
            }`}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : room.room_type === 'direct' ? (
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              ) : (
                <Users className="text-indigo-600 dark:text-indigo-400" size={18} />
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                  {displayName}
                </h3>
                {hasLastMessage && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {new Date(room.last_message!.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {hasLastMessage ? (
                  <>
                    {String(room.last_message!.sender_id) === currentUserId ? 'You: ' : ''}
                    {formatMessagePreview(room.last_message!.content)}
                    {room.unread_count != null && room.unread_count > 0 && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium ml-1">
                        ({room.unread_count})
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">No messages yet</span>
                )}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ChatList;


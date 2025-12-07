import React from 'react';
import { Users, MoreVertical } from 'lucide-react';
import { ChatRoom } from './types';

interface ChatHeaderProps {
  room: ChatRoom;
  currentUserId: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ room, currentUserId }) => {
  const otherParticipant = room.participants?.find(p => String(p.id) !== currentUserId);
  const displayAvatar = room.room_type === 'direct' ? otherParticipant?.avatar : room.participants?.[0]?.avatar;
  
  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
      <div className="flex items-center gap-3">
        {displayAvatar ? (
          <img
            src={displayAvatar}
            alt={room.name || ''}
            className="w-10 h-10 rounded-full"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            {room.room_type === 'direct' ? (
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                {room.name?.charAt(0).toUpperCase()}
              </span>
            ) : (
              <Users className="text-indigo-600 dark:text-indigo-400" size={18} />
            )}
          </div>
        )}
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {room.name || 'Chat'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {room.room_type === 'direct' 
              ? 'Direct message' 
              : `${room.participants?.length || 0} participants`
            }
          </p>
        </div>
      </div>
      <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
        <MoreVertical className="text-gray-600 dark:text-gray-400" size={20} />
      </button>
    </div>
  );
};

export default ChatHeader;


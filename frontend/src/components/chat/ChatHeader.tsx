import React, { useState, useRef, useEffect } from 'react';
import { Users, MoreVertical, UserPlus } from 'lucide-react';
import { ChatRoom } from './types';

interface ChatHeaderProps {
  room: ChatRoom;
  currentUserId: string;
  onAddMembers?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ room, currentUserId, onAddMembers }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const otherParticipant = room.participants?.find(p => String(p.id) !== currentUserId);
  const displayAvatar =
    room.room_type === 'direct'
      ? otherParticipant?.avatar
      : (room.avatar_url || room.participants?.[0]?.avatar);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <div className="min-h-[78px] px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
      <div className="flex items-center gap-3">
        {displayAvatar ? (
          <img
            src={displayAvatar}
            alt={room.name || ''}
            className="w-9 h-9 rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
            {room.room_type === 'direct' ? (
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                {room.name?.charAt(0).toUpperCase()}
              </span>
            ) : (
              <Users className="text-indigo-600 dark:text-indigo-400" size={16} />
            )}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
            {room.name || 'Chat'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {room.room_type === 'direct'
              ? 'Direct message'
              : `${room.participants?.length || 0} participants`
            }
          </p>
        </div>
      </div>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          aria-expanded={menuOpen}
        >
          <MoreVertical className="text-gray-600 dark:text-gray-400" size={18} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 min-w-[160px] bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333333] rounded-lg shadow-lg z-50 py-1">
            {onAddMembers && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAddMembers();
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] flex items-center gap-2"
              >
                <UserPlus size={14} />
                Add members
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;


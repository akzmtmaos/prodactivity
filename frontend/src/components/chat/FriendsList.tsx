import React from 'react';
import { UserPlus, MessageCircle } from 'lucide-react';
import { getAvatarUrl } from './utils';

export interface FriendItem {
  id: number | string;
  username: string;
  avatar?: string | null;
  school?: string;
  course?: string;
  bio?: string;
}

interface FriendsListProps {
  friends: FriendItem[];
  onStartChat: (username: string) => void;
  emptyStateSubtext?: string;
}

const FriendsList: React.FC<FriendsListProps> = ({
  friends,
  onStartChat,
  emptyStateSubtext = 'Find friends from the navbar to follow, then they’ll appear here.',
}) => {
  if (friends.length === 0) {
    return (
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <UserPlus className="mx-auto h-12 w-12 mb-2 opacity-50" />
          <p className="text-sm">No friends yet</p>
          <p className="text-xs mt-1">{emptyStateSubtext}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700 px-1 py-0.5 min-w-0">
      {friends.map((friend) => {
        const avatarUrl = getAvatarUrl(friend.avatar);
        const displayName = friend.username || 'Unknown';
        return (
          <button
            key={String(friend.id)}
            type="button"
            onClick={() => onStartChat(friend.username)}
            className="w-full flex items-center gap-3 px-3 py-2.5 min-h-[52px] text-left rounded-lg border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:border-gray-200 dark:hover:border-gray-700 transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                {displayName}
              </h3>
              {(friend.school || friend.course) && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {[friend.school, friend.course].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <MessageCircle size={16} className="text-gray-400 dark:text-gray-500 shrink-0" />
          </button>
        );
      })}
    </div>
  );
};

export default FriendsList;

import React from 'react';
import { Users, User } from 'lucide-react';
import { User as UserType } from './types';

interface UserListProps {
  users: UserType[];
  isCreatingRoom: boolean;
  loading?: boolean;
  onStartChat: (user: UserType) => void;
  onViewProfile: (username: string) => void;
}

const UserList: React.FC<UserListProps> = ({
  users,
  isCreatingRoom,
  loading = false,
  onStartChat,
  onViewProfile,
}) => {

  if (loading) {
    return (
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <Users className="mx-auto h-12 w-12 mb-2 opacity-50" />
          <p className="text-sm">Search for users to find friends</p>
          <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">Type a username to search</p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {users.map((user) => (
        <div
          key={user.id}
          className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
        >
          <button
            onClick={() => onStartChat(user)}
            disabled={isCreatingRoom}
            className="flex-1 flex items-center gap-3 text-left min-w-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-lg">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                {user.username}
              </h3>
            </div>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(user.username);
            }}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
            title="View profile"
          >
            <User size={18} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default UserList;


import React from 'react';
import { Users } from 'lucide-react';
import { User } from './types';

interface UserListProps {
  users: User[];
  isCreatingRoom: boolean;
  onStartChat: (user: User) => void;
}

const UserList: React.FC<UserListProps> = ({
  users,
  isCreatingRoom,
  onStartChat,
}) => {
  if (users.length === 0) {
    return (
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <Users className="mx-auto h-12 w-12 mb-2 opacity-50" />
          <p className="text-sm">No users found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {users.map((user) => (
        <button
          key={user.id}
          onClick={() => onStartChat(user)}
          disabled={isCreatingRoom}
          className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.username}
              className="w-12 h-12 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-lg">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
              {user.username}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};

export default UserList;


import React from 'react';
import { MessageCircle, Search, Users } from 'lucide-react';
import ChatList from './ChatList';
import UserList from './UserList';
import { ChatRoom, User } from './types';

interface ChatSidebarProps {
  activeView: 'chats' | 'users';
  searchTerm: string;
  chatRooms: ChatRoom[];
  allUsers: User[];
  selectedRoom: ChatRoom | null;
  currentUserId: string;
  isCreatingRoom: boolean;
  onViewChange: (view: 'chats' | 'users') => void;
  onSearchChange: (term: string) => void;
  onRoomSelect: (room: ChatRoom) => void;
  onStartChat: (user: User) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  activeView,
  searchTerm,
  chatRooms,
  allUsers,
  selectedRoom,
  currentUserId,
  isCreatingRoom,
  onViewChange,
  onSearchChange,
  onRoomSelect,
  onStartChat,
}) => {
  return (
    <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            onViewChange('chats');
            onRoomSelect(null as any);
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
          onClick={() => onViewChange('users')}
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
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {activeView === 'chats' ? (
          <ChatList
            rooms={chatRooms}
            selectedRoom={selectedRoom}
            currentUserId={currentUserId}
            onRoomSelect={onRoomSelect}
          />
        ) : (
          <UserList
            users={allUsers}
            isCreatingRoom={isCreatingRoom}
            onStartChat={onStartChat}
          />
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;


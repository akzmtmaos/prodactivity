import React from 'react';
import { MessageCircle, Search, Users, Plus } from 'lucide-react';
import ChatList from './ChatList';
import { ChatRoom } from './types';

interface ChatSidebarProps {
  activeView: 'chats' | 'groups';
  searchTerm: string;
  filteredChatRooms: ChatRoom[];
  selectedRoom: ChatRoom | null;
  currentUserId: string;
  onViewChange: (view: 'chats' | 'groups') => void;
  onSearchChange: (term: string) => void;
  onRoomSelect: (room: ChatRoom | null) => void;
  onCreateGroupClick?: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  activeView,
  searchTerm,
  filteredChatRooms,
  selectedRoom,
  currentUserId,
  onViewChange,
  onSearchChange,
  onRoomSelect,
  onCreateGroupClick,
}) => {
  return (
    <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            onViewChange('chats');
            onRoomSelect(null);
          }}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeView === 'chats'
              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <MessageCircle className="inline-block mr-2" size={16} />
          Chat
        </button>
        <button
          onClick={() => onViewChange('groups')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeView === 'groups'
              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Users className="inline-block mr-2" size={16} />
          Groups
        </button>
      </div>

      {/* Search + New group (when Groups tab) */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder={activeView === 'chats' ? 'Search chats...' : 'Search groups...'}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        {activeView === 'groups' && onCreateGroupClick && (
          <button
            type="button"
            onClick={onCreateGroupClick}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-transparent hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          >
            <Plus size={16} />
            New group
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <ChatList
          rooms={filteredChatRooms}
          selectedRoom={selectedRoom}
          currentUserId={currentUserId}
          onRoomSelect={onRoomSelect}
          emptyStateSubtext={activeView === 'groups' ? 'No group chats yet' : 'Find friends from the search bar in the sidebar'}
        />
      </div>
    </div>
  );
};

export default ChatSidebar;


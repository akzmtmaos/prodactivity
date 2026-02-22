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
      {/* Tabs – compact (same as Decks/Reviewer) */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            onViewChange('chats');
            onRoomSelect(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeView === 'chats'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
          }`}
        >
          <MessageCircle size={14} />
          Chats
        </button>
        <button
          onClick={() => onViewChange('groups')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeView === 'groups'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
          }`}
        >
          <Users size={14} />
          Group
        </button>
      </div>

      {/* Search + New group – compact (h-7, text-xs like refined modals) */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder={activeView === 'chats' ? 'Search chats...' : 'Search groups...'}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-7 pl-8 pr-2.5 text-xs border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-500"
          />
        </div>
        {activeView === 'groups' && onCreateGroupClick && (
          <button
            type="button"
            onClick={onCreateGroupClick}
            className="w-full flex items-center justify-center gap-1.5 h-7 px-3 text-xs font-medium rounded-lg border border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-transparent hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          >
            <Plus size={14} />
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


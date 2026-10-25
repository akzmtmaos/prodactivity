import React from 'react';
import { MessageCircle, Search, Users, Plus } from 'lucide-react';
import ChatList from './ChatList';
import TabBar from '../common/TabBar';
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
  loading?: boolean;
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
  loading = false,
}) => {
  const placeholder = activeView === 'chats' ? 'Search chats...' : 'Search groups...';

  return (
    <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Tabs – compact pills, same as the rest of the app */}
      <div className="border-b border-gray-200 px-2 py-1.5 dark:border-gray-700">
        <TabBar
          bare
          ariaLabel="Chat views"
          value={activeView}
          onChange={(view) => {
            onViewChange(view);
            onRoomSelect(null);
          }}
          tabClassName="flex-1 justify-center"
          items={[
            { id: 'chats', label: 'Chats', icon: <MessageCircle size={14} /> },
            { id: 'groups', label: 'Groups', icon: <Users size={14} /> },
          ]}
        />
      </div>

      {/* Search + New group – compact */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder={placeholder}
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
        <ChatList
          rooms={filteredChatRooms}
          selectedRoom={selectedRoom}
          currentUserId={currentUserId}
          onRoomSelect={onRoomSelect}
          emptyStateSubtext={activeView === 'groups' ? 'No group chats yet' : 'No chats yet'}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default ChatSidebar;

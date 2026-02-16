import React from 'react';
import { MessageCircle } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { Message, ChatRoom } from './types';

interface MessagesListProps {
  messages: Message[];
  currentUserId: string;
  selectedRoom: ChatRoom | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
}

const MessagesList: React.FC<MessagesListProps> = ({
  messages,
  currentUserId,
  selectedRoom,
  messagesEndRef,
  messagesContainerRef,
}) => {
  if (messages.length === 0) {
    return (
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4 relative"
      >
        <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <MessageCircle className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Start the conversation!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4 relative"
    >
      {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showAvatar = !prevMessage || String(prevMessage.sender_id) !== String(message.sender_id);
        const messageDate = new Date(message.created_at);
        const prevMessageDate = prevMessage ? new Date(prevMessage.created_at) : null;
        const showDateSeparator = !prevMessageDate || 
          messageDate.toDateString() !== prevMessageDate.toDateString();

        return (
          <MessageBubble
            key={message.id}
            message={message}
            prevMessage={prevMessage}
            currentUserId={currentUserId}
            selectedRoom={selectedRoom}
            showAvatar={showAvatar}
            showDateSeparator={showDateSeparator}
          />
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessagesList;


import React, { useState } from 'react';

interface MessageAvatarProps {
  avatar: string | null | undefined;
  username?: string;
}

/**
 * Avatar component that handles image loading and fallback
 * Ensures both image and default avatar use identical structure for perfect alignment
 */
const MessageAvatar: React.FC<MessageAvatarProps> = ({ avatar, username }) => {
  const [imageError, setImageError] = useState(false);
  const shouldShowDefault = !avatar || imageError;
  
  return (
    <div className="flex-shrink-0">
      <div className="w-8 h-8 rounded-full overflow-hidden">
        {shouldShowDefault ? (
          <div className="w-full h-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm leading-none">
              {username?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
        ) : (
          <img
            src={avatar}
            alt={username || ''}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>
    </div>
  );
};

export default MessageAvatar;


import React, { useState } from 'react';
import { getAvatarUrl } from '../chat/utils';

interface LevelProfileCardProps {
  userLevel: {
    currentLevel: number;
    currentXP: number;
    xpToNextLevel: number;
  };
  username?: string;
  avatar?: string | null;
}

const LevelProfileCard: React.FC<LevelProfileCardProps> = ({
  userLevel,
  username = 'User',
  avatar
}) => {
  const [imageError, setImageError] = useState(false);
  const avatarUrl = avatar ? getAvatarUrl(avatar) : null;
  const progressPercentage = Math.min(
    (userLevel.currentXP / userLevel.xpToNextLevel) || 0,
    1
  ) * 100;

  return (
    <div className="w-full mb-6">
      <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333333] rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-shrink-0 relative">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 dark:border-[#333333]">
              {avatarUrl && !imageError ? (
                <img
                  src={avatarUrl}
                  alt={username}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-indigo-500 dark:bg-indigo-600 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-indigo-600 dark:bg-indigo-500 rounded-full border-2 border-white dark:border-[#252525] flex items-center justify-center">
              <span className="text-xs font-bold text-white">{userLevel.currentLevel}</span>
            </div>
          </div>
          <div className="flex-1 w-full min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {username}
              </span>
              <span className="text-sm text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                {userLevel.currentXP} / {userLevel.xpToNextLevel} XP
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 dark:bg-[#1e1e1e] rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Level {userLevel.currentLevel} • {Math.max(0, userLevel.xpToNextLevel - userLevel.currentXP)} XP to Level {userLevel.currentLevel + 1}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelProfileCard;

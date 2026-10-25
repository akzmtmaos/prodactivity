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
  const xpRemaining = Math.max(0, userLevel.xpToNextLevel - userLevel.currentXP);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-3.5 py-3 dark:border-[#2f2f2f] dark:bg-[#1e1e1e] sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className="h-10 w-10 overflow-hidden rounded-full border border-gray-200 dark:border-[#333333]">
            {avatarUrl && !imageError ? (
              <img
                src={avatarUrl}
                alt={username}
                className="h-full w-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-indigo-500 dark:bg-indigo-600">
                <span className="text-sm font-semibold text-white">
                  {username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-indigo-600 px-1 text-[10px] font-semibold tabular-nums text-white dark:border-[#1e1e1e] dark:bg-indigo-500">
            {userLevel.currentLevel}
          </span>
        </div>
        <div className="min-w-0 sm:hidden">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{username}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Level {userLevel.currentLevel}</p>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
          <span className="hidden truncate text-sm font-semibold text-gray-900 dark:text-white sm:inline">
            {username}
          </span>
          <span className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
            {userLevel.currentXP} / {userLevel.xpToNextLevel} XP
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-[#262626]">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-300 dark:bg-indigo-400"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          Level {userLevel.currentLevel} · {xpRemaining} XP to Level {userLevel.currentLevel + 1}
        </p>
      </div>
    </div>
  );
};

export default LevelProfileCard;

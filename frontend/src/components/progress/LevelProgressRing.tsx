import React from 'react';

interface LevelProgressRingProps {
  currentLevel: number;
  currentXP: number;
  xpToNextLevel: number;
  size?: number;
}

const LevelProgressRing: React.FC<LevelProgressRingProps> = ({ currentLevel, currentXP, xpToNextLevel, size = 128 }) => {
  const RADIUS = (size / 2) - 12;
  const STROKE = 12;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const progress = Math.min(currentXP / xpToNextLevel, 1);
  const offset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className="relative flex items-center justify-center drop-shadow-lg" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute top-0 left-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={RADIUS}
          stroke="#e5e7eb"
          strokeWidth={STROKE}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={RADIUS}
          stroke="#6366f1"
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="flex flex-col items-center justify-center z-10" style={{ width: size, height: size }}>
        <span className="text-4xl font-bold text-indigo-700 dark:text-indigo-300 drop-shadow" style={{ lineHeight: 1 }}>{currentLevel}</span>
        <span className="text-sm text-gray-500 dark:text-gray-300">Level</span>
        <span className="text-xs text-gray-700 dark:text-gray-200 mt-1">{currentXP} / {xpToNextLevel} XP</span>
      </div>
    </div>
  );
};

export default LevelProgressRing; 
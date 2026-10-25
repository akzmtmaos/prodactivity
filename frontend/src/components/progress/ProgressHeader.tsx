import React from 'react';

interface ProgressHeaderProps {
  greeting?: string;
  username?: string;
}

const ProgressHeader: React.FC<ProgressHeaderProps> = () => {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
        Progress
      </h1>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Your streak, focus time and milestones in one place.
      </p>
    </div>
  );
};

export default ProgressHeader;

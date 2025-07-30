import React from 'react';

interface ProgressHeaderProps {
  greeting: string;
  username: string;
}

const ProgressHeader: React.FC<ProgressHeaderProps> = ({ greeting, username }) => {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        Progress
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
        Track your productivity and achievements
      </p>
    </div>
  );
};

export default ProgressHeader; 
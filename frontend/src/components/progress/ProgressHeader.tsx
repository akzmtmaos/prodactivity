import React from 'react';
import HelpButton from '../HelpButton';

interface ProgressHeaderProps {
  greeting: string;
  username: string;
}

const ProgressHeader: React.FC<ProgressHeaderProps> = ({ greeting, username }) => {
  const progressHelpContent = (
    <div>
      <p className="font-semibold mb-2">Progress Tracking</p>
      <ul className="space-y-1 text-xs">
        <li>• <strong>Daily View:</strong> See your productivity for each day of the month</li>
        <li>• <strong>Weekly View:</strong> View aggregated weekly productivity data</li>
        <li>• <strong>Monthly View:</strong> See monthly productivity summaries</li>
        <li>• <strong>XP System:</strong> Earn experience points by completing tasks</li>
        <li>• <strong>Streaks:</strong> Track consecutive days of productivity</li>
        <li>• <strong>Productivity Status:</strong> Highly Productive (80%+), Productive (60%+), Moderately Productive (40%+), Low Productive (&lt;40%)</li>
      </ul>
    </div>
  );

  return (
    <div className="mb-4">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
        Progress
        <HelpButton content={progressHelpContent} title="Progress Help" />
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
        Track your productivity and achievements
      </p>
    </div>
  );
};

export default ProgressHeader; 
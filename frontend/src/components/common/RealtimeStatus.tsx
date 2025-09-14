import React from 'react';
import { useRealtime } from '../../context/RealtimeContext';

const RealtimeStatus: React.FC = () => {
  const { isConnected, connectionError } = useRealtime();

  if (connectionError) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-full text-sm">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        <span>Offline</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Live</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-full text-sm">
      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
      <span>Connecting...</span>
    </div>
  );
};

export default RealtimeStatus;

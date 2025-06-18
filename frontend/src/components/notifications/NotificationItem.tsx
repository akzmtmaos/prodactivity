import React from 'react';
import { formatDistanceToNow } from 'date-fns';

export interface NotificationItemProps {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  isRead: boolean;
  onMarkAsRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  id,
  title,
  message,
  type,
  timestamp,
  isRead,
  onMarkAsRead,
}) => {
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      default:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
    }
  };

  return (
    <div
      className={`p-4 border rounded-lg ${getTypeStyles()} ${
        !isRead ? 'border-l-4' : ''
      } transition-all duration-200 hover:shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{message}</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {formatDistanceToNow(timestamp, { addSuffix: true })}
          </p>
        </div>
        {!isRead && (
          <button
            onClick={() => onMarkAsRead(id)}
            className="ml-4 text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Mark as read
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationItem; 
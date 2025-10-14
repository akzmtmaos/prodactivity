import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export interface NotificationItemProps {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  isRead: boolean;
  notificationType: 'task_due' | 'task_completed' | 'note_reminder' | 'study_reminder' | 'schedule_reminder' | 'general';
  onMarkAsRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  id,
  title,
  message,
  type,
  timestamp,
  isRead,
  notificationType,
  onMarkAsRead,
}) => {
  const navigate = useNavigate();

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

  const handleClick = () => {
    // Mark as read when clicked
    if (!isRead) {
      onMarkAsRead(id);
    }

    // Navigate based on notification type
    switch (notificationType) {
      case 'schedule_reminder':
        navigate('/schedule');
        break;
      case 'task_due':
      case 'task_completed':
        navigate('/tasks');
        break;
      case 'note_reminder':
        navigate('/notes');
        break;
      case 'study_reminder':
        navigate('/study-timer');
        break;
      default:
        // No navigation for general notifications
        break;
    }
  };

  const getNavigationHint = () => {
    switch (notificationType) {
      case 'schedule_reminder':
        return '→ Go to Schedule';
      case 'task_due':
      case 'task_completed':
        return '→ Go to Tasks';
      case 'note_reminder':
        return '→ Go to Notes';
      case 'study_reminder':
        return '→ Go to Study Timer';
      default:
        return null;
    }
  };

  const navigationHint = getNavigationHint();

  return (
    <div
      onClick={handleClick}
      className={`p-4 border rounded-lg ${getTypeStyles()} ${
        !isRead ? 'border-l-4' : ''
      } transition-all duration-200 hover:shadow-md ${
        navigationHint ? 'cursor-pointer hover:scale-[1.01]' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{message}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(timestamp, { addSuffix: true })}
            </p>
            {navigationHint && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                {navigationHint}
              </p>
            )}
          </div>
        </div>
        {!isRead && (
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent navigation when clicking mark as read
              onMarkAsRead(id);
            }}
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
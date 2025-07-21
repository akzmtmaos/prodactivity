import React from 'react';
import { Bell } from 'lucide-react';

interface NotificationBadgeProps {
  count: number;
  onClick?: () => void;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ count, onClick }) => (
  <button
    onClick={onClick}
    className="relative inline-flex items-center justify-center"
    aria-label="Notifications"
  >
    <Bell className="h-6 w-6 text-gray-600 dark:text-gray-300" />
    {count > 0 && (
      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
        <span className="text-xs font-medium text-white">
          {count > 99 ? '99+' : count}
        </span>
      </span>
    )}
  </button>
);

export default NotificationBadge; 
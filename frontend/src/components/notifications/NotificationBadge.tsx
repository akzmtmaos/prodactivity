import React from 'react';

interface NotificationBadgeProps {
  count: number;
  onClick?: () => void;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ count, onClick }) => {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="relative inline-flex items-center justify-center"
    >
      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
        <span className="text-xs font-medium text-white">
          {count > 99 ? '99+' : count}
        </span>
      </span>
      <svg
        className="h-6 w-6 text-gray-600 dark:text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    </button>
  );
};

export default NotificationBadge; 
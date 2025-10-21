import React, { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import NotificationList, { Notification } from '../components/notifications/NotificationList';
import { useNotificationsContext } from '../context/NotificationsContext';
import { Bell, BellRing, User, Clock } from 'lucide-react';

const Notifications = ({ decrementUnreadCount }: { decrementUnreadCount?: () => void }) => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead 
  } = useNotificationsContext();


  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    if (decrementUnreadCount) decrementUnreadCount();
  };

  const handleClearAll = async () => {
    await markAllAsRead();
    if (decrementUnreadCount) {
      for (let i = 0; i < unreadCount; i++) {
        decrementUnreadCount();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Notifications
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage your notifications
          </p>
          {unreadCount > 0 && (
            <p className="mt-2 text-sm text-indigo-600 dark:text-indigo-400">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6">
            <NotificationList
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onClearAll={handleClearAll}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Notifications;

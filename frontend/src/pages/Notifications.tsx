import React, { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import NotificationList, { Notification } from '../components/notifications/NotificationList';
import { useNotificationsContext } from '../context/NotificationsContext';

const Notifications = ({ decrementUnreadCount }: { decrementUnreadCount?: () => void }) => {
  const [user, setUser] = useState<any | null>(null);
  const [greeting, setGreeting] = useState('');
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead 
  } = useNotificationsContext();

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser && parsedUser.username) {
          setUser(parsedUser);
        } else {
          setUser({ username: 'User' });
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
        setUser({ username: 'User' });
      }
    } else {
      setUser({ username: 'User' });
    }

    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);


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

  if (!user || loading) {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Notifications
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {greeting}, {user.username}! View and manage your notifications
          </p>
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

import React, { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import NotificationList, { Notification } from '../components/notifications/NotificationList';

const Notifications = () => {
  const [user, setUser] = useState<any | null>(null);
  const [greeting, setGreeting] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Welcome to ProdActivity!',
      message: 'Get started by creating your first task or project.',
      type: 'info',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      isRead: false,
    },
    {
      id: '2',
      title: 'Task Completed',
      message: 'Your task "Setup project structure" has been completed.',
      type: 'success',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      isRead: true,
    },
    {
      id: '3',
      title: 'Upcoming Deadline',
      message: 'You have a task due tomorrow: "Review project documentation"',
      type: 'warning',
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      isRead: false,
    },
  ]);

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

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  // Show loading state while waiting for user data
  if (!user) {
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

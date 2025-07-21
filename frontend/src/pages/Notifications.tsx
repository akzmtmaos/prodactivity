import React, { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import NotificationList, { Notification } from '../components/notifications/NotificationList';

const Notifications = ({ decrementUnreadCount }: { decrementUnreadCount?: () => void }) => {
  const [user, setUser] = useState<any | null>(null);
  const [greeting, setGreeting] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to get auth token (adjust if you use a different storage method)
  const getToken = () => localStorage.getItem('accessToken');

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

  useEffect(() => {
    // Fetch notifications from backend
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/notifications/', {
          headers: {
            'Authorization': `Bearer ${getToken()}`,
          },
        });
        if (!res.ok) throw new Error('Failed to fetch notifications');
        const data = await res.json();
        // Map backend fields to frontend Notification type
        const mapped: Notification[] = data.map((n: any) => ({
          id: String(n.id),
          title: n.type === 'task_due' ? 'Task Due Soon' : n.type === 'task_overdue' ? 'Task Overdue' : n.type === 'event_upcoming' ? 'Event Upcoming' : 'Notification',
          message: n.message,
          type: n.type === 'task_due' ? 'warning' : n.type === 'task_overdue' ? 'error' : n.type === 'event_upcoming' ? 'info' : 'info',
          timestamp: new Date(n.created_at),
          isRead: n.is_read,
        }));
        setNotifications(mapped);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, isRead: true }
            : notification
        )
      );
      if (decrementUnreadCount) decrementUnreadCount();
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const handleClearAll = async () => {
    // Mark all as read (no bulk endpoint, so do one by one)
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(unread.map((n) => handleMarkAsRead(n.id)));
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (decrementUnreadCount) {
      for (let i = 0; i < unread.length; i++) {
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

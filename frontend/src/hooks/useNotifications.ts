import { useState, useEffect, useCallback } from 'react';
import { notificationsService, NotificationWithType } from '../services/notificationsService';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationWithType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationsService.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationsService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationsService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      // Update unread count if the deleted notification was unread
      const deletedNotification = notifications.find(n => n.id === notificationId);
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  // Set up real-time subscription
  useEffect(() => {
    const setupSubscription = () => {
      const sub = notificationsService.subscribeToNotifications(
        // New notification
        (notification: NotificationWithType) => {
          setNotifications(prev => [notification, ...prev]);
          if (!notification.isRead) {
            setUnreadCount(prev => prev + 1);
          }
          console.log('🔔 New notification received:', notification);
        },
        // Updated notification
        (notification: NotificationWithType) => {
          setNotifications(prev => {
            const updated = prev.map(n => n.id === notification.id ? notification : n);
            return updated;
          });
          
          // Update unread count based on read status change
          const oldNotification = notifications.find(n => n.id === notification.id);
          if (oldNotification) {
            if (!oldNotification.isRead && notification.isRead) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            } else if (oldNotification.isRead && !notification.isRead) {
              setUnreadCount(prev => prev + 1);
            }
          }
          
          console.log('📝 Notification updated:', notification);
        },
        // Deleted notification
        (notificationId: string) => {
          const deletedNotification = notifications.find(n => n.id === notificationId);
          setNotifications(prev => prev.filter(n => n.id !== notificationId));
          
          // Update unread count if the deleted notification was unread
          if (deletedNotification && !deletedNotification.isRead) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
          
          console.log('🗑️ Notification deleted:', notificationId);
        }
      );
      setSubscription(sub);
    };

    setupSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        notificationsService.unsubscribe(subscription);
      }
    };
  }, [notifications]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};

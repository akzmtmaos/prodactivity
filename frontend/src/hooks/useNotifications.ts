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
      console.log('🔵 [markAsRead] Starting for notification:', notificationId);
      
      // Optimistic update - update UI immediately
      setNotifications(prev => {
        const updated = prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n);
        console.log('🔵 [markAsRead] Updated notifications locally');
        return updated;
      });
      
      setUnreadCount(prev => {
        const newCount = Math.max(0, prev - 1);
        console.log('🔵 [markAsRead] Unread count: ', prev, '->', newCount);
        return newCount;
      });
      
      // Then update in database
      await notificationsService.markAsRead(notificationId);
      console.log('✅ [markAsRead] Database update complete');
    } catch (error) {
      console.error('❌ [markAsRead] Error:', error);
      // Revert optimistic update on error
      await fetchNotifications();
    }
  }, [fetchNotifications]); // Removed unreadCount dependency

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      
      // Then update in database
      await notificationsService.markAllAsRead();
      console.log('✅ All notifications marked as read');
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      // Revert optimistic update on error
      await fetchNotifications();
    }
  }, [fetchNotifications]);

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
        console.log('📝 Realtime: Notification updated from Supabase:', notification);
        
        setNotifications(prev => {
          const oldNotification = prev.find(n => n.id === notification.id);
          
          console.log('📝 Old notification:', oldNotification);
          console.log('📝 New notification:', notification);
          
          // Update unread count based on read status change
          if (oldNotification) {
            if (!oldNotification.isRead && notification.isRead) {
              console.log('📝 Decreasing unread count (realtime update)');
              setUnreadCount(count => Math.max(0, count - 1));
            } else if (oldNotification.isRead && !notification.isRead) {
              console.log('📝 Increasing unread count (realtime update)');
              setUnreadCount(count => count + 1);
            }
          }
          
          // Update the notification in the list
          const updated = prev.map(n => n.id === notification.id ? notification : n);
          console.log('📝 Updated notifications array');
          return updated;
        });
      },
      // Deleted notification
      (notificationId: string) => {
        setNotifications(prev => {
          const deletedNotification = prev.find(n => n.id === notificationId);
          
          // Update unread count if the deleted notification was unread
          if (deletedNotification && !deletedNotification.isRead) {
            setUnreadCount(count => Math.max(0, count - 1));
          }
          
          return prev.filter(n => n.id !== notificationId);
        });
        
        console.log('🗑️ Notification deleted:', notificationId);
      }
    );
    
    setSubscription(sub);

    // Cleanup subscription on unmount
    return () => {
      if (sub) {
        notificationsService.unsubscribe(sub);
      }
    };
  }, []); // Empty dependency array - only set up once

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

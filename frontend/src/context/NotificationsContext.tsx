import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { notificationsService, NotificationWithType } from '../services/notificationsService';

interface NotificationsContextType {
  notifications: NotificationWithType[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
      const count = data.filter(n => !n.isRead).length;
      setUnreadCount(count);
      console.log('📥 [NotificationsContext] Fetched notifications, unread:', count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      console.log('🔵 [NotificationsContext] markAsRead called for:', notificationId);
      
      // Optimistic update
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      
      setUnreadCount(prev => {
        const newCount = Math.max(0, prev - 1);
        console.log('🔵 [NotificationsContext] Unread count:', prev, '->', newCount);
        return newCount;
      });
      
      // Update in database
      await notificationsService.markAsRead(notificationId);
      console.log('✅ [NotificationsContext] Database updated');
    } catch (error) {
      console.error('❌ [NotificationsContext] Error:', error);
      await fetchNotifications();
    }
  }, [fetchNotifications]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await notificationsService.markAllAsRead();
      console.log('✅ [NotificationsContext] All marked as read');
    } catch (error) {
      console.error('❌ [NotificationsContext] Error:', error);
      await fetchNotifications();
    }
  }, [fetchNotifications]);

  // Set up real-time subscription
  useEffect(() => {
    const sub = notificationsService.subscribeToNotifications(
      // New notification
      (notification: NotificationWithType) => {
        setNotifications(prev => [notification, ...prev]);
        if (!notification.isRead) {
          setUnreadCount(prev => prev + 1);
        }
        console.log('🔔 [NotificationsContext] New notification received');
      },
      // Updated notification
      (notification: NotificationWithType) => {
        console.log('📝 [NotificationsContext] Notification updated from Supabase');
        
        setNotifications(prev => {
          const oldNotification = prev.find(n => n.id === notification.id);
          
          if (oldNotification) {
            if (!oldNotification.isRead && notification.isRead) {
              setUnreadCount(count => Math.max(0, count - 1));
              console.log('📝 [NotificationsContext] Decreasing unread count');
            } else if (oldNotification.isRead && !notification.isRead) {
              setUnreadCount(count => count + 1);
            }
          }
          
          return prev.map(n => n.id === notification.id ? notification : n);
        });
      },
      // Deleted notification
      (notificationId: string) => {
        setNotifications(prev => {
          const deleted = prev.find(n => n.id === notificationId);
          if (deleted && !deleted.isRead) {
            setUnreadCount(count => Math.max(0, count - 1));
          }
          return prev.filter(n => n.id !== notificationId);
        });
      }
    );
    
    setSubscription(sub);

    return () => {
      if (sub) {
        notificationsService.unsubscribe(sub);
      }
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Log when unread count changes
  useEffect(() => {
    console.log('🔔 [NotificationsContext] Unread count changed to:', unreadCount);
  }, [unreadCount]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotificationsContext = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotificationsContext must be used within a NotificationsProvider');
  }
  return context;
};


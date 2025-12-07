import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';

type Notification = Database['public']['Tables']['notifications']['Row'];
type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

export interface NotificationWithType {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'error' | 'info' | 'success';
  timestamp: Date;
  isRead: boolean;
  notificationType: 'task_due' | 'task_completed' | 'note_reminder' | 'study_reminder' | 'schedule_reminder' | 'general';
}

class NotificationsService {
  /**
   * Get current user ID from localStorage
   */
  private getCurrentUserId(): number | null {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        return parsedUser.id || null;
      } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
      }
    }
    return null;
  }

  /**
   * Fetch all notifications for the current user
   */
  async getNotifications(): Promise<NotificationWithType[]> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }

    // Map Supabase data to frontend format
    return data.map((notification: Notification) => ({
      id: String(notification.id),
      title: this.getNotificationTitle(notification.notification_type),
      message: notification.message,
      type: this.getNotificationType(notification.notification_type),
      timestamp: new Date(notification.created_at),
      isRead: notification.is_read,
      notificationType: notification.notification_type,
    }));
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for the current user
   */
  async markAllAsRead(): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(): Promise<number> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return 0;
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Create a new notification (for admin/system use)
   * This now uses Django API to ensure email notifications are sent
   */
  async createNotification(notification: NotificationInsert): Promise<Notification> {
    try {
      // Use Django API endpoint to create notification
      // This will automatically:
      // 1. Save to Django database
      // 2. Sync to Supabase (via Django signal)
      // 3. Send email notification (via Django signal)
      const { getApiBaseUrl } = require('../config/api');
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${apiBaseUrl}/notifications/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          title: notification.title,
          message: notification.message,
          notification_type: notification.notification_type || 'general',
          is_read: notification.is_read || false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to create notification' }));
        console.error('Error creating notification via API:', errorData);
        throw new Error(errorData.detail || 'Failed to create notification');
      }

      const data = await response.json();
      console.log('✅ Notification created successfully via Django API:', data);
      return data;
    } catch (error: any) {
      console.error('Error creating notification:', error);
      // Fallback to direct Supabase insert if API fails (for backward compatibility)
      console.warn('⚠️ Falling back to direct Supabase insert (email may not be sent)');
      const { data, error: supabaseError } = await supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();

      if (supabaseError) {
        console.error('Supabase fallback also failed:', supabaseError);
        throw supabaseError;
      }

      return data;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time notifications for the current user
   */
  subscribeToNotifications(
    onNotification: (notification: NotificationWithType) => void,
    onUpdate: (notification: NotificationWithType) => void,
    onDelete: (notificationId: string) => void
  ) {
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.warn('User not authenticated, cannot subscribe to notifications');
      return null;
    }

    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          onNotification({
            id: String(notification.id),
            title: this.getNotificationTitle(notification.notification_type),
            message: notification.message,
            type: this.getNotificationType(notification.notification_type),
            timestamp: new Date(notification.created_at),
            isRead: notification.is_read,
            notificationType: notification.notification_type,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          onUpdate({
            id: String(notification.id),
            title: this.getNotificationTitle(notification.notification_type),
            message: notification.message,
            type: this.getNotificationType(notification.notification_type),
            timestamp: new Date(notification.created_at),
            isRead: notification.is_read,
            notificationType: notification.notification_type,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onDelete(String(payload.old.id));
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Unsubscribe from notifications
   */
  unsubscribe(subscription: any) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  }

  /**
   * Helper: Get notification title based on type
   */
  private getNotificationTitle(type: string): string {
    switch (type) {
      case 'task_due':
        return 'Task Due Soon';
      case 'task_completed':
        return 'Task Completed';
      case 'note_reminder':
        return 'Note Reminder';
      case 'study_reminder':
        return 'Study Reminder';
      case 'schedule_reminder':
        return 'Schedule Reminder';
      case 'general':
      default:
        return 'Notification';
    }
  }

  /**
   * Helper: Get notification type for UI styling
   */
  private getNotificationType(type: string): 'warning' | 'error' | 'info' | 'success' {
    switch (type) {
      case 'task_due':
        return 'warning';
      case 'task_completed':
        return 'success';
      case 'note_reminder':
      case 'study_reminder':
        return 'info';
      case 'general':
      default:
        return 'info';
    }
  }
}

export const notificationsService = new NotificationsService();

import { supabase } from '../lib/supabase';
import { notificationsService } from './notificationsService';

class ScheduleNotificationService {
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
   * Check for upcoming events and create notifications
   * Call this when the Schedule page loads or periodically
   */
  async checkUpcomingEvents(): Promise<void> {
    console.log('🔍 [ScheduleNotification] checkUpcomingEvents called');
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.log('⚠️ [ScheduleNotification] No user ID, skipping check');
      return;
    }

    console.log('👤 [ScheduleNotification] Checking for user:', userId);

    try {
      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Fetch upcoming events within the next 24 hours
      const { data: upcomingEvents, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', now.toISOString())
        .lte('start_time', oneDayFromNow.toISOString())
        .order('start_time', { ascending: true });

      if (eventsError) {
        console.error('Error fetching upcoming events:', eventsError);
        return;
      }

      if (!upcomingEvents || upcomingEvents.length === 0) {
        return;
      }

      // Check existing notifications to avoid duplicates
      // Check by event title + timeframe to avoid creating duplicates
      // IMPORTANT: Check ALL notifications (read AND unread) to prevent duplicates
      const { data: existingNotifications, error: notifError } = await supabase
        .from('notifications')
        .select('title, message, created_at, is_read')
        .eq('user_id', userId)
        .eq('notification_type', 'schedule_reminder');

      if (notifError) {
        console.error('Error fetching existing notifications:', notifError);
        return;
      }

      // Create a set of event titles that already have recent notifications (within last hour)
      const recentNotifiedEvents = new Set(
        (existingNotifications || [])
          .filter(n => {
            const notifAge = now.getTime() - new Date(n.created_at).getTime();
            const ageMinutes = Math.round(notifAge / (1000 * 60));
            console.log(`📋 Existing notification: "${n.title}" - Age: ${ageMinutes} minutes, isRead: ${n.is_read}`);
            return notifAge < 60 * 60 * 1000; // Created within last hour
          })
          .map(n => n.title)
      );

      console.log(`📋 Recent notified events (skip list):`, Array.from(recentNotifiedEvents));

      // Create notifications for events
      for (const event of upcomingEvents) {
        console.log(`🔍 Checking event: "${event.title}"`);
        
        // Skip if we already notified about this event recently
        if (recentNotifiedEvents.has(event.title)) {
          console.log(`⏭️ Skipping duplicate notification for: ${event.title}`);
          continue;
        }
        
        console.log(`✅ Event "${event.title}" not in skip list, checking if should notify...`);

        const eventStartTime = new Date(event.start_time);
        const timeDiff = eventStartTime.getTime() - now.getTime();
        const hoursUntil = Math.round(timeDiff / (1000 * 60 * 60));
        const minutesUntil = Math.round(timeDiff / (1000 * 60));

        let message = '';
        let shouldNotify = false;

        // Notify for events starting in 1 hour or less
        if (timeDiff <= 60 * 60 * 1000 && timeDiff > 0) {
          if (minutesUntil <= 60) {
            message = `"${event.title}" starts in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}`;
            shouldNotify = true;
          }
        }
        // Notify for events starting in 3 hours
        else if (hoursUntil === 3) {
          message = `"${event.title}" starts in 3 hours`;
          shouldNotify = true;
        }
        // Notify for events starting tomorrow
        else if (hoursUntil >= 20 && hoursUntil <= 28) {
          message = `Tomorrow: "${event.title}" at ${eventStartTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
          shouldNotify = true;
        }

        // Create notification if needed
        if (shouldNotify) {
          await notificationsService.createNotification({
            user_id: userId,
            title: event.title,
            message: message,
            notification_type: 'schedule_reminder',
            is_read: false,
          });
          console.log(`📅 Created schedule notification: ${message}`);
          
          // Add to the set to prevent creating another one in this run
          recentNotifiedEvents.add(event.title);
        }
      }
    } catch (error) {
      console.error('Error checking upcoming events:', error);
    }
  }

  /**
   * Create notification for a specific event
   */
  async createEventNotification(eventId: number, message: string): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error || !event) {
        console.error('Error fetching event:', error);
        return;
      }

      await notificationsService.createNotification({
        user_id: userId,
        title: event.title,
        message: message,
        notification_type: 'schedule_reminder',
        is_read: false,
      });
    } catch (error) {
      console.error('Error creating event notification:', error);
    }
  }

  /**
   * Start periodic check for upcoming events (every 15 minutes)
   */
  startPeriodicCheck(): NodeJS.Timeout {
    console.log('🚀 [ScheduleNotification] Starting periodic check');
    
    // Check immediately
    this.checkUpcomingEvents();

    // Then check every 15 minutes
    const intervalId = setInterval(() => {
      console.log('⏰ [ScheduleNotification] Periodic check triggered (15 min interval)');
      this.checkUpcomingEvents();
    }, 15 * 60 * 1000); // 15 minutes
    
    console.log('✅ [ScheduleNotification] Interval ID:', intervalId);
    return intervalId;
  }

  /**
   * Stop periodic check
   */
  stopPeriodicCheck(intervalId: NodeJS.Timeout): void {
    console.log('🛑 [ScheduleNotification] Stopping periodic check, Interval ID:', intervalId);
    clearInterval(intervalId);
  }
}

export const scheduleNotificationService = new ScheduleNotificationService();


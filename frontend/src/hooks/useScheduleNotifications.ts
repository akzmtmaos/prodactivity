import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ScheduleToast {
  id: string;
  message: string;
  type: 'info' | 'warning';
}

/**
 * Hook to listen for new schedule notifications and show toasts
 */
export const useScheduleNotifications = () => {
  const [toast, setToast] = useState<ScheduleToast | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) return;

    const user = JSON.parse(userData);
    const userId = user.id;

    if (!userId) return;

    // Subscribe to new schedule notifications
    const subscription = supabase
      .channel('schedule_notifications_toast')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as any;
          
          // Only show toast for schedule reminders
          if (notification.notification_type === 'schedule_reminder') {
            const minutesMatch = notification.message.match(/(\d+) minute/);
            const hoursMatch = notification.message.match(/(\d+) hour/);
            
            let toastType: 'info' | 'warning' = 'info';
            
            // Urgent if less than 30 minutes
            if (minutesMatch) {
              const minutes = parseInt(minutesMatch[1]);
              if (minutes <= 30) {
                toastType = 'warning';
              }
            }
            
            setToast({
              id: notification.id.toString(),
              message: `📅 ${notification.message}`,
              type: toastType,
            });
            
            // Auto-clear toast after 8 seconds
            setTimeout(() => {
              setToast(null);
            }, 8000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const clearToast = () => setToast(null);

  return { toast, clearToast };
};


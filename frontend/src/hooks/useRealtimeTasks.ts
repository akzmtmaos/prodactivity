import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Task } from '../types/task';

interface UseRealtimeTasksProps {
  userId: number;
  onTaskUpdate?: (task: Task) => void;
  onTaskCreate?: (task: Task) => void;
  onTaskDelete?: (taskId: number) => void;
}

export const useRealtimeTasks = ({ 
  userId, 
  onTaskUpdate, 
  onTaskCreate, 
  onTaskDelete 
}: UseRealtimeTasksProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const handleRealtimeEvent = useCallback((payload: any) => {
    console.log('Real-time task event received:', payload);
    
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch (eventType) {
      case 'INSERT':
        if (onTaskCreate && newRecord) {
          // Map backend fields to frontend fields
          const task: Task = {
            ...newRecord,
            dueDate: newRecord.due_date,
          };
          onTaskCreate(task);
        }
        break;
        
      case 'UPDATE':
        if (onTaskUpdate && newRecord) {
          // Map backend fields to frontend fields
          const task: Task = {
            ...newRecord,
            dueDate: newRecord.due_date,
          };
          onTaskUpdate(task);
        }
        break;
        
      case 'DELETE':
        if (onTaskDelete && oldRecord) {
          onTaskDelete(oldRecord.id);
        }
        break;
        
      default:
        console.log('Unknown event type:', eventType);
    }
  }, [onTaskCreate, onTaskUpdate, onTaskDelete]);

  useEffect(() => {
    if (!userId) return;

    console.log('Setting up real-time task subscription for user:', userId);

    // Subscribe to task changes for this user
    const subscription = supabase
      .channel('tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        handleRealtimeEvent
      )
      .subscribe((status) => {
        console.log('Supabase subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionError(null);
          console.log('✅ Real-time task subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setConnectionError('Failed to connect to real-time updates');
          console.error('❌ Real-time subscription error');
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          setConnectionError('Real-time connection timed out');
          console.error('⏰ Real-time subscription timed out');
        } else if (status === 'CLOSED') {
          setIsConnected(false);
          setConnectionError('Real-time connection closed');
          console.log('🔌 Real-time subscription closed');
        }
      });

    return () => {
      console.log('Cleaning up real-time task subscription');
      subscription.unsubscribe();
      setIsConnected(false);
    };
  }, [userId, handleRealtimeEvent]);

  return {
    isConnected,
    connectionError,
  };
};

// Hook for real-time progress updates
export const useRealtimeProgress = (userId: number) => {
  const [progressUpdate, setProgressUpdate] = useState<any>(null);

  useEffect(() => {
    if (!userId) return;

    console.log('Setting up real-time progress subscription for user:', userId);

    const subscription = supabase
      .channel('progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'productivity_logs',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Real-time progress event:', payload);
          setProgressUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time progress subscription');
      subscription.unsubscribe();
    };
  }, [userId]);

  return { progressUpdate };
};

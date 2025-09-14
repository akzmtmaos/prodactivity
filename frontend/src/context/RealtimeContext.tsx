import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Task } from '../types/task';
import { useRealtimeTasks, useRealtimeProgress } from '../hooks/useRealtimeTasks';

interface RealtimeContextType {
  // Connection status
  isConnected: boolean;
  connectionError: string | null;
  
  // Task updates
  onTaskCreate: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (taskId: number) => void;
  
  // Progress updates
  progressUpdate: any;
  
  // Manual refresh
  refreshTasks: () => void;
  refreshProgress: () => void;
  
  // Set refresh callbacks
  setRefreshCallbacks: (callbacks: { onTasksRefresh?: () => void; onProgressRefresh?: () => void }) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

interface RealtimeProviderProps {
  children: ReactNode;
  userId: number;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({
  children,
  userId,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [refreshCallbacks, setRefreshCallbacks] = useState<{
    onTasksRefresh?: () => void;
    onProgressRefresh?: () => void;
  }>({});

  // Handle task creation
  const handleTaskCreate = useCallback((newTask: Task) => {
    console.log('🆕 New task created:', newTask.title);
    setTasks(prev => {
      // Check if task already exists (avoid duplicates)
      const exists = prev.some(task => task.id === newTask.id);
      if (exists) return prev;
      
      return [newTask, ...prev];
    });
    setLastUpdate(new Date());
    
    // Trigger refresh callback if available
    if (refreshCallbacks.onTasksRefresh) {
      setTimeout(refreshCallbacks.onTasksRefresh, 100);
    }
  }, [refreshCallbacks.onTasksRefresh]);

  // Handle task updates
  const handleTaskUpdate = useCallback((updatedTask: Task) => {
    console.log('✏️ Task updated:', updatedTask.title);
    setTasks(prev => 
      prev.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    );
    setLastUpdate(new Date());
    
    // Trigger refresh callback if available
    if (refreshCallbacks.onTasksRefresh) {
      setTimeout(refreshCallbacks.onTasksRefresh, 100);
    }
  }, [refreshCallbacks.onTasksRefresh]);

  // Handle task deletion
  const handleTaskDelete = useCallback((taskId: number) => {
    console.log('🗑️ Task deleted:', taskId);
    setTasks(prev => prev.filter(task => task.id !== taskId));
    setLastUpdate(new Date());
    
    // Trigger refresh callback if available
    if (refreshCallbacks.onTasksRefresh) {
      setTimeout(refreshCallbacks.onTasksRefresh, 100);
    }
  }, [refreshCallbacks.onTasksRefresh]);

  // Manual refresh functions
  const refreshTasks = useCallback(() => {
    console.log('🔄 Manual tasks refresh triggered');
    if (refreshCallbacks.onTasksRefresh) {
      refreshCallbacks.onTasksRefresh();
    }
  }, [refreshCallbacks.onTasksRefresh]);

  const refreshProgress = useCallback(() => {
    console.log('📊 Manual progress refresh triggered');
    if (refreshCallbacks.onProgressRefresh) {
      refreshCallbacks.onProgressRefresh();
    }
  }, [refreshCallbacks.onProgressRefresh]);

  // Use real-time hooks
  const { isConnected, connectionError } = useRealtimeTasks({
    userId,
    onTaskCreate: handleTaskCreate,
    onTaskUpdate: handleTaskUpdate,
    onTaskDelete: handleTaskDelete,
  });

  const { progressUpdate } = useRealtimeProgress(userId);

  // Handle progress updates
  React.useEffect(() => {
    if (progressUpdate && refreshCallbacks.onProgressRefresh) {
      console.log('📈 Progress update received:', progressUpdate);
      setTimeout(refreshCallbacks.onProgressRefresh, 100);
    }
  }, [progressUpdate, refreshCallbacks.onProgressRefresh]);

  const value: RealtimeContextType = {
    isConnected,
    connectionError,
    onTaskCreate: handleTaskCreate,
    onTaskUpdate: handleTaskUpdate,
    onTaskDelete: handleTaskDelete,
    progressUpdate,
    refreshTasks,
    refreshProgress,
    setRefreshCallbacks,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = (): RealtimeContextType => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

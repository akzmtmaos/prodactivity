import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FolderOpen, Tag } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import HelpButton from '../components/HelpButton';
import TaskList from '../components/tasks/TaskList';
import TaskForm from '../components/tasks/TaskForm';
import TaskFilters from '../components/tasks/TaskFilters';
import TaskSummary from '../components/tasks/TaskSummary';
import { Task } from '../types/task';
import { getXpForTask } from '../utils/xpUtils';
import DeleteConfirmationModal from '../components/common/DeleteConfirmationModal';
import Toast from '../components/common/Toast';
import { RealtimeProvider, useRealtime } from '../context/RealtimeContext';
import { supabase } from '../lib/supabase';
// import { getTimezoneOffset } from '../utils/dateUtils';

// API_BASE_URL not needed; tasks use Supabase directly

// Main Tasks component with real-time provider
const Tasks = () => {
  const [user, setUser] = useState<any | null>(null);

  // Get user data for real-time provider
  useEffect(() => {
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
  }, []);

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <RealtimeProvider userId={user.id}>
      <TasksContent user={user} />
    </RealtimeProvider>
  );
};

// Tasks content component that uses real-time features
const TasksContent = ({ user }: { user: any }) => {
  const navigate = useNavigate();
  const { setRefreshCallbacks } = useRealtime();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  
  // Sorting and filtering
  const [sortField, setSortField] = useState<'dueDate' | 'priority' | 'title'>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterPriority, setFilterPriority] = useState<Task['priority'] | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // State for delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);

  // State for tabs
  const [activeTab, setActiveTab] = useState<'tasks' | 'categories' | 'completed' | 'assigned'>('tasks');
  // State for pre-selected category when adding task from category tab
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10); // Items per page

  // Task statistics state
  const [taskStats, setTaskStats] = useState({
    total_tasks: 0,
    completed_tasks: 0,
    pending_tasks: 0,
    due_today: 0
  });

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);


  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterPriority, sortField, sortDirection]);

  // Fetch tasks and stats whenever filters/search change (Supabase-only)
  // Note: currentPage is NOT in dependencies - we do client-side pagination for instant page changes
  useEffect(() => {
    fetchTasks();
    fetchTaskStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterPriority, filterCategory, sortField, sortDirection]);

  // Fetch tasks when activeTab changes
  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    console.log('showToast called:', message, type);
    setToast({ message, type });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Backend connectivity test removed; using Supabase directly

  // Fetch task statistics from Supabase
  const fetchTaskStats = useCallback(async () => {
    try {
      // Get current user ID
      const userData = localStorage.getItem('user');
      if (!userData) {
        return;
      }
      
      const user = JSON.parse(userData);
      // Ensure user_id is an integer (database expects integer, not UUID)
      const userId = typeof user.id === 'number' ? user.id : parseInt(user.id) || 11;
      
      console.log('📊 Fetching task stats from Supabase for user:', userId);
      
      // Build Supabase query for all user's tasks
      let query = supabase
        .from('tasks')
        .select('id, completed, due_date')
        .eq('user_id', userId)
        .eq('is_deleted', false);
      
      // Note: No completion filtering in stats - we want all tasks for accurate stats
      
      if (filterPriority !== 'all') {
        query = query.eq('priority', filterPriority);
      }
      
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Supabase error fetching task stats:', error);
        return;
      }
      
      console.log('📊 Task stats data from Supabase:', data);
      
      // Calculate statistics
      const totalTasks = data?.length || 0;
      const completedTasks = data?.filter(task => task.completed).length || 0;
      const pendingTasks = totalTasks - completedTasks;
      
      // Calculate tasks due today
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format (local date)
      const dueToday = data?.filter(task => 
        task.due_date === today && !task.completed
      ).length || 0;
      
      const stats = {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        pending_tasks: pendingTasks,
        due_today: dueToday
      };
      
      console.log('📊 Calculated task stats:', stats);
      setTaskStats(stats);
    } catch (err: any) {
      console.error('Error fetching task stats from Supabase:', err);
    }
  }, [filterPriority, searchTerm]);

  // Fetch tasks from Supabase
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get current user ID from localStorage (assuming it's stored there)
      const userData = localStorage.getItem('user');
      if (!userData) {
        navigate('/login');
        return;
      }
      
      const user = JSON.parse(userData);
      // Ensure user_id is an integer (database expects integer, not UUID)
      const userId = typeof user.id === 'number' ? user.id : parseInt(user.id) || 11;
      
      console.log('Fetching tasks from Supabase for user:', userId);
      
      // Handle assigned tasks separately
      if (activeTab === 'assigned') {
        const userData = localStorage.getItem('user');
        if (!userData) {
          setLoading(false);
          return;
        }
        const currentUser = JSON.parse(userData);
        
        // Get task IDs assigned to this user
        const { data: assignments, error: assignError } = await supabase
          .from('task_assignments')
          .select('task_id')
          .eq('assigned_to', currentUser.id)
          .in('status', ['pending', 'accepted', 'in_progress']);
        
        if (assignError) {
          console.error('Error fetching assignments:', assignError);
          setError('Failed to load assigned tasks.');
          setLoading(false);
          return;
        }
        
        const assignedTaskIds = (assignments || []).map(a => a.task_id);
        
        if (assignedTaskIds.length === 0) {
          setTasks([]);
          setTotalCount(0);
          setTotalPages(1);
          setLoading(false);
          return;
        }
        
        // Fetch assigned tasks
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .in('id', assignedTaskIds)
          .eq('is_deleted', false);
        
        if (error) {
          console.error('Supabase error:', error);
          setError('Failed to load assigned tasks.');
          setLoading(false);
          return;
        }
        
        const mappedTasks = (data || []).map((task: any) => ({
          ...task,
          dueDate: task.due_date,
        }));
        
        setTasks(mappedTasks);
        setTotalCount(mappedTasks.length);
        setTotalPages(Math.ceil(mappedTasks.length / pageSize));
        setLoading(false);
        return;
      }
      
      // Helper function to build base query with filters
      const buildBaseQuery = () => {
        let baseQuery = supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .eq('is_deleted', false);
        
        // Handle tab-based filtering
        if (activeTab === 'tasks') {
          // Show only incomplete tasks
          baseQuery = baseQuery.eq('completed', false);
        } else if (activeTab === 'completed') {
          // Show only completed tasks
          baseQuery = baseQuery.eq('completed', true);
        } else if (activeTab === 'categories') {
          // Show only incomplete tasks for categories tab
          baseQuery = baseQuery.eq('completed', false);
        }
        
        if (filterPriority !== 'all') {
          baseQuery = baseQuery.eq('priority', filterPriority);
        }
        
        if (filterCategory !== 'all') {
          baseQuery = baseQuery.eq('task_category', filterCategory);
        }
        
        if (searchTerm) {
          baseQuery = baseQuery.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }
        
        // Apply sorting
        const orderingField = sortField === 'dueDate' ? 'due_date' : sortField;
        baseQuery = baseQuery.order(orderingField, { ascending: sortDirection === 'asc' });
        
        return baseQuery;
      };
      
      // Load ALL tasks matching filters (client-side pagination for instant page changes)
      // Skip pagination for categories tab - it handles its own display
      const shouldPaginate = activeTab !== 'categories';
      
      // Fetch all tasks matching the filters (no server-side pagination)
      const dataQuery = buildBaseQuery();
      const { data, error } = await dataQuery;
      
      if (error) {
        console.error('Supabase error:', error);
        setError('Failed to load tasks from Supabase.');
        return;
      }
      
      console.log('Supabase tasks response (all):', data);
      
      // Map due_date to dueDate for each task
      const mappedTasks = (data || []).map((task: any) => ({
        ...task,
        dueDate: task.due_date,
      }));
      
      console.log('Mapped tasks:', mappedTasks);
      setTasks(mappedTasks);
      
      // Set pagination info (client-side pagination will slice the array)
      if (shouldPaginate) {
        const newTotalCount = mappedTasks.length;
        const newTotalPages = Math.ceil(newTotalCount / pageSize);
        
        setTotalCount(newTotalCount);
        setTotalPages(newTotalPages);
        
        console.log('Tasks info:', {
          totalCount: newTotalCount,
          totalPages: newTotalPages,
          currentPage,
          pageSize,
          resultsCount: mappedTasks.length
        });
      } else {
        // Categories tab - set pagination info but not used
        const newTotalCount = mappedTasks.length;
        const newTotalPages = Math.ceil(newTotalCount / pageSize);
        
        setTotalCount(newTotalCount);
        setTotalPages(newTotalPages);
      }
    } catch (err: any) {
      console.error('Error fetching tasks from Supabase:', err);
        setError('Failed to load tasks. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [navigate, activeTab, filterPriority, filterCategory, searchTerm, sortField, sortDirection, pageSize]);

  // Real-time refresh callbacks
  const handleTasksRefresh = useCallback(() => {
    console.log('🔄 Real-time triggered tasks refresh');
    fetchTasks();
    fetchTaskStats();
  }, [fetchTasks, fetchTaskStats]);

  const handleProgressRefresh = useCallback(() => {
    console.log('📊 Real-time triggered progress refresh');
    fetchTaskStats();
  }, [fetchTaskStats]);

  // Set up real-time refresh callbacks
  React.useEffect(() => {
    setRefreshCallbacks({
      onTasksRefresh: handleTasksRefresh,
      onProgressRefresh: handleProgressRefresh,
    });
  }, [setRefreshCallbacks, handleTasksRefresh, handleProgressRefresh]);

  // Listen for subtask completion events
  React.useEffect(() => {
    const handleSubtaskCompleted = (event: CustomEvent) => {
      const { subtaskTitle, xpAmount } = event.detail;
      showToast(`Subtask "${subtaskTitle}" completed! +${xpAmount} XP`, 'success');
    };

    window.addEventListener('subtaskCompleted', handleSubtaskCompleted as EventListener);
    
    return () => {
      window.removeEventListener('subtaskCompleted', handleSubtaskCompleted as EventListener);
    };
  }, []);

  // Add new task to Supabase
  const addTask = async (taskData: Omit<Task, 'id'>) => {
    try {
      // Get current user ID
      const userData = localStorage.getItem('user');
      if (!userData) {
        navigate('/login');
        return;
      }
      
      const user = JSON.parse(userData);
      // Ensure user_id is an integer (database expects integer, not UUID)
      const userId = typeof user.id === 'number' ? user.id : parseInt(user.id) || 11;
      
      const { dueDate, ...rest } = taskData;
      const supabaseTaskData = { 
        ...rest, 
        due_date: dueDate,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Double-check that no id field is present (safety check)
      if ('id' in supabaseTaskData) {
        console.error('ERROR: id field found in task data for new task creation:', supabaseTaskData);
        delete (supabaseTaskData as any).id;
      }
      
      console.log('Sending task data to Supabase:', supabaseTaskData);
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([supabaseTaskData])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        
        // Handle specific error types
        if (error.code === '23505' || error.message.includes('duplicate key value violates unique constraint')) {
          setError('Task creation failed. This usually happens when there\'s a temporary database issue. Please try again in a moment.');
        } else if (error.code === '23503' || error.message.includes('foreign key constraint')) {
          setError('Invalid user or reference data. Please refresh the page and try again.');
        } else if (error.code === '23514' || error.message.includes('check constraint')) {
          setError('Invalid task data. Please check your task details and try again.');
        } else {
          setError(`Failed to add task: ${error.message}`);
        }
        return;
      }
      
      console.log('Task created successfully in Supabase:', data);
      
      // Reset to first page and refetch tasks and stats to show the new task
      setCurrentPage(1);
      await fetchTasks();
      await fetchTaskStats();
      setIsFormOpen(false);
      showToast('Task created successfully!', 'success');
      
      // Update productivity log when a new task is created
      console.log('🔄 Calling updateProductivityLog after task creation');
      await updateProductivityLog();
      
      // Trigger progress refresh for real-time updates
      window.dispatchEvent(new CustomEvent('taskCreated', { 
        detail: { taskId: data.id, taskTitle: data.title } 
      }));
    } catch (err: any) {
      console.error('Error adding task to Supabase:', err);
        setError('Failed to add task. Please try again.');
    }
  };

  // Update existing task in Supabase
  const updateTask = async (taskData: Omit<Task, 'id'>) => {
    if (!editingTask) return;
    
    try {
      const { dueDate, ...rest } = taskData;
      const supabaseTaskData = { 
        ...rest, 
        due_date: dueDate,
        updated_at: new Date().toISOString()
      };
      
      console.log('Updating task in Supabase:', editingTask.id, supabaseTaskData);
      
      const { data, error } = await supabase
        .from('tasks')
        .update(supabaseTaskData)
        .eq('id', editingTask.id)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        
        // Handle specific error types
        if (error.code === '23505' || error.message.includes('duplicate key value violates unique constraint')) {
          setError('Task update failed. This usually happens when there\'s a temporary database issue. Please try again in a moment.');
        } else if (error.code === '23503' || error.message.includes('foreign key constraint')) {
          setError('Invalid user or reference data. Please refresh the page and try again.');
        } else if (error.code === '23514' || error.message.includes('check constraint')) {
          setError('Invalid task data. Please check your task details and try again.');
        } else {
          setError(`Failed to update task: ${error.message}`);
        }
        return;
      }
      
      console.log('Task updated successfully in Supabase:', data);
      
      // Refetch tasks and stats to ensure consistency with current pagination, filtering, and sorting
      await fetchTasks();
      await fetchTaskStats();
      setEditingTask(undefined);
      setIsFormOpen(false);
      showToast('Task updated successfully!', 'success');
    } catch (err) {
      console.error('Error updating task in Supabase:', err);
      setError('Failed to update task. Please try again.');
    }
  };

  // Show modal and set task id to delete
  const handleDeleteClick = (id: number) => {
    setDeleteTaskId(id);
    setDeleteModalOpen(true);
  };

  // Confirm deletion in Supabase
  const confirmDeleteTask = async () => {
    if (deleteTaskId === null) return;
    try {
      console.log('Deleting task from Supabase:', deleteTaskId);
      
      const { error } = await supabase
        .from('tasks')
        .update({ 
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', deleteTaskId);
      
      if (error) {
        console.error('Supabase error:', error);
        setError(`Failed to delete task: ${error.message}`);
        setDeleteModalOpen(false);
        return;
      }
      
      console.log('Task deleted successfully in Supabase');
      
      // Refetch tasks and stats to ensure consistency with current pagination, filtering, and sorting
      await fetchTasks();
      await fetchTaskStats();
      setDeleteTaskId(null);
      setDeleteModalOpen(false);
      showToast('Task deleted successfully!', 'success');
    } catch (err) {
      console.error('Error deleting task from Supabase:', err);
      setError('Failed to delete task. Please try again.');
      setDeleteModalOpen(false);
    }
  };

  // Helper function to update productivity log (called when tasks are created or completed)
  const updateProductivityLog = async () => {
    try {
      console.log('🔄 updateProductivityLog called');
      
      // Get current user ID
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      const userId = user?.id || 11;
      
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format (local date)
      console.log('🔄 Updating productivity log for user:', userId, 'date:', today);
      
      // Get today's productivity log or create new one
      const { data: existingLog, error: fetchError } = await supabase
        .from('productivity_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('period_type', 'daily')
        .eq('period_start', today)
        .eq('period_end', today)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching productivity log:', fetchError);
        return;
      }
      
      // Get tasks for TODAY ONLY (by due_date)
      const { data: todayTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, completed, created_at, due_date, updated_at')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .eq('due_date', today);  // CRITICAL: Only get tasks for today
      
      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        return;
      }
      
      const totalTasks = (todayTasks || []).length;
      const completedTasks = (todayTasks || []).filter(task => task.completed).length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      console.log('📊 Productivity calculation for TODAY:', {
        today,
        totalTasks,
        completedTasks,
        completionRate,
        todayTasks: todayTasks?.map(t => ({ 
          id: t.id, 
          title: t.title || 'No title',
          completed: t.completed, 
          due_date: t.due_date
        }))
      });
      
      // Determine productivity status
      let status = 'Low Productive';
      if (completionRate >= 90) status = 'Highly Productive';
      else if (completionRate >= 70) status = 'Productive';
      else if (completionRate >= 40) status = 'Moderately Productive';
      
      console.log('📊 Productivity log decision:', {
        existingLog: existingLog ? {
          id: existingLog.id,
          period_start: existingLog.period_start,
          period_end: existingLog.period_end,
          current_total: existingLog.total_tasks,
          current_completed: existingLog.completed_tasks
        } : null,
        today,
        newData: { totalTasks, completedTasks, completionRate, status }
      });
      
      if (existingLog) {
        // SAFETY CHECK #1: Only update if the log is actually for today
        if (existingLog.period_start !== today || existingLog.period_end !== today) {
          console.warn('⚠️ SAFETY CHECK #1 BLOCKED - log date mismatch:', existingLog.period_start, 'vs', today);
          console.warn('⚠️ This prevents overwriting historical data!');
          return; // CRITICAL: Stop here, don't update
        }
        
        // SAFETY CHECK #2: Never downgrade a log with data to 0/0
        if (existingLog.total_tasks > 0 && totalTasks === 0) {
          console.warn('⚠️ SAFETY CHECK #2 BLOCKED - refusing to overwrite', existingLog.total_tasks, 'tasks with 0');
          console.warn('⚠️ Existing log:', existingLog);
          console.warn('⚠️ New data would be: 0/0 - This is likely wrong!');
          return; // CRITICAL: Stop here, don't downgrade
        }
        
        console.log('✅ All safety checks passed - updating log for', today);
        // Update existing log
        const { error: updateError } = await supabase
          .from('productivity_logs')
          .update({
            completion_rate: completionRate,
            total_tasks: totalTasks,
            completed_tasks: completedTasks,
            status: status,
            logged_at: new Date().toISOString()
          })
          .eq('id', existingLog.id);
        
        if (updateError) {
          console.error('Error updating productivity log:', updateError);
        } else {
          console.log('✅ Productivity log updated successfully for', today);
        }
      } else {
        // Create new log only for today
        const { error: insertError } = await supabase
          .from('productivity_logs')
          .insert([{
            user_id: userId,
            period_type: 'daily',
            period_start: today,
            period_end: today,
            completion_rate: completionRate,
            total_tasks: totalTasks,
            completed_tasks: completedTasks,
            status: status,
            logged_at: new Date().toISOString()
          }]);
        
        if (insertError) {
          console.error('Error creating productivity log:', insertError);
        } else {
          console.log('✅ Productivity log created successfully for', today);
        }
      }
    } catch (err) {
      console.error('Error in updateProductivityLog:', err);
    }
  };

  // Log XP and productivity when task is completed (dynamic XP by priority)
  const logTaskCompletion = async (
    taskId: number,
    taskTitle: string,
    dueDate?: string,
    priority?: 'low' | 'medium' | 'high'
  ) => {
    try {
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      const userId = user?.id || 11;
      const today = new Date().toLocaleDateString('en-CA');
      const isOverdue = !!dueDate && dueDate < today;
      const xpAmount = getXpForTask(priority ?? 'medium', isOverdue);

      console.log('🎮 Logging XP for task:', taskTitle, 'priority:', priority ?? 'medium', 'XP:', xpAmount, isOverdue ? '(overdue)' : '(on-time)');
      const { error: xpError } = await supabase
        .from('xp_logs')
        .insert([{
          user_id: userId,
          task_id: taskId,
          xp_amount: xpAmount,
          source: 'task_completion',
          description: `Completed task: ${taskTitle}${isOverdue ? ' (Overdue)' : ''}`,
          created_at: new Date().toISOString()
        }]);

      if (xpError) {
        console.error('❌ Error creating XP log:', xpError);
      } else {
        console.log(`✅ +${xpAmount} XP (${priority ?? 'medium'})`);
      }
      await updateProductivityLog();
    } catch (err) {
      console.error('Error in logTaskCompletion:', err);
    }
  };

  // Toggle task completion in Supabase
  const toggleTaskCompletion = async (id: number) => {
    console.log('toggleTaskCompletion called with id:', id);
    const taskToToggle = tasks.find(task => task.id === id);
    if (!taskToToggle) {
      console.log('Task not found:', id);
      return;
    }
    
    console.log('Task to toggle:', taskToToggle.title, 'Current completed status:', taskToToggle.completed);
    
    try {
      const newCompletedStatus = !taskToToggle.completed;
      const completedAt = newCompletedStatus ? new Date().toISOString() : null;
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          completed: newCompletedStatus,
          completed_at: completedAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        setError(`Failed to update task: ${error.message}`);
        return;
      }
      
      console.log('Task completion updated in Supabase:', data);
      
      if (!taskToToggle.completed && newCompletedStatus) {
        await logTaskCompletion(id, taskToToggle.title, taskToToggle.dueDate, taskToToggle.priority);
        const today = new Date().toLocaleDateString('en-CA');
        const isOverdue = !!taskToToggle.dueDate && taskToToggle.dueDate < today;
        const xpAmount = getXpForTask(taskToToggle.priority ?? 'medium', isOverdue);
        showToast(`Task "${taskToToggle.title}" completed! +${xpAmount} XP${isOverdue ? ' (Overdue)' : ''}`, 'success');
        
        // Trigger progress refresh for real-time updates
        window.dispatchEvent(new CustomEvent('taskCompleted', { 
          detail: { taskId: id, taskTitle: taskToToggle.title } 
        }));
      } else if (taskToToggle.completed && !newCompletedStatus) {
        console.log('Task was marked as pending');
        showToast(`Task "${taskToToggle.title}" marked as pending`, 'success');
      }
      
      // Refetch tasks and stats to update the UI
      console.log('Refetching tasks and stats...');
      await fetchTasks();
      await fetchTaskStats();
      console.log('Tasks and stats refetched successfully');
    } catch (err: any) {
      console.error('Error toggling task completion in Supabase:', err);
        setError('Failed to update task. Please try again.');
    }
  };

  const handleTaskCompleted = async (completedTask: any) => {
    await logTaskCompletion(completedTask.id, completedTask.title, completedTask.dueDate, completedTask.priority);
    setTasks(tasks.map(task => task.id === completedTask.id ? completedTask : task));
    const today = new Date().toLocaleDateString('en-CA');
    const isOverdue = !!completedTask.dueDate && completedTask.dueDate < today;
    const xpAmount = getXpForTask(completedTask.priority ?? 'medium', isOverdue);
    showToast(`Task "${completedTask.title}" completed with evidence! +${xpAmount} XP${isOverdue ? ' (Overdue)' : ''}`, 'success');
    
    // Trigger progress refresh for real-time updates
    window.dispatchEvent(new CustomEvent('taskCompleted', { 
      detail: { taskId: completedTask.id, taskTitle: completedTask.title } 
    }));
    
    // Refetch tasks and stats to update the UI
    setTimeout(async () => {
      console.log('Refetching tasks and stats after evidence completion...');
      await fetchTasks();
      await fetchTaskStats();
      console.log('Tasks and stats refetched successfully after evidence completion');
    }, 100);
  };

  // Handle form submission
  const handleSubmit = (taskData: Omit<Task, 'id'>) => {
    if (editingTask) {
      updateTask(taskData);
    } else {
      addTask(taskData);
    }
    // Reset selected category after form submission
    setSelectedCategory('');
  };

  // Handle sort
  const handleSort = (field: 'dueDate' | 'priority' | 'title') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    
    // Refetch with new sort params
    setTimeout(() => {
      fetchTasks();
    }, 0);
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Function to generate consistent hash for category colors
  const getCategoryColorHash = (category: string) => {
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      const char = category.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  };

  // Function to get category color styling with randomized but consistent colors
  const getCategoryColor = (category: string) => {
    if (category === 'Uncategorized') {
      return {
        bg: 'bg-gray-50 dark:bg-gray-700',
        text: 'text-gray-900 dark:text-white',
        count: 'text-gray-500 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-600'
      };
    }

    // Array of color combinations for categories
    const colorCombinations = [
      { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-900 dark:text-blue-100', count: 'text-blue-600 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-700' },
      { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-900 dark:text-green-100', count: 'text-green-600 dark:text-green-300', border: 'border-green-200 dark:border-green-700' },
      { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-900 dark:text-purple-100', count: 'text-purple-600 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-700' },
      { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-900 dark:text-orange-100', count: 'text-orange-600 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-700' },
      { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-900 dark:text-pink-100', count: 'text-pink-600 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-700' },
      { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-900 dark:text-indigo-100', count: 'text-indigo-600 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-700' },
      { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-900 dark:text-teal-100', count: 'text-teal-600 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-700' },
      { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-900 dark:text-red-100', count: 'text-red-600 dark:text-red-300', border: 'border-red-200 dark:border-red-700' },
      { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-900 dark:text-yellow-100', count: 'text-yellow-600 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-700' },
      { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-900 dark:text-cyan-100', count: 'text-cyan-600 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-700' }
    ];

    const hash = getCategoryColorHash(category);
    const colorIndex = hash % colorCombinations.length;
    return colorCombinations[colorIndex];
  };
  
  // Group tasks by category for the categories tab
  const tasksByCategory = tasks.reduce((acc, task) => {
    const category = task.task_category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(task);
    return acc;
  }, {} as Record<string, Task[]>);
  
  // Extract existing categories for the TaskForm dropdown and filter
  const uniqueCategories = Array.from(new Set(
    tasks
      .map(task => task.task_category)
      .filter((category): category is string => category !== undefined && category.trim() !== '')
  )).sort();
  
  // Also keep existingCategories for TaskForm compatibility
  const existingCategories = uniqueCategories;
  
  // Client-side pagination logic (instant page changes, no loading)
  // Only paginate for tasks and completed tabs, not categories
  const shouldPaginate = activeTab !== 'categories';
  
  let displayedTasks: Task[] = [];
  if (activeTab === 'categories') {
    displayedTasks = []; // Categories tab will handle its own display
  } else if (shouldPaginate) {
    // Client-side pagination: slice the tasks array
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    displayedTasks = tasks.slice(startIndex, endIndex);
  } else {
    displayedTasks = tasks;
  }


  return (
    <PageLayout>
      <div className="space-y-6">
        <div className="max-w-7xl mx-auto">
          {/* Header – title only; Search + Add Task moved to filter row below */}
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
              Tasks
              <HelpButton
                content={
                  <div>
                    <p className="font-semibold mb-2">Task Management</p>
                    <ul className="space-y-1 text-xs">
                      <li>• <strong>Create Tasks:</strong> Add new tasks with due dates and priorities</li>
                      <li>• <strong>Priority Levels:</strong> High, Medium, Low priority tasks</li>
                      <li>• <strong>Due Dates:</strong> Set deadlines and track overdue tasks</li>
                      <li>• <strong>Subtasks:</strong> Break down complex tasks into smaller parts</li>
                      <li>• <strong>Time Tracking:</strong> Log time spent on tasks</li>
                      <li>• <strong>Evidence Upload:</strong> Attach files as proof of completion</li>
                      <li>• <strong>Archive/Delete:</strong> Organize completed and old tasks</li>
                    </ul>
                  </div>
                }
                title="Tasks Help"
              />
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Manage and track your tasks
            </p>
          </div>

          {/* Task summary */}
          <TaskSummary 
            tasks={tasks} 
            totalCount={taskStats.total_tasks}
            completedCount={taskStats.completed_tasks}
            pendingCount={taskStats.pending_tasks}
            dueTodayCount={taskStats.due_today}
          />

          {/* Tabs + Filters row (same style as Decks: compact tabs, filters + search + Add Task on right) */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 mb-4 gap-4 flex-wrap">
            <div className="flex space-x-4">
              <button
                className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                  activeTab === 'tasks'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
                onClick={() => setActiveTab('tasks')}
              >
                All Tasks
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                  activeTab === 'categories'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
                onClick={() => setActiveTab('categories')}
              >
                Category
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                  activeTab === 'completed'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
                onClick={() => setActiveTab('completed')}
              >
                Completed
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                  activeTab === 'assigned'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
                onClick={() => setActiveTab('assigned')}
              >
                Assigned to Me
              </button>
            </div>
            {/* Filters + Search + Add Task (compact, same sizing as Decks) */}
            <div className="flex items-center gap-2 flex-wrap justify-end w-full md:w-auto">
              <TaskFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filterCompleted={null}
                onFilterCompletedChange={() => {}}
                filterPriority={filterPriority}
                onFilterPriorityChange={setFilterPriority}
                filterCategory={filterCategory}
                onFilterCategoryChange={setFilterCategory}
                categories={uniqueCategories}
                sortField={sortField}
                onSortFieldChange={setSortField}
                sortDirection={sortDirection}
                onSortDirectionChange={setSortDirection}
                onResetFilters={() => {
                  setSearchTerm('');
                  setFilterPriority('all');
                  setFilterCategory('all');
                  setSortField('dueDate');
                  setSortDirection('asc');
                }}
              />
              <div className="relative w-full sm:w-48">
                <Search size={14} className="absolute left-2 top-1.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-2 h-7 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingTask(undefined);
                  setIsFormOpen(true);
                }}
                className="inline-flex items-center h-7 px-3 text-xs font-medium rounded-lg border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                <Plus size={14} className="mr-1.5" />
                Add Task
              </button>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

                     {/* Task form modal */}
           {isFormOpen && (
             <TaskForm
               task={editingTask}
               onSubmit={handleSubmit}
               onCancel={() => {
                 setIsFormOpen(false);
                 setEditingTask(undefined);
                 setSelectedCategory('');
               }}
               existingCategories={existingCategories}
               preSelectedCategory={selectedCategory}
             />
           )}

          {/* Tasks list */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-6 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Loading tasks...</p>
              </div>
            ) : activeTab === 'categories' ? (
              // Categories tab display (same padding as All Tasks: p-2 so content reaches same left/right)
              <div className="p-2">
                {Object.keys(tasksByCategory).length === 0 ? (
                  <div className="text-center py-12 px-4 bg-gray-50 dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-[#333333]">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-[#333333] mb-4">
                      <FolderOpen size={24} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">No categories yet</h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                      Create tasks with a category to see them grouped here.
                    </p>
                    <button
                      type="button"
                      className="mt-4 flex items-center justify-center h-7 px-3 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition-colors mx-auto"
                      onClick={() => setIsFormOpen(true)}
                    >
                      <Plus size={14} className="mr-1.5" />
                      New Task
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(tasksByCategory).map(([category, categoryTasks]) => {
                      const colors = getCategoryColor(category);
                      return (
                        <div key={category} className="rounded-xl border border-gray-200 dark:border-[#333333] overflow-hidden bg-white dark:bg-[#252525] shadow-sm">
                          <div className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-[#333333] ${colors.bg}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg} border ${colors.border}`}>
                                <Tag size={16} className={colors.text} />
                              </div>
                              <div className="min-w-0">
                                <h3 className={`text-sm font-semibold truncate ${colors.text}`}>
                                  {category} ({categoryTasks.length} task{categoryTasks.length !== 1 ? 's' : ''})
                                </h3>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTask(undefined);
                                setIsFormOpen(true);
                                setSelectedCategory(category);
                              }}
                              className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-lg text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/50 dark:hover:bg-black/20 transition-colors"
                              title={`Add task to ${category}`}
                              aria-label={`Add task to ${category}`}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <div className="border-t border-gray-200 dark:border-[#333333]">
                            <TaskList
                              tasks={categoryTasks}
                              onToggleComplete={toggleTaskCompletion}
                              onEdit={(task) => {
                                setEditingTask(task);
                                setIsFormOpen(true);
                              }}
                              onDelete={handleDeleteClick}
                              onTaskCompleted={handleTaskCompleted}
                              sortField={sortField}
                              sortDirection={sortDirection}
                              onSort={handleSort}
                              onAddTask={() => {
                                setEditingTask(undefined);
                                setIsFormOpen(true);
                              }}
                              compact={true}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : displayedTasks.length === 0 ? (
              <div className="p-6 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {activeTab === 'assigned' ? 'No assigned tasks' : 'No tasks found'}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {activeTab === 'assigned' 
                    ? 'No tasks have been assigned to you yet. Tasks assigned by others will appear here.'
                    : searchTerm || filterPriority !== 'all'
                    ? 'Try changing your search or filter criteria.'
                    : 'Get started by creating a new task.'}
                </p>
                {!searchTerm && filterPriority === 'all' && filterCategory === 'all' && (
                  <div className="mt-6">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      onClick={() => setIsFormOpen(true)}
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      New Task
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <TaskList
                  tasks={displayedTasks}
                  onToggleComplete={toggleTaskCompletion}
                  onEdit={(task) => {
                    setEditingTask(task);
                    setIsFormOpen(true);
                  }}
                  onDelete={handleDeleteClick}
                  onTaskCompleted={handleTaskCompleted}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  onAddTask={() => {
                    setEditingTask(undefined);
                    setIsFormOpen(true);
                  }}
                  compact={true}
                />
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handlePreviousPage}
                          disabled={currentPage === 1}
                          className={`px-3 py-1 text-sm font-medium rounded-md ${
                            currentPage === 1
                              ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          Previous
                        </button>
                        
                        {/* Page numbers */}
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`px-3 py-1 text-sm font-medium rounded-md ${
                                  currentPage === pageNum
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        
                        <button
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages}
                          className={`px-3 py-1 text-sm font-medium rounded-md ${
                            currentPage === totalPages
                              ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeleteTaskId(null); }}
        onConfirm={confirmDeleteTask}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
             />
       
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
     </PageLayout>
   );
 };

export default Tasks;
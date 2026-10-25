import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FolderOpen, X, Trash2, AlertTriangle, ClipboardList, ChevronDown } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import TaskList from '../components/tasks/TaskList';
import TaskForm from '../components/tasks/TaskForm';
import TaskFilters from '../components/tasks/TaskFilters';
import TaskSummary from '../components/tasks/TaskSummary';
import { Task } from '../types/task';
import { getXpForTask } from '../utils/xpUtils';
import Toast from '../components/common/Toast';
import Pagination from '../components/common/Pagination';
import HeaderTooltip from '../components/common/HeaderTooltip';
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
      <TasksContent />
    </RealtimeProvider>
  );
};

// Tasks content component that uses real-time features
const TasksContent = () => {
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

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const [deleteTaskLoading, setDeleteTaskLoading] = useState(false);

  // Bulk delete (same pattern as Decks/Notebooks)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [selectedTasksForDelete, setSelectedTasksForDelete] = useState<number[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // State for tabs
  const [activeTab, setActiveTab] = useState<'tasks' | 'categories' | 'completed'>('tasks');
  // State for pre-selected category when adding task from category tab
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Collapsed due-date sections on the All Tasks tab
  const [collapsedTaskGroups, setCollapsedTaskGroups] = useState<Record<string, boolean>>({});


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
        
        // Apply sorting: Completed tab by completion date (newest at top); others by user sort
        if (activeTab === 'completed') {
          baseQuery = baseQuery.order('completed_at', { ascending: false });
        } else {
          const orderingField = sortField === 'dueDate' ? 'due_date' : sortField;
          baseQuery = baseQuery.order(orderingField, { ascending: sortDirection === 'asc' });
        }
        
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

  const confirmDeleteTask = async () => {
    if (deleteTaskId === null) return;
    setDeleteTaskLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', deleteTaskId);

      if (error) {
        setError(`Failed to delete task: ${error.message}`);
        setDeleteModalOpen(false);
        return;
      }
      await fetchTasks();
      await fetchTaskStats();
      setDeleteTaskId(null);
      setDeleteModalOpen(false);
      showToast('Task deleted successfully!', 'success');
    } catch (err) {
      console.error('Error deleting task from Supabase:', err);
      setError('Failed to delete task. Please try again.');
      setDeleteModalOpen(false);
    } finally {
      setDeleteTaskLoading(false);
    }
  };

  // Bulk delete tasks – moves the selected tasks to Trash
  const handleBulkDeleteTasks = async (taskIds: number[]) => {
    if (taskIds.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', taskIds);

      if (error) {
        setShowBulkDeleteConfirm(false);
        setError(`Failed to delete tasks: ${error.message}`);
        showToast('Failed to delete tasks.', 'error');
        return;
      }

      setSelectedTasksForDelete([]);
      setShowBulkDeleteConfirm(false);
      setShowBulkDeleteModal(false);
      await fetchTasks();
      await fetchTaskStats();
      // Keep the pager on a page that still has rows
      setCurrentPage((page) => Math.min(page, Math.max(1, Math.ceil((tasks.length - taskIds.length) / pageSize))));
      showToast(`${taskIds.length} task${taskIds.length !== 1 ? 's' : ''} moved to Trash.`, 'success');
    } catch (err) {
      console.error('Error bulk deleting tasks from Supabase:', err);
      setShowBulkDeleteConfirm(false);
      setError('Failed to delete tasks. Please try again.');
      showToast('Failed to delete tasks.', 'error');
    } finally {
      setBulkDeleteLoading(false);
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

  const allTasksSelected = tasks.length > 0 && selectedTasksForDelete.length === tasks.length;
  const someTasksSelected = selectedTasksForDelete.length > 0 && !allTasksSelected;

  const toggleAllTasksForDelete = () => {
    setSelectedTasksForDelete(allTasksSelected ? [] : tasks.map((task) => task.id));
  };

  const tabs: { id: 'tasks' | 'categories' | 'completed'; label: string; count: number }[] = [
    { id: 'tasks', label: 'All Tasks', count: taskStats.pending_tasks },
    { id: 'categories', label: 'Category', count: uniqueCategories.length },
    { id: 'completed', label: 'Completed', count: taskStats.completed_tasks },
  ];

  // Notion-style due-date sections for the current page of All Tasks
  const groupedTasks = (() => {
    if (activeTab !== 'tasks' || displayedTasks.length === 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    const buckets: { key: string; label: string; tasks: Task[] }[] = [
      { key: 'overdue', label: 'Overdue', tasks: [] },
      { key: 'today', label: 'Today', tasks: [] },
      { key: 'week', label: 'This week', tasks: [] },
      { key: 'later', label: 'Later', tasks: [] },
      { key: 'no-date', label: 'No due date', tasks: [] },
    ];

    displayedTasks.forEach((task) => {
      if (!task.dueDate) {
        buckets[4].tasks.push(task);
        return;
      }
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);
      if (due < today) buckets[0].tasks.push(task);
      else if (due.getTime() === today.getTime()) buckets[1].tasks.push(task);
      else if (due <= weekEnd) buckets[2].tasks.push(task);
      else buckets[3].tasks.push(task);
    });

    return buckets.filter((bucket) => bucket.tasks.length > 0);
  })();

  return (
    <PageLayout>
      <div className="space-y-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-5">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Tasks
            </h1>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Plan what matters, then work through it.
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

          {/* Tabs + toolbar */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#2f2f2f] mb-3 gap-3 min-w-0 flex-nowrap">
            <div className="flex items-center gap-0.5 min-w-0 overflow-x-auto overflow-y-hidden scrollbar-thin" style={{ scrollbarWidth: 'thin' }} role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors focus:outline-none ${
                    activeTab === tab.id
                      ? 'bg-gray-100 text-gray-900 dark:bg-[#2b2b2b] dark:text-white'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#242424] dark:hover:text-gray-200'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                  <span className={`text-[11px] tabular-nums ${activeTab === tab.id ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            {/* Filters + Search + Add Task: no wrap so row stays single line */}
            <div className="flex items-center gap-1.5 justify-end flex-shrink-0 min-w-0">
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
              {tasks.length > 0 && (
                <HeaderTooltip label="Delete tasks" fixed>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTasksForDelete([]);
                      setShowBulkDeleteConfirm(false);
                      setShowBulkDeleteModal(true);
                    }}
                    className="px-2 h-7 text-xs border border-red-200 dark:border-red-700 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center"
                    aria-label="Delete tasks"
                  >
                    <Trash2 size={14} />
                  </button>
                </HeaderTooltip>
              )}
              <div className="relative w-full sm:w-44">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search tasks"
                  className="w-full pl-7 pr-2.5 h-7 text-xs rounded-md border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-[#404040] transition-colors"
                />
              </div>
              <HeaderTooltip label="New task" fixed>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTask(undefined);
                    setIsFormOpen(true);
                  }}
                  className="inline-flex items-center h-7 px-2.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  aria-label="Add task"
                >
                  <Plus size={14} className="mr-1.5" />
                  Add Task
                </button>
              </HeaderTooltip>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-900/15 px-3 py-2">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-red-500 dark:text-red-400" />
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
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
          <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2f2f2f] rounded-lg">
            {loading ? (
              <div className="divide-y divide-gray-100 dark:divide-[#2b2b2b]">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="flex items-start gap-3 px-3 py-3">
                    <div className="mt-0.5 h-4 w-4 rounded bg-gray-100 dark:bg-[#2b2b2b] animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-[#2b2b2b] animate-pulse" />
                      <div className="h-2.5 w-1/5 rounded bg-gray-100 dark:bg-[#2b2b2b] animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activeTab === 'categories' ? (
              // Categories tab display (same padding as All Tasks: p-2 so content reaches same left/right)
              <div className="p-2">
                {Object.keys(tasksByCategory).length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-[#2b2b2b]">
                      <FolderOpen size={18} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">No categories yet</h3>
                    <p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
                      Give a task a category and it will be grouped here.
                    </p>
                    <button
                      type="button"
                      className="mt-4 inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                      onClick={() => setIsFormOpen(true)}
                    >
                      <Plus size={14} />
                      New task
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(tasksByCategory).map(([category, categoryTasks]) => {
                      return (
                        <div key={category} className="rounded-lg border border-gray-200 dark:border-[#2f2f2f] bg-white dark:bg-[#1e1e1e]">
                          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-[#2f2f2f]">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-gray-400 dark:bg-gray-500" />
                              <h3 className="min-w-0 truncate text-[13px] font-medium text-gray-900 dark:text-gray-100">
                                {category}
                              </h3>
                              <span className="flex-shrink-0 text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
                                {categoryTasks.length}
                              </span>
                            </div>
                            <HeaderTooltip label="Add task here" fixed>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTask(undefined);
                                  setIsFormOpen(true);
                                  setSelectedCategory(category);
                                }}
                                className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-md text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2b2b2b] transition-colors"
                                aria-label={`Add task to ${category}`}
                              >
                                <Plus size={14} />
                              </button>
                            </HeaderTooltip>
                          </div>
                          <div>
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
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-[#2b2b2b]">
                  <ClipboardList size={18} className="text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  No tasks found
                </h3>
                <p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
                  {searchTerm || filterPriority !== 'all' || filterCategory !== 'all'
                    ? 'Try a different search or clear your filters.'
                    : 'Add your first task to get started.'}
                </p>
                {!searchTerm && filterPriority === 'all' && filterCategory === 'all' && (
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                    onClick={() => setIsFormOpen(true)}
                  >
                    <Plus size={14} />
                    New task
                  </button>
                )}
              </div>
            ) : (
              <>
                {groupedTasks ? (
                  <div>
                    {groupedTasks.map((group) => {
                      const collapsed = !!collapsedTaskGroups[group.key];
                      return (
                        <section key={group.key}>
                          <button
                            type="button"
                            onClick={() => setCollapsedTaskGroups((prev) => ({ ...prev, [group.key]: !prev[group.key] }))}
                            aria-expanded={!collapsed}
                            className="flex w-full items-center gap-1.5 px-3 pt-2.5 pb-1 text-left transition-colors hover:bg-gray-50/70 dark:hover:bg-[#242424]"
                          >
                            <ChevronDown
                              size={12}
                              className={`flex-shrink-0 text-gray-400 transition-transform ${collapsed ? '-rotate-90' : ''}`}
                            />
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              {group.label}
                            </span>
                            <span className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
                              {group.tasks.length}
                            </span>
                          </button>
                          {!collapsed && (
                            <TaskList
                              tasks={group.tasks}
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
                          )}
                        </section>
                      );
                    })}
                  </div>
                ) : (
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
                )}
                
                {/* Pagination – header-style footer */}
                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-gray-200 dark:border-[#2f2f2f] bg-gray-50/60 dark:bg-[#242424]">
                    <span className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                      {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
                    </span>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* Delete Task confirmation – matches Deck/Notebook delete dialogs */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/30 dark:bg-black/60 transition-opacity"
            onClick={() => { setDeleteModalOpen(false); setDeleteTaskId(null); }}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-lg bg-white dark:bg-[#1a1a1a] text-left shadow-xl border border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-200 dark:border-[#2a2a2a]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FDE8E8] dark:bg-red-900/30 shrink-0">
                  <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
                </div>
                <h2 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">Delete Task</h2>
              </div>
              <HeaderTooltip label="Close" fixed>
                <button
                  type="button"
                  onClick={() => { setDeleteModalOpen(false); setDeleteTaskId(null); }}
                  className="p-1 text-gray-400 dark:text-[#666666] hover:text-gray-600 dark:hover:text-[#888888] rounded-md hover:bg-gray-100 dark:hover:bg-[#242424] transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </HeaderTooltip>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600 dark:text-white/80">
                Delete <span className="font-medium text-gray-900 dark:text-white">"{tasks.find(t => t.id === deleteTaskId)?.title ?? 'this task'}"</span>? This cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3">
              <button
                type="button"
                onClick={() => { setDeleteModalOpen(false); setDeleteTaskId(null); }}
                disabled={deleteTaskLoading}
                className="px-2.5 py-1.5 text-xs text-gray-700 dark:text-white border border-gray-300 dark:border-[#333333] rounded-md font-medium bg-white dark:bg-[#242424] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTask}
                disabled={deleteTaskLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 dark:bg-[#e60000] dark:hover:bg-[#c20000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteTaskLoading ? (
                  <span className="inline-block h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {deleteTaskLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete tasks – same pattern as Decks/Notebooks */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40 dark:bg-black/60"
            onClick={() => {
              if (!bulkDeleteLoading) {
                setShowBulkDeleteModal(false);
                setSelectedTasksForDelete([]);
              }
            }}
          />
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="relative flex flex-col bg-white dark:bg-[#1e1e1e] rounded-md shadow-xl border border-gray-200 dark:border-[#333333] max-w-4xl w-full max-h-[85vh] overflow-hidden z-[101]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-[#333333] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Delete Tasks</h3>
                <HeaderTooltip label="Close" fixed>
                  <button
                    type="button"
                    onClick={() => {
                      if (!bulkDeleteLoading) {
                        setShowBulkDeleteModal(false);
                        setSelectedTasksForDelete([]);
                      }
                    }}
                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-[#2d2d2d] disabled:opacity-50"
                    disabled={bulkDeleteLoading}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </HeaderTooltip>
              </div>
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 py-3">
                <p className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Select tasks to delete. They will be moved to Trash and can be restored from there.
                </p>
                <div className="flex-1 min-h-0 flex flex-col border border-gray-200 dark:border-[#333333] rounded-md overflow-hidden">
                  <div className="flex-shrink-0 flex items-center justify-between gap-3 px-3 py-2 border-b border-gray-200 dark:border-[#333333] bg-gray-50/60 dark:bg-[#252525]">
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allTasksSelected}
                        ref={(el) => { if (el) el.indeterminate = someTasksSelected; }}
                        onChange={toggleAllTasksForDelete}
                        disabled={bulkDeleteLoading}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      Select all
                    </label>
                    <div className="flex items-center gap-3">
                      <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                        {selectedTasksForDelete.length} of {tasks.length} selected
                      </span>
                      {selectedTasksForDelete.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowBulkDeleteConfirm(true)}
                          disabled={bulkDeleteLoading}
                          className="px-2 py-1 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Delete ({selectedTasksForDelete.length})
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] border-b border-gray-100 dark:border-[#333333] last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        id={`task-bulk-${task.id}`}
                        checked={selectedTasksForDelete.includes(task.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTasksForDelete((prev) => [...prev, task.id]);
                          } else {
                            setSelectedTasksForDelete((prev) => prev.filter((id) => id !== task.id));
                          }
                        }}
                        disabled={bulkDeleteLoading}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`task-bulk-${task.id}`}
                        className="ml-4 flex items-center flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg mr-4 bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                          <ClipboardList size={16} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {task.title || 'Untitled task'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} priority
                            {task.dueDate ? ` • Due ${new Date(task.dueDate).toLocaleDateString()}` : ' • No due date'}
                            {task.task_category ? ` • ${task.task_category}` : ''}
                            {task.completed ? ' • Completed' : ''}
                          </div>
                        </div>
                      </label>
                    </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 px-4 py-2.5 border-t border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#252525] rounded-b-md flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!bulkDeleteLoading) {
                      setShowBulkDeleteModal(false);
                      setSelectedTasksForDelete([]);
                    }
                  }}
                  disabled={bulkDeleteLoading}
                  className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-[#333333] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  disabled={selectedTasksForDelete.length === 0 || bulkDeleteLoading}
                  className="px-2.5 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete{selectedTasksForDelete.length > 0 ? ` (${selectedTasksForDelete.length})` : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation for the bulk delete */}
      {showBulkDeleteConfirm && selectedTasksForDelete.length > 0 && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 dark:bg-black/70"
            onClick={() => { if (!bulkDeleteLoading) setShowBulkDeleteConfirm(false); }}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-lg bg-white dark:bg-[#1a1a1a] text-left shadow-xl border border-gray-200 dark:border-[#2a2a2a]">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-200 dark:border-[#2a2a2a]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FDE8E8] dark:bg-red-900/30 shrink-0">
                  <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
                </div>
                <h2 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">Delete Tasks</h2>
              </div>
              <HeaderTooltip label="Close" fixed>
                <button
                  type="button"
                  onClick={() => { if (!bulkDeleteLoading) setShowBulkDeleteConfirm(false); }}
                  disabled={bulkDeleteLoading}
                  className="p-1 text-gray-400 dark:text-[#666666] hover:text-gray-600 dark:hover:text-[#888888] rounded-md hover:bg-gray-100 dark:hover:bg-[#242424] transition-colors disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </HeaderTooltip>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600 dark:text-white/80">
                Delete <span className="font-medium text-gray-900 dark:text-white">{selectedTasksForDelete.length} task{selectedTasksForDelete.length !== 1 ? 's' : ''}</span>? They will be moved to Trash and can be restored from there.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={bulkDeleteLoading}
                className="px-2.5 py-1.5 text-xs text-gray-700 dark:text-white border border-gray-300 dark:border-[#333333] rounded-md font-medium bg-white dark:bg-[#242424] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleBulkDeleteTasks(selectedTasksForDelete)}
                disabled={bulkDeleteLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 dark:bg-[#e60000] dark:hover:bg-[#c20000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkDeleteLoading ? (
                  <span className="inline-block h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {bulkDeleteLoading ? 'Deleting...' : `Delete (${selectedTasksForDelete.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
       
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
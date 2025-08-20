import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PageLayout from '../components/PageLayout';
import TaskList from '../components/tasks/TaskList';
import TaskForm from '../components/tasks/TaskForm';
import TaskFilters from '../components/tasks/TaskFilters';
import TaskSummary from '../components/tasks/TaskSummary';
import { Task } from '../types/task';
import DeleteConfirmationModal from '../components/common/DeleteConfirmationModal';
// import { getTimezoneOffset } from '../utils/dateUtils';

const API_BASE_URL = 'http://localhost:8000/api';

// Add getAuthHeaders function for JWT authentication
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {};
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  // Add timezone offset for backend date handling
  // Temporarily disabled to test basic functionality
  // const timezoneOffset = getTimezoneOffset();
  // headers['X-Timezone-Offset'] = timezoneOffset.toString();
  
  return headers;
};

const Tasks = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any | null>(null);
  // Remove greeting state
  // const [greeting, setGreeting] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  
  // Sorting and filtering
  const [sortField, setSortField] = useState<keyof Task>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterCompleted, setFilterCompleted] = useState<boolean | null>(null);
  const [filterPriority, setFilterPriority] = useState<Task['priority'] | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // State for delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);



  // State for tabs
  const [activeTab, setActiveTab] = useState<'tasks' | 'completed'>('tasks');

  // Initial user/greeting setup
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
    // Remove greeting logic
    // const hour = new Date().getHours();
    // if (hour < 12) setGreeting('Good morning');
    // else if (hour < 18) setGreeting('Good afternoon');
    // else setGreeting('Good evening');
  }, []);

  // Fetch tasks whenever filters/search change
  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterCompleted, filterPriority, sortField, sortDirection]);



  // Fetch tasks from backend
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/login');
        return;
      }
      // Build query params for filtering and sorting
      const params = new URLSearchParams();
      
      if (filterCompleted !== null) {
        params.append('completed', filterCompleted ? 'true' : 'false');
      }
      
      if (filterPriority !== 'all') {
        params.append('priority', filterPriority);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      // Map frontend field names to backend field names for ordering
      const orderingField = sortField === 'dueDate' ? 'due_date' : (sortField as string);
      params.append('ordering', `${sortDirection === 'desc' ? '-' : ''}${orderingField}`);
      
      const headers = getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/tasks/?${params.toString()}`, { headers });
      
      // Map due_date to dueDate for each task
      const mappedTasks = response.data.map((task: any) => ({
        ...task,
        dueDate: task.due_date,
      }));
      setTasks(mappedTasks);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      if (err?.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setTimeout(() => navigate('/login'), 500);
      } else {
        setError('Failed to load tasks. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Add new task
  const addTask = async (taskData: Omit<Task, 'id'>) => {
    try {
      // Map dueDate to due_date for backend compatibility (omit dueDate)
      const { dueDate, ...rest } = taskData;
      const backendTaskData = { ...rest, due_date: dueDate };
      
      // Debug logging removed
      
      const headers = getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/tasks/`, backendTaskData, { headers });
      
      // Map due_date to dueDate for the new task
      const newTask = { ...response.data, dueDate: response.data.due_date };
      setTasks([...tasks, newTask]);
      setIsFormOpen(false);
    } catch (err: any) {
      console.error('Error adding task:', err);
      setError('Failed to add task. Please try again.');
    }
  };

  // Update existing task
  const updateTask = async (taskData: Omit<Task, 'id'>) => {
    if (!editingTask) return;
    
    try {
      // Map dueDate to due_date for backend compatibility (omit dueDate)
      const { dueDate, ...rest } = taskData;
      const backendTaskData = { ...rest, due_date: dueDate };
      const response = await axios.put(`${API_BASE_URL}/tasks/${editingTask.id}/`, backendTaskData, { headers: getAuthHeaders() });
      // Map due_date to dueDate for the updated task
      const updatedTask = { ...response.data, dueDate: response.data.due_date };
      setTasks(tasks.map(task => task.id === editingTask.id ? updatedTask : task));
      setEditingTask(undefined);
      setIsFormOpen(false);
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task. Please try again.');
    }
  };

  // Show modal and set task id to delete
  const handleDeleteClick = (id: number) => {
    setDeleteTaskId(id);
    setDeleteModalOpen(true);
  };

  // Confirm deletion
  const confirmDeleteTask = async () => {
    if (deleteTaskId === null) return;
    try {
      await axios.delete(`${API_BASE_URL}/tasks/${deleteTaskId}/`, { headers: getAuthHeaders() });
      setTasks(tasks.filter(task => task.id !== deleteTaskId));
      setDeleteTaskId(null);
      setDeleteModalOpen(false);
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task. Please try again.');
      setDeleteModalOpen(false);
    }
  };

  // Toggle task completion
  const toggleTaskCompletion = async (id: number) => {
    const taskToToggle = tasks.find(task => task.id === id);
    if (!taskToToggle) return;
    
    try {
      const response = await axios.patch(`${API_BASE_URL}/tasks/${id}/`, {
        completed: !taskToToggle.completed
      }, { headers: getAuthHeaders() });
      const updated = { ...response.data, dueDate: response.data.due_date };
      setTasks(tasks.map(task => task.id === id ? updated : task));
    } catch (err: any) {
      console.error('Error toggling task completion:', err);
      
      // Handle validation error for task completion
      if (err.response?.data?.completed) {
        setError(err.response.data.completed);
        // Show the error for 5 seconds then clear it
        setTimeout(() => setError(null), 5000);
      } else {
        setError('Failed to update task. Please try again.');
      }
    }
  };

  // Handle form submission
  const handleSubmit = (taskData: Omit<Task, 'id'>) => {
    if (editingTask) {
      updateTask(taskData);
    } else {
      addTask(taskData);
    }
  };

  // Handle sort
  const handleSort = (field: keyof Task) => {
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

  // Filtered tasks for tabs
  const incompleteTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);
  const displayedTasks = activeTab === 'tasks' ? incompleteTasks : completedTasks;

  // Show loading state while waiting for user data
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        <div className="max-w-7xl mx-auto">
          {/* Header section */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Tasks
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Manage and track your tasks
              </p>
            </div>
            {/* Right side: TaskFilters and Add Task button horizontally aligned */}
            <div className="flex items-center gap-4">
              <TaskFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filterCompleted={filterCompleted}
                onFilterCompletedChange={setFilterCompleted}
                filterPriority={filterPriority}
                onFilterPriorityChange={setFilterPriority}
                onResetFilters={() => {
                  setSearchTerm('');
                  setFilterCompleted(null);
                  setFilterPriority('all');
                }}
              />
              <button
                className="inline-flex items-center h-10 min-w-[140px] px-4 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={() => {
                  setEditingTask(undefined);
                  setIsFormOpen(true);
                }}
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Task
              </button>
            </div>
          </div>

          {/* Task summary */}
          <TaskSummary tasks={tasks} />

          {/* Tabs for Tasks and Completed (styled like Decks/Notes/Schedule) */}
          <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-6">
            <button
              className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeTab === 'tasks'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
              onClick={() => setActiveTab('tasks')}
            >
              Tasks
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeTab === 'completed'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
              onClick={() => setActiveTab('completed')}
            >
              Completed
            </button>
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
              }}
            />
          )}

          {/* Tasks list */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-6 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Loading tasks...</p>
              </div>
            ) : displayedTasks.length === 0 ? (
              <div className="p-6 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tasks found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm || filterCompleted !== null || filterPriority !== 'all'
                    ? 'Try changing your search or filter criteria.'
                    : 'Get started by creating a new task.'}
                </p>
                {!searchTerm && filterCompleted === null && filterPriority === 'all' && (
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
              <TaskList
                tasks={displayedTasks}
                onToggleComplete={toggleTaskCompletion}
                onEdit={(task) => {
                  setEditingTask(task);
                  setIsFormOpen(true);
                }}
                onDelete={handleDeleteClick}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                onAddTask={() => {
                  setEditingTask(undefined);
                  setIsFormOpen(true);
                }}
              />
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
    </PageLayout>
  );
};

export default Tasks;
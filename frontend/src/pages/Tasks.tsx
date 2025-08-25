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
  const [filterTaskCategory, setFilterTaskCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // State for delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);



  // State for tabs
  const [activeTab, setActiveTab] = useState<'tasks' | 'categories' | 'completed'>('tasks');

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
  }, [searchTerm, filterCompleted, filterPriority, filterTaskCategory, sortField, sortDirection]);



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
      if (filterTaskCategory) {
        params.append('task_category', filterTaskCategory);
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

  // Handle task completion from evidence submission
  const handleTaskCompleted = (completedTask: any) => {
    setTasks(tasks.map(task => task.id === completedTask.id ? completedTask : task));
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
  const tasksByCategory = tasks.filter(task => !task.completed).reduce((acc, task) => {
    const category = task.task_category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(task);
    return acc;
  }, {} as Record<string, Task[]>);
  
  const displayedTasks = activeTab === 'tasks' ? incompleteTasks : 
                        activeTab === 'completed' ? completedTasks : 
                        []; // Categories tab will handle its own display

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
                filterTaskCategory={filterTaskCategory}
                onFilterTaskCategoryChange={setFilterTaskCategory}
                onResetFilters={() => {
                  setSearchTerm('');
                  setFilterCompleted(null);
                  setFilterPriority('all');
                  setFilterTaskCategory('');
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
                activeTab === 'categories'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
              onClick={() => setActiveTab('categories')}
            >
              Category
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
            ) : activeTab === 'categories' ? (
              // Categories tab display
              <div className="p-6">
                {Object.keys(tasksByCategory).length === 0 ? (
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No categories found</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Create tasks with categories to see them organized here.
                    </p>
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
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(tasksByCategory).map(([category, categoryTasks]) => {
                      const colors = getCategoryColor(category);
                      return (
                        <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                          <div className={`${colors.bg} px-4 py-2 border-b ${colors.border}`}>
                            <div className="flex items-center justify-between">
                              <h3 className={`text-lg font-semibold ${colors.text}`}>
                                {category}
                              </h3>
                              <span className={`text-sm ${colors.count}`}>
                                {categoryTasks.length} task{categoryTasks.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <div className="p-2">
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
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tasks found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm || filterCompleted !== null || filterPriority !== 'all' || filterTaskCategory
                    ? 'Try changing your search or filter criteria.'
                    : 'Get started by creating a new task.'}
                </p>
                {!searchTerm && filterCompleted === null && filterPriority === 'all' && filterTaskCategory === '' && (
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
                onTaskCompleted={handleTaskCompleted}
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
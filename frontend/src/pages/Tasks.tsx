import React, { useEffect, useState } from 'react';
import axios from 'axios'; // Make sure to install axios: npm install axios
import PageLayout from '../components/PageLayout';

// Task interface to ensure type safety
interface Task {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  category: string;
}

// API base URL - update this to match your backend location
const API_BASE_URL = 'http://localhost/api'; // Adjust to your server path

const Tasks = () => {
  const [user, setUser] = useState<any | null>(null); // User data
  const [greeting, setGreeting] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state for new/edit task
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Omit<Task, 'id'>>({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    completed: false,
    category: 'study'
  });
  
  // Sorting and filtering
  const [sortField, setSortField] = useState<keyof Task>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterCompleted, setFilterCompleted] = useState<boolean | null>(null);
  const [filterPriority, setFilterPriority] = useState<Task['priority'] | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Get user data from localStorage
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

    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
    
    // Load tasks
    fetchTasks();
  }, []);

  // Fetch tasks from backend
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    
    try {
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
      
      params.append('sort', sortField);
      params.append('dir', sortDirection);
      
      const response = await axios.get(`${API_BASE_URL}/tasks.php?${params.toString()}`);
      
      if (response.data && response.data.status === 'success') {
        // Transform API data to match our Task interface if needed
        const formattedTasks = response.data.tasks.map((task: any) => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          dueDate: task.due_date,
          priority: task.priority as 'low' | 'medium' | 'high',
          completed: Boolean(task.completed),
          category: task.category || 'other'
        }));
        
        setTasks(formattedTasks);
      } else {
        throw new Error('Failed to retrieve tasks');
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks. Please try again later.');
      
      // Fallback to localStorage if API fails
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        try {
          setTasks(JSON.parse(savedTasks));
          setError('Using cached tasks. Connection to server failed.');
        } catch (e) {
          console.error('Error parsing cached tasks:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Add new task
  const addTask = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/tasks.php`, {
        ...formData,
        // Format fields to match backend expectations
        dueDate: formData.dueDate
      });
      
      if (response.data && response.data.status === 'success') {
        // Refresh tasks list
        fetchTasks();
        resetForm();
      } else {
        throw new Error('Failed to add task');
      }
    } catch (err) {
      console.error('Error adding task:', err);
      setError('Failed to add task. Please try again.');
      
      // Fallback to localStorage if API fails
      const newTask: Task = {
        id: Date.now(),
        ...formData
      };
      
      const updatedTasks = [...tasks, newTask];
      setTasks(updatedTasks);
      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
      resetForm();
    }
  };

  // Update existing task
  const updateTask = async () => {
    if (editingTaskId === null) return;
    
    try {
      const response = await axios.put(`${API_BASE_URL}/tasks.php?id=${editingTaskId}`, {
        ...formData,
        // Format fields to match backend expectations
        dueDate: formData.dueDate
      });
      
      if (response.data && response.data.status === 'success') {
        // Refresh tasks list
        fetchTasks();
        resetForm();
      } else {
        throw new Error('Failed to update task');
      }
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task. Please try again.');
      
      // Fallback to localStorage if API fails
      const updatedTasks = tasks.map(task => 
        task.id === editingTaskId ? { ...formData, id: editingTaskId } : task
      );
      
      setTasks(updatedTasks);
      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
      resetForm();
    }
  };

  // Delete task
  const deleteTask = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const response = await axios.delete(`${API_BASE_URL}/tasks.php?id=${id}`);
      
      if (response.data && response.data.status === 'success') {
        // Refresh tasks list
        fetchTasks();
      } else {
        throw new Error('Failed to delete task');
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task. Please try again.');
      
      // Fallback to localStorage if API fails
      const updatedTasks = tasks.filter(task => task.id !== id);
      setTasks(updatedTasks);
      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    }
  };

  // Toggle task completion
  const toggleTaskCompletion = async (id: number) => {
    // Find the task to toggle
    const taskToToggle = tasks.find(task => task.id === id);
    if (!taskToToggle) return;
    
    try {
      const response = await axios.put(`${API_BASE_URL}/tasks.php?id=${id}`, {
        completed: !taskToToggle.completed
      });
      
      if (response.data && response.data.status === 'success') {
        // Refresh tasks list
        fetchTasks();
      } else {
        throw new Error('Failed to update task completion status');
      }
    } catch (err) {
      console.error('Error toggling task completion:', err);
      setError('Failed to update task. Please try again.');
      
      // Fallback to localStorage if API fails
      const updatedTasks = tasks.map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
      );
      setTasks(updatedTasks);
      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    }
  };

  // Apply filters and refresh data
  const applyFilters = () => {
    fetchTasks();
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Reset form and close it
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'medium',
      completed: false,
      category: 'study'
    });
    setEditingTaskId(null);
    setIsFormOpen(false);
  };

  // Open edit form with task data
  const openEditForm = (task: Task) => {
    setFormData({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
      completed: task.completed,
      category: task.category
    });
    setEditingTaskId(task.id);
    setIsFormOpen(true);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTaskId === null) {
      addTask();
    } else {
      updateTask();
    }
  };

  // Handle sort and trigger refetch
  const handleSort = (field: keyof Task) => {
    // Toggle sort direction if same field
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    
    // Refetch with new sort params on next render
    setTimeout(() => {
      fetchTasks();
    }, 0);
  };

  // Local filtering for tasks that are already loaded (for responsive UI)
  const filteredTasks = tasks.filter(task => {
    // Filter by search term even before sending to API
    if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !task.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Show loading state while waiting for user data
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Get counts for the summary
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const highPriorityTasks = tasks.filter(task => task.priority === 'high' && !task.completed).length;
  
  // Calculate tasks due today
  const today = new Date().toISOString().split('T')[0];
  const dueToday = tasks.filter(task => task.dueDate === today && !task.completed).length;

  return (
    <PageLayout>
      <div className="space-y-6">
        <div className="max-w-7xl mx-auto">
          {/* Header section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Tasks
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {greeting}, {user.username}!
            </p>
          </div>
          
          {/* Task summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Total Tasks</h3>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{totalTasks}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Completed</h3>
              <p className="text-3xl font-bold text-green-500 dark:text-green-400">{completedTasks}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Pending</h3>
              <p className="text-3xl font-bold text-yellow-500 dark:text-yellow-400">{pendingTasks}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Due Today</h3>
              <p className="text-3xl font-bold text-red-500 dark:text-red-400">{dueToday}</p>
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
          
          {/* Controls bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
            <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              {/* Search input */}
              <div className="w-full sm:w-auto">
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="text"
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white pl-10 pr-3 py-2 text-sm"
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Filter controls */}
              <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                {/* Status filter */}
                <select
                  className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white py-2 text-sm"
                  value={filterCompleted === null ? 'all' : (filterCompleted ? 'completed' : 'pending')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'all') setFilterCompleted(null);
                    else setFilterCompleted(val === 'completed');
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
                
                {/* Priority filter */}
                <select
                  className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white py-2 text-sm"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as Task['priority'] | 'all')}
                >
                  <option value="all">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                
                {/* Apply filters button */}
                <button
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={applyFilters}
                >
                  Apply Filters
                </button>
              </div>
              
              {/* Add task button */}
              <button
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={() => setIsFormOpen(true)}
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Task
              </button>
            </div>
          </div>
          
          {/* Task form modal */}
          {isFormOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 mx-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {editingTaskId ? 'Edit Task' : 'Add New Task'}
                </h2>
                
                <form onSubmit={handleSubmit}>
                  {/* Title */}
                  <div className="mb-4">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Title
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formData.title}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  {/* Description */}
                  <div className="mb-4">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  {/* Due Date */}
                  <div className="mb-4">
                    <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Due Date
                    </label>
                    <input
                      type="date"
                      id="dueDate"
                      name="dueDate"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formData.dueDate}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  {/* Priority */}
                  <div className="mb-4">
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Priority
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formData.priority}
                      onChange={handleInputChange}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  {/* Category */}
                  <div className="mb-4">
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formData.category}
                      onChange={handleInputChange}
                    >
                      <option value="work">Work</option>
                      <option value="personal">Personal</option>
                      <option value="study">Study</option>
                      <option value="health">Health</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  {/* Completed (only show in edit mode) */}
                  {editingTaskId !== null && (
                    <div className="flex items-center mb-4">
                      <input
                        id="completed"
                        name="completed"
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        checked={formData.completed}
                        onChange={(e) => setFormData({ ...formData, completed: e.target.checked })}
                      />
                      <label htmlFor="completed" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Mark as completed
                      </label>
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={resetForm}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      {editingTaskId ? 'Update Task' : 'Add Task'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {/* Tasks list */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-6 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Loading tasks...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
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
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        <span className="sr-only">Status</span>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('title')}
                      >
                        <div className="flex items-center">
                          <span>Title</span>
                          {sortField === 'title' && (
                            <svg className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              {sortDirection === 'asc' ? (
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              ) : (
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                              )}
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('dueDate')}
                      >
                        <div className="flex items-center">
                          <span>Due Date</span>
                          {sortField === 'dueDate' && (
                            <svg className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              {sortDirection === 'asc' ? (
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              ) : (
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                              )}
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('priority')}
                      >
                        <div className="flex items-center">
                          <span>Priority</span>
                          {sortField === 'priority' && (
                            <svg className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              {sortDirection === 'asc' ? (
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              ) : (
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                              )}
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('category')}
                      >
                        <div className="flex items-center">
                          <span>Category</span>
                          {sortField === 'category' && (
                            <svg className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              {sortDirection === 'asc' ? (
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              ) : (
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                              )}
                            </svg>
                          )}
                        </div>
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredTasks.map((task) => (
                      <tr key={task.id} className={task.completed ? 'bg-gray-50 dark:bg-gray-700/50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              checked={task.completed}
                              onChange={() => toggleTaskCompletion(task.id)}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className={`text-sm font-medium ${task.completed ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                              {task.title}
                            </div>
                            {task.description && (
                              <div className={`text-sm ${task.completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-500 dark:text-gray-400'}`}>
                                {task.description.length > 100 
                                  ? `${task.description.substring(0, 100)}...` 
                                  : task.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${task.completed ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            task.priority === 'high' 
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' 
                              : task.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          }`}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                            onClick={() => openEditForm(task)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            onClick={() => deleteTask(task.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Tasks;
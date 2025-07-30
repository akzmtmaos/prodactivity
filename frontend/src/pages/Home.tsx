// Home.tsx - Modified version
import React, { useEffect, useState } from 'react';
import { Clock, Calendar, BookOpen, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavbar } from '../context/NavbarContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Task } from '../types/task';
import { ScheduleEvent } from '../types/schedule';
import { format } from 'date-fns';

interface User {
  username: string;
  email?: string;
  id?: number;
  [key: string]: any; // Allow for other properties
}

interface Note {
  id: number;
  title: string;
  content: string;
  notebook: number;
  notebook_name: string;
  created_at: string;
  updated_at: string;
  last_visited?: string;
  is_deleted: boolean;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api/notes';

const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(true);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const { isCollapsed } = useNavbar();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [notesCount, setNotesCount] = useState<number>(0);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch recent notes function
  const fetchRecentNotes = async () => {
    try {
      console.log('Fetching recent notes...');
      const response = await axios.get(`${API_URL}/notes/`, {
        headers: getAuthHeaders()
      });
      
      console.log('Received notes:', response.data);
      
      if (!Array.isArray(response.data)) {
        console.error('Invalid response format:', response.data);
        return;
      }

      // Sort notes by last_visited or updated_at, ensuring last_visited is properly handled
      const sortedNotes = response.data
        .filter((note: Note) => !note.is_deleted) // Filter out deleted notes
        .sort((a: Note, b: Note) => {
          // Convert dates to timestamps, defaulting to updated_at if last_visited is null
          const dateA = a.last_visited ? new Date(a.last_visited).getTime() : new Date(a.updated_at).getTime();
          const dateB = b.last_visited ? new Date(b.last_visited).getTime() : new Date(b.updated_at).getTime();
          return dateB - dateA; // Sort in descending order (most recent first)
        })
        .slice(0, 8); // Get the 8 most recent notes
      
      console.log('Sorted and filtered notes:', sortedNotes);
      setRecentNotes(sortedNotes);
    } catch (error) {
      console.error('Failed to fetch recent notes:', error);
      if (axios.isAxiosError(error)) {
        console.error('Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
    }
  };

  // Fetch current tasks (incomplete, soonest due)
  const fetchTasks = async () => {
    setTasksLoading(true);
    try {
      const API_BASE_URL = 'http://localhost:8000/api';
      const params = new URLSearchParams();
      params.append('completed', 'false');
      params.append('ordering', 'dueDate');
      const response = await axios.get(`${API_BASE_URL}/tasks/?${params.toString()}`, { headers: getAuthHeaders() });
      // Map due_date to dueDate for each task
      const mappedTasks = response.data.map((task: any) => ({
        ...task,
        dueDate: task.due_date,
      }));
      // Sort by dueDate ascending, take top 5
      const sorted = mappedTasks
        .filter((t: Task) => !t.completed)
        .sort((a: Task, b: Task) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 5);
      setTasks(sorted);
    } catch (err) {
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  // Load upcoming events from localStorage
  const loadEvents = () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        setEvents([]);
        return;
      }
      const { username } = JSON.parse(userData);
      const savedEvents = localStorage.getItem(`scheduleEvents_${username}`);
      if (savedEvents) {
        const parsedEvents = JSON.parse(savedEvents).map((event: any) => ({
          ...event,
          date: new Date(event.date)
        }));
        // Only future events, sorted by date, top 5
        const now = new Date();
        const upcoming = parsedEvents
          .filter((e: ScheduleEvent) => new Date(e.date) >= now)
          .sort((a: ScheduleEvent, b: ScheduleEvent) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 5);
        setEvents(upcoming);
      } else {
        setEvents([]);
      }
    } catch (e) {
      setEvents([]);
    }
  };

  // Fetch total notes count for the user
  const fetchNotesCount = async () => {
    try {
      const response = await axios.get(`${API_URL}/notes/`, {
        headers: getAuthHeaders()
      });
      if (Array.isArray(response.data)) {
        setNotesCount(response.data.length);
      } else if (response.data && typeof response.data.count === 'number') {
        setNotesCount(response.data.count);
      } else {
        setNotesCount(0);
      }
    } catch (error) {
      setNotesCount(0);
    }
  };

  // Slider navigation functions
  const nextSlide = () => {
    const maxSlides = Math.ceil(recentNotes.length / 4) - 1;
    setCurrentSlide(prev => prev < maxSlides ? prev + 1 : 0);
  };

  const prevSlide = () => {
    const maxSlides = Math.ceil(recentNotes.length / 4) - 1;
    setCurrentSlide(prev => prev > 0 ? prev - 1 : maxSlides);
  };

  useEffect(() => {
    // Set greeting based on time of day first (doesn't depend on user)
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
    
    // Improved user data handling with retry mechanism
    const getUserData = () => {
      console.log("Home: Checking local storage for user data");
      const userData = localStorage.getItem("user");
      
      if (userData && userData !== "undefined") {
        try {
          const parsedUser = JSON.parse(userData);
          
          // Check for the username directly OR if user object exists in response
          if (parsedUser && typeof parsedUser === 'object') {
            // If username exists directly in parsed object
            if (parsedUser.username) {
              console.log("Home: Valid user found:", parsedUser.username);
              setUser(parsedUser);
              setLoading(false);
              return true;
            } 
            // If there's a nested user object (from login response)
            else if (parsedUser.user && parsedUser.user.username) {
              console.log("Home: Valid user found in nested object:", parsedUser.user.username);
              setUser(parsedUser.user);
              setLoading(false);
              return true;
            }
          }
          console.error("Home: User data missing required fields");
        } catch (e) {
          console.error("Home: Error parsing user data:", e);
        }
      } else {
        console.log("Home: No user data found");
      }
      
      return false;
    };

    // First attempt
    const success = getUserData();
    
    // If first attempt fails, try again after a short delay (gives login time to complete)
    if (!success) {
      const retryTimer = setTimeout(() => {
        console.log("Home: Retrying to get user data...");
        if (!getUserData()) {
          // If still no success, stop loading state
          setLoading(false);
          setUser(null);
        }
      }, 1000);
      
      return () => clearTimeout(retryTimer);
    }

    // Initial fetch of recent notes
    fetchRecentNotes();
    fetchTasks();
    loadEvents();
    fetchNotesCount();

    // Set up periodic refresh of recent notes
    const refreshInterval = setInterval(() => {
      fetchRecentNotes();
      fetchTasks();
      loadEvents();
      fetchNotesCount();
    }, 30000); // Refresh every 30 seconds

    // Set up event listener for note updates
    const handleNoteUpdate = () => {
      console.log('Note update event received, refreshing recent notes...');
      fetchRecentNotes();
    };

    window.addEventListener('noteUpdated', handleNoteUpdate);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('noteUpdated', handleNoteUpdate);
    };
  }, []);

  const handleOpenNote = async (noteId: number) => {
    try {
      console.log('Opening note:', noteId);
      // Update the last_visited timestamp
      const response = await axios.patch(`${API_URL}/notes/${noteId}/`, {
        last_visited: new Date().toISOString()
      }, {
        headers: getAuthHeaders()
      });
      
      console.log('Visit update response:', response.data);
      
      // Navigate to notes page with the note ID as a query parameter
      navigate(`/notes?note=${noteId}`);
      // Store the note ID in localStorage to be picked up by Notes component
      localStorage.setItem('openNoteId', noteId.toString());
      
      // Dispatch event to notify that a note has been updated
      window.dispatchEvent(new Event('noteUpdated'));
      
      // Refresh the recent notes list
      fetchRecentNotes();
    } catch (error) {
      console.error('Failed to update note visit timestamp:', error);
      if (axios.isAxiosError(error)) {
        console.error('Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      // Still navigate to the note even if the visit update fails
      navigate(`/notes?note=${noteId}`);
      localStorage.setItem('openNoteId', noteId.toString());
    }
  };

  // Compute dynamic stats
  const studyHours = events
    .filter(e => e.category === 'study')
    .reduce((sum, e) => {
      // If startTime and endTime are available, sum durations in hours
      if (e.startTime && e.endTime) {
        const [sh, sm] = e.startTime.split(':').map(Number);
        const [eh, em] = e.endTime.split(':').map(Number);
        let diff = (eh + em / 60) - (sh + sm / 60);
        if (diff < 0) diff = 0; // Prevent negative
        return sum + diff;
      }
      return sum;
    }, 0);

  const tasksCompleted = tasks.length > 0
    ? tasks.filter(t => t.completed).length
    : 0;

  // If we want all completed tasks, not just the top 5, we need to fetch all tasks. For now, use the available tasks array.

  const upcomingEventsCount = events.length;

  // Show loading state while waiting for user data
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Show error state if user is null
  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="p-6 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg mb-4">
          Unable to load user data. Please try logging in again.
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen">
      <div className={`px-4 py-6 sm:px-6 lg:px-8 transition-[margin] duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'} pb-32 md:pb-6 pt-20 md:pt-6`}>
        <div className="max-w-7xl mx-auto">
          {/* Greeting section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {greeting}, <span className="text-indigo-600 dark:text-indigo-400">{user?.username}</span>
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Here's your productivity overview for today
            </p>
          </div>

          {/* Dynamic Stats grid - 2x2 on mobile, 4 columns on desktop */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
            <div className="bg-white dark:bg-gray-800 overflow-hidden rounded-lg shadow transition hover:shadow-md">
              <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-md p-2 sm:p-3 bg-gray-100 dark:bg-gray-700">
                    <Clock size={16} className="sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="ml-3 sm:ml-5">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Study Hours</p>
                    <p className="mt-1 text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white">{studyHours.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 overflow-hidden rounded-lg shadow transition hover:shadow-md">
              <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-md p-2 sm:p-3 bg-gray-100 dark:bg-gray-700">
                    <CheckSquare size={16} className="sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-3 sm:ml-5">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Tasks Completed</p>
                    <p className="mt-1 text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white">{tasksCompleted}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 overflow-hidden rounded-lg shadow transition hover:shadow-md">
              <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-md p-2 sm:p-3 bg-gray-100 dark:bg-gray-700">
                    <BookOpen size={16} className="sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-3 sm:ml-5">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Notes Created</p>
                    <p className="mt-1 text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white">{notesCount}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 overflow-hidden rounded-lg shadow transition hover:shadow-md">
              <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-md p-2 sm:p-3 bg-gray-100 dark:bg-gray-700">
                    <Calendar size={16} className="sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-3 sm:ml-5">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Upcoming Events</p>
                    <p className="mt-1 text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white">{upcomingEventsCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Notes History section with horizontal slider */}
          <div className="mt-8 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                Quick Notes History
              </h2>
              {/* Show navigation only on mobile when there are more than 4 notes */}
              <div className="md:hidden">
                {recentNotes.length > 4 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={prevSlide}
                      className="p-1 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="p-1 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Mobile: Horizontal slider (4 notes) */}
            <div className="md:hidden relative overflow-hidden">
              <div className="flex transition-transform duration-300 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                {recentNotes.length > 0 ? (
                  recentNotes.map((note) => (
                    <div 
                      key={note.id} 
                      className="flex-shrink-0 w-1/4 px-1"
                    >
                      <div 
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer aspect-square flex flex-col min-w-[100px]"
                        onClick={() => handleOpenNote(note.id)}
                      >
                        <div className="p-2 flex-1 flex flex-col items-center justify-center text-center">
                          <div className="mb-1 p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                            <BookOpen size={14} className="text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <h3 className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2 px-1">
                            {note.title || 'Untitled Note'}
                          </h3>
                          {note.notebook_name && (
                            <span className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 px-1">
                              {note.notebook_name}
                            </span>
                          )}
                          {(note.last_visited || note.updated_at) && (
                            <span className="mt-1 text-[8px] text-gray-400 dark:text-gray-500 line-clamp-1 px-1">
                              {format(new Date(note.last_visited || note.updated_at), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 text-center">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <BookOpen size={16} className="text-gray-400 dark:text-gray-500" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">No recent notes found</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Desktop: Original grid layout (8 notes) */}
            <div className="hidden md:block">
              <div className="grid grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                {recentNotes.length > 0 ? (
                  recentNotes.slice(0, 8).map((note) => (
                    <div 
                      key={note.id} 
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer aspect-square flex flex-col min-w-[100px]"
                      onClick={() => handleOpenNote(note.id)}
                    >
                      <div className="p-2 flex-1 flex flex-col items-center justify-center text-center">
                        <div className="mb-1 p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                          <BookOpen size={14} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2 px-1">
                          {note.title || 'Untitled Note'}
                        </h3>
                        {note.notebook_name && (
                          <span className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 px-1">
                            {note.notebook_name}
                          </span>
                        )}
                        {(note.last_visited || note.updated_at) && (
                          <span className="mt-1 text-[8px] text-gray-400 dark:text-gray-500 line-clamp-1 px-1">
                            {format(new Date(note.last_visited || note.updated_at), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 text-center">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <BookOpen size={16} className="text-gray-400 dark:text-gray-500" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">No recent notes found</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Slider indicators - only on mobile */}
            <div className="md:hidden">
              {recentNotes.length > 4 && (
                <div className="flex justify-center mt-4 space-x-2">
                  {Array.from({ length: Math.ceil(recentNotes.length / 4) }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        currentSlide === index 
                          ? 'bg-indigo-600 dark:bg-indigo-400' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Two-column layout for Tasks and Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Tasks section (left) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Current Tasks</h2>
                <a href="/tasks" className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline font-medium">View Tasks</a>
              </div>
              <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg shadow flex flex-col p-4">
                <div className="flex-1 overflow-y-auto">
                  {tasksLoading ? (
                    <div className="text-gray-500 dark:text-gray-400">Loading tasks...</div>
                  ) : tasks.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {tasks.map((task) => (
                        <div key={task.id} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-3 flex flex-col justify-between min-h-[90px]">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              task.priority === 'high'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                : task.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            }`}>
                              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              {format(new Date(task.dueDate), 'MMM d')}
                            </span>
                          </div>
                          <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                            {task.title}
                          </div>
                          {task.category && (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg shadow-sm p-4 text-center text-gray-500 dark:text-gray-400">
                      No current tasks found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Schedule section (right) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Upcoming Events</h2>
                <a href="/schedule" className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline font-medium">View Schedule</a>
              </div>
              <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg shadow flex flex-col p-4">
                <div className="flex-1 overflow-y-auto">
                  {events.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {events.map((event) => (
                        <div key={event.id} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-3 flex flex-col justify-between min-h-[90px]">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              event.category === 'study'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : event.category === 'assignment'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : event.category === 'exam'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : event.category === 'meeting'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              {format(new Date(event.date), 'MMM d')}, {event.startTime} - {event.endTime}
                            </span>
                          </div>
                          <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                            {event.title}
                          </div>
                          {event.description && (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                              {event.description.length > 40 ? `${event.description.substring(0, 40)}...` : event.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg shadow-sm p-4 text-center text-gray-500 dark:text-gray-400">
                      No upcoming events found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
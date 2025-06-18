// Home.tsx - Modified version
import React, { useEffect, useState } from 'react';
import { Clock, Calendar, BookOpen, CheckSquare } from 'lucide-react';
import { useNavbar } from '../context/NavbarContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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
  category: number;
  category_name: string;
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

    // Set up periodic refresh of recent notes
    const refreshInterval = setInterval(fetchRecentNotes, 30000); // Refresh every 30 seconds

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

  // Mock data for dashboard
  const stats = [
    { id: 1, name: 'Study Hours', value: '12.5', icon: <Clock size={20} className="text-indigo-600 dark:text-indigo-400" /> },
    { id: 2, name: 'Tasks Completed', value: '24', icon: <CheckSquare size={20} className="text-green-600 dark:text-green-400" /> },
    { id: 3, name: 'Notes Created', value: '15', icon: <BookOpen size={20} className="text-blue-600 dark:text-blue-400" /> },
    { id: 4, name: 'Upcoming Events', value: '3', icon: <Calendar size={20} className="text-purple-600 dark:text-purple-400" /> },
  ];

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
      <div className={`px-4 py-6 sm:px-6 lg:px-8 transition-[margin] duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'} pb-32 md:pb-6 md:pt-6`}>
        <div className="max-w-7xl mx-auto">
          {/* Greeting section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {greeting}, <span className="text-indigo-600 dark:text-indigo-400">{user?.username}</span>
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
              Here's your productivity overview for today
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.id}
                className="bg-white dark:bg-gray-800 overflow-hidden rounded-lg shadow transition hover:shadow-md"
              >
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 rounded-md p-3 bg-gray-100 dark:bg-gray-700">
                      {stat.icon}
                    </div>
                    <div className="ml-5">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {stat.name}
                      </p>
                      <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Notes History section */}
          <div className="mt-8 mb-16">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              Quick Notes History
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {recentNotes.length > 0 ? (
                recentNotes.map((note) => (
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
                      {note.category_name && (
                        <span className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 px-1">
                          {note.category_name}
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
        </div>
      </div>
    </div>
  );
};

export default Home;
// Home.tsx - Modified version
import React, { useEffect, useState } from 'react';
import { Clock, Calendar, BookOpen, CheckSquare, ChevronLeft, ChevronRight, Search, X, FileText, Target, CheckCircle } from 'lucide-react';
import { useNavbar } from '../context/NavbarContext';
import axios from 'axios';
import axiosInstance from '../utils/axiosConfig';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { Task } from '../types/task';
import { ScheduleEvent } from '../types/schedule';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { API_BASE_URL } from '../config/api';

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

interface Deck {
  id: string;
  title: string;
  flashcardCount: number;
  progress: number;
  created_at: string;
  updated_at: string;
}

interface SearchResult {
  id: string;
  type: 'note' | 'deck' | 'task' | 'system';
  title: string;
  content?: string;
  description?: string;
  url: string;
  icon: React.ReactNode;
  category: string;
  timestamp?: string;
}

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const refreshTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Home now uses shared PageLayout for consistent spacing and transitions

  // Debounced refresh function to prevent rapid successive calls
  const debouncedRefresh = () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    refreshTimeoutRef.current = setTimeout(() => {
      if (user && !loading) {
        console.log('🔄 Debounced refresh triggered');
        fetchRecentNotes();
        fetchTasks();
        fetchCompletedTasksCount();
        loadEvents();
        fetchNotesCount();
      }
    }, 1000); // Wait 1 second before refreshing
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
    // Array of color combinations for categories
    const colorCombinations = [
      { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-800 dark:text-blue-400' },
      { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-400' },
      { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-800 dark:text-purple-400' },
      { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-800 dark:text-orange-400' },
      { bg: 'bg-pink-100 dark:bg-pink-900/20', text: 'text-pink-800 dark:text-pink-400' },
      { bg: 'bg-indigo-100 dark:bg-indigo-900/20', text: 'text-indigo-800 dark:text-indigo-400' },
      { bg: 'bg-teal-100 dark:bg-teal-900/20', text: 'text-teal-800 dark:text-teal-400' },
      { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-400' },
      { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-400' },
      { bg: 'bg-cyan-100 dark:bg-cyan-900/20', text: 'text-cyan-800 dark:text-cyan-400' }
    ];

    const hash = getCategoryColorHash(category);
    const colorIndex = hash % colorCombinations.length;
    return colorCombinations[colorIndex];
  };

  // Get available filter options based on search results
  const getAvailableFilters = () => {
    const categories = new Set(searchResults.map(result => result.category));
    return [
      { key: 'all', label: 'All', count: searchResults.length },
      ...Array.from(categories).map(category => ({
        key: category.toLowerCase(),
        label: category,
        count: searchResults.filter(result => result.category === category).length
      }))
    ];
  };

  // Filter search results based on active filter
  const getFilteredResults = () => {
    if (activeFilter === 'all') {
      return searchResults;
    }
    return searchResults.filter(result => result.category.toLowerCase() === activeFilter);
  };

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Search across all system components
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      const results: SearchResult[] = [];
      const searchTerm = query.toLowerCase();

      // Search Notes
      try {
        const notesResponse = await axiosInstance.get(`/notes/?search=${encodeURIComponent(query)}`);
        
        const notesData = notesResponse.data.results || notesResponse.data;
        if (Array.isArray(notesData)) {
          notesData.forEach((note: Note) => {
            results.push({
              id: note.id.toString(),
              type: 'note',
              title: note.title || 'Untitled Note',
              content: note.content,
              description: `${note.notebook_name} • ${format(new Date(note.updated_at), 'MMM d, yyyy')}`,
              url: `/notes?note=${note.id}`,
              icon: <FileText className="w-4 h-4" />,
              category: 'Notes',
              timestamp: note.updated_at
            });
          });
        }
      } catch (error) {
        console.error('Error searching notes:', error);
      }

      // Search Decks
      try {
        const decksResponse = await axiosInstance.get(`/decks/decks/?search=${encodeURIComponent(query)}`);
        
        const decksData = decksResponse.data.results || decksResponse.data;
        if (Array.isArray(decksData)) {
          decksData.forEach((deck: Deck) => {
            results.push({
              id: deck.id,
              type: 'deck',
              title: deck.title,
              description: `${deck.flashcardCount} cards • ${deck.progress}% progress`,
              url: `/decks/${deck.id}`,
              icon: <Target className="w-4 h-4" />,
              category: 'Flashcards',
              timestamp: deck.updated_at
            });
          });
        }
      } catch (error) {
        console.error('Error searching decks:', error);
      }

      // Search Tasks (exclude completed tasks)
      try {
        const tasksResponse = await axiosInstance.get(`/tasks/?search=${encodeURIComponent(query)}&completed=false`);
        
        const tasksData = tasksResponse.data.results || tasksResponse.data;
        if (Array.isArray(tasksData)) {
          tasksData.forEach((task: Task) => {
            results.push({
              id: task.id.toString(),
              type: 'task',
              title: task.title,
              content: task.description,
              description: `${task.priority} priority • Pending`,
              url: `/tasks`,
              icon: <CheckCircle className="w-4 h-4" />,
              category: 'Tasks',
              timestamp: task.dueDate
            });
          });
        }
      } catch (error) {
        console.error('Error searching tasks:', error);
      }

      // Add system-wide search results
      const systemResults = [
        {
          id: 'notes-page',
          type: 'system' as const,
          title: 'Notes',
          description: 'View and manage all your notes',
          url: '/notes',
          icon: <FileText className="w-4 h-4" />,
          category: 'System'
        },
        {
          id: 'decks-page',
          type: 'system' as const,
          title: 'Flashcards',
          description: 'Study with flashcards and quizzes',
          url: '/decks',
          icon: <Target className="w-4 h-4" />,
          category: 'System'
        },
        {
          id: 'tasks-page',
          type: 'system' as const,
          title: 'Tasks',
          description: 'Manage your tasks and to-dos',
          url: '/tasks',
          icon: <CheckCircle className="w-4 h-4" />,
          category: 'System'
        },
        {
          id: 'schedule-page',
          type: 'system' as const,
          title: 'Schedule',
          description: 'Plan your day and events',
          url: '/schedule',
          icon: <Calendar className="w-4 h-4" />,
          category: 'System'
        }
      ].filter(item => 
        item.title.toLowerCase().includes(searchTerm) || 
        item.description.toLowerCase().includes(searchTerm)
      );

      results.push(...systemResults);

      // Sort results by relevance and recency
      results.sort((a, b) => {
        // Prioritize exact title matches
        const aTitleMatch = a.title.toLowerCase() === searchTerm;
        const bTitleMatch = b.title.toLowerCase() === searchTerm;
        if (aTitleMatch && !bTitleMatch) return -1;
        if (!aTitleMatch && bTitleMatch) return 1;
        
        // Then by type (system items first)
        if (a.type === 'system' && b.type !== 'system') return -1;
        if (a.type !== 'system' && b.type === 'system') return 1;
        
        // Then by timestamp (newer first)
        if (a.timestamp && b.timestamp) {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        
        return 0;
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };



  // Handle search input changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showSearchResults) return;

      const filteredResults = getFilteredResults();

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedResultIndex(prev => 
            prev < filteredResults.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedResultIndex(prev => 
            prev > 0 ? prev - 1 : filteredResults.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedResultIndex >= 0 && selectedResultIndex < filteredResults.length) {
            handleResultClick(filteredResults[selectedResultIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          closeSearchResults();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSearchResults, searchResults, selectedResultIndex, activeFilter]);

  // Reset selected index when search results change
  useEffect(() => {
    setSelectedResultIndex(-1);
  }, [searchResults]);

  // Reset filter when search results change
  useEffect(() => {
    setActiveFilter('all');
  }, [searchResults]);

  // Handle global search shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        // Check if click is outside the search container
        const searchContainer = searchInputRef.current.closest('.relative');
        if (searchContainer && !searchContainer.contains(event.target as Node)) {
          // Check if the click is on a filter button or search result
          const target = event.target as HTMLElement;
          const isFilterButton = target.closest('[data-filter-button]');
          const isSearchResult = target.closest('[data-search-result]');
          
          // Only close if it's not a filter button or search result
          if (!isFilterButton && !isSearchResult) {
            setShowSearchResults(false);
          }
        }
      }
    };

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchResults]);

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'note') {
      // For notes, navigate and set the note ID in localStorage
      localStorage.setItem('openNoteId', result.id);
      navigate(result.url);
    } else {
      navigate(result.url);
    }
    
    // Close dropdown and clear search after navigation
    setTimeout(() => {
      setShowSearchResults(false);
      setSearchQuery('');
    }, 50);
  };

  // Close search results
  const closeSearchResults = () => {
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults([]);
    setActiveFilter('all');
  };

  // Fetch recent notes function
  const fetchRecentNotes = async () => {
    try {
      console.log('Fetching recent notes...');
      console.log('Notes API URL:', `${API_BASE_URL}/notes/`);
      const response = await axiosInstance.get(`/notes/`);
      
      console.log('Received notes:', response.data);
      
      // Handle paginated response
      const notesData = response.data.results || response.data;
      
      if (!Array.isArray(notesData)) {
        console.error('Invalid response format:', notesData);
        return;
      }

      // Sort notes by the most recent of updated_at or last_visited
      const sortedNotes = notesData
        .filter((note: Note) => !note.is_deleted) // Filter out deleted notes
        .sort((a: Note, b: Note) => {
          const updatedA = new Date(a.updated_at).getTime();
          const visitedA = a.last_visited ? new Date(a.last_visited).getTime() : 0;
          const updatedB = new Date(b.updated_at).getTime();
          const visitedB = b.last_visited ? new Date(b.last_visited).getTime() : 0;
          const dateA = Math.max(updatedA, visitedA);
          const dateB = Math.max(updatedB, visitedB);
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
      // Don't clear existing notes on error - keep current data
    }
  };

      // Fetch pending tasks (incomplete, soonest due)
  const fetchTasks = async () => {
    setTasksLoading(true);
    try {
      // Get current user ID
      const userData = localStorage.getItem('user');
      if (!userData) {
        setTasks([]);
        return;
      }
      
      const user = JSON.parse(userData);
      const userId = user.id || 11; // Fallback to your user ID
      
      console.log('Fetching pending tasks from Supabase for user:', userId);
      
      // Fetch incomplete tasks from Supabase
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', false)
        .eq('is_deleted', false)
        .order('due_date', { ascending: true });
      
      if (error) {
        console.error('Supabase error fetching tasks:', error);
        // Don't clear existing tasks on error - keep current data
        return;
      }
      
      console.log('Supabase tasks response:', data);
      
      // Map due_date to dueDate for each task
      const mappedTasks = (data || []).map((task: any) => ({
        ...task,
        dueDate: task.due_date,
      }));
      
      console.log('Mapped tasks:', mappedTasks);
      
      // Take top 5 tasks
      const sorted = mappedTasks.slice(0, 5);
      console.log('Final sorted tasks:', sorted);
      setTasks(sorted);
    } catch (err) {
      console.error('Error fetching tasks from Supabase:', err);
      // Don't clear existing tasks on error - keep current data
    } finally {
      setTasksLoading(false);
    }
  };

  // Fetch completed tasks count
  const fetchCompletedTasksCount = async () => {
    try {
      const params = new URLSearchParams();
      params.append('completed', 'true');
      const response = await axiosInstance.get(`/tasks/?${params.toString()}`);
      console.log('Completed tasks response:', response.data);
      
      // Handle paginated response
      const tasksData = response.data.results || response.data;
      setCompletedTasksCount(tasksData.length);
    } catch (err) {
      console.error('Error fetching completed tasks:', err);
      setCompletedTasksCount(0);
    }
  };

  // Load upcoming events from Supabase
  const loadEvents = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        setEvents([]);
        return;
      }
      
      const user = JSON.parse(userData);
      const userId = user.id;
      
      console.log('Fetching upcoming events from Supabase for user:', userId);
      
      // Fetch upcoming events from Supabase (using start_time since there's no date column)
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', now) // Events starting from now onwards
        .order('start_time', { ascending: true })
        .limit(5);
      
      if (error) {
        console.error('Supabase error fetching events:', error);
        // Don't clear existing events on error - keep current data
        return;
      }
      
      console.log('Supabase events response:', data);
      
      // Map the events to match the ScheduleEvent interface
      const mappedEvents = (data || []).map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description || '',
        date: new Date(event.start_time), // Use start_time as the date
        startTime: new Date(event.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        endTime: new Date(event.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        category: event.category || 'other',
        endDate: event.end_time ? new Date(event.end_time) : undefined
      }));
      
      console.log('Mapped upcoming events:', mappedEvents);
      setEvents(mappedEvents);
    } catch (e) {
      console.error('Error fetching events:', e);
      // Don't clear existing events on error - keep current data
    }
  };

  // Fetch total notes count for the user
  const fetchNotesCount = async () => {
    try {
      console.log('Fetching notes count...');
      const response = await axiosInstance.get(`/notes/`);
      
      // Handle paginated response
      if (response.data && typeof response.data.count === 'number') {
        setNotesCount(response.data.count);
      } else if (Array.isArray(response.data)) {
        setNotesCount(response.data.length);
      } else if (response.data && Array.isArray(response.data.results)) {
        setNotesCount(response.data.results.length);
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
    fetchCompletedTasksCount();
    loadEvents();
    fetchNotesCount();

    // Set up periodic refresh of recent notes (reduced frequency to prevent flickering)
    const refreshInterval = setInterval(() => {
      // Only refresh if user is still active and data exists
      if (user && !loading) {
        fetchRecentNotes();
        fetchTasks();
        fetchCompletedTasksCount();
        loadEvents();
        fetchNotesCount();
      }
    }, 120000); // Refresh every 2 minutes instead of 30 seconds

    // Set up event listener for note updates
    const handleNoteUpdate = () => {
      console.log('Note update event received, triggering debounced refresh...');
      debouncedRefresh();
    };

    window.addEventListener('noteUpdated', handleNoteUpdate);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('noteUpdated', handleNoteUpdate);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const handleOpenNote = async (noteId: number) => {
    try {
      console.log('Opening note:', noteId);
      // Update the last_visited timestamp
      const response = await axiosInstance.patch(`/notes/${noteId}/`, {
        last_visited: new Date().toISOString()
      });
      
      console.log('Visit update response:', response.data);
      
      // Store the note ID in localStorage to be picked up by Notes component
      localStorage.setItem('openNoteId', noteId.toString());
      // Navigate to notes page - the Notes component will handle opening the note
      navigate('/notes');
      
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
      localStorage.setItem('openNoteId', noteId.toString());
      navigate('/notes');
    }
  };

  // Today's study time from study timer sessions
  const [todaysStudyTime, setTodaysStudyTime] = useState(0);
  
  // Fetch today's study time from study timer sessions
  useEffect(() => {
    const fetchTodaysStudyTime = async () => {
      try {
        const userData = localStorage.getItem('user');
        if (!userData) {
          setTodaysStudyTime(0);
          return;
        }
        
        // Get Supabase auth user ID (UUID) - this is what Supabase expects
        const { data: { user: supabaseAuthUser } } = await supabase.auth.getUser();
        const supabaseUserId = supabaseAuthUser?.id;
        
        if (!supabaseUserId) {
          // Fallback to backend API
          try {
            const response = await axiosInstance.get('/tasks/study-timer-sessions/');
            const backendSessions = response.data || [];
            // Filter for today's Study sessions
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayEnd = new Date(today);
            todayEnd.setHours(23, 59, 59, 999);
            
            const todaySessions = backendSessions.filter((s: any) => {
              if (s.session_type !== 'Study') return false;
              const startTime = new Date(s.start_time);
              return startTime >= today && startTime <= todayEnd;
            });
            
            const totalSeconds = todaySessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
            const minutes = Math.round(totalSeconds / 60); // Convert to minutes and round
            setTodaysStudyTime(minutes);
          } catch (apiError) {
            console.error('Error fetching today\'s study time from backend:', apiError);
            setTodaysStudyTime(0);
          }
          return;
        }
        
        // Get today's start and end timestamps
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        
        // Fetch today's study timer sessions from Supabase
        const { data: sessions, error } = await supabase
          .from('study_timer_sessions')
          .select('duration, session_type, start_time')
          .eq('user_id', supabaseUserId)
          .eq('session_type', 'Study')
          .gte('start_time', today.toISOString())
          .lte('start_time', todayEnd.toISOString());
        
        if (error) {
          console.error('Error fetching today\'s study time:', error);
          // Fallback to backend API
          try {
            const response = await axiosInstance.get('/tasks/study-timer-sessions/');
            const backendSessions = response.data || [];
            const todaySessions = backendSessions.filter((s: any) => {
              if (s.session_type !== 'Study') return false;
              const startTime = new Date(s.start_time);
              return startTime >= today && startTime <= todayEnd;
            });
            const totalSeconds = todaySessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
            const minutes = Math.round(totalSeconds / 60); // Convert to minutes and round
            setTodaysStudyTime(minutes);
          } catch (apiError) {
            console.error('Error fetching today\'s study time from backend:', apiError);
            setTodaysStudyTime(0);
          }
        } else {
          // Calculate today's study time from sessions (duration is in seconds)
          const totalSeconds = (sessions || []).reduce((sum, s) => sum + (s.duration || 0), 0);
          const minutes = Math.round(totalSeconds / 60); // Convert to minutes and round
          setTodaysStudyTime(minutes);
        }
      } catch (e) {
        console.error('Error calculating today\'s study time:', e);
        setTodaysStudyTime(0);
      }
    };
    
    fetchTodaysStudyTime();
    
    // Refresh today's study time periodically
    const interval = setInterval(fetchTodaysStudyTime, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  const [completedTasksCount, setCompletedTasksCount] = useState<number>(0);
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
    <PageLayout>
      {/* Modern Abstract Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* 60% - Dominant White Background */}
        <div className="absolute inset-0 bg-white dark:bg-gray-900"></div>
        
        {/* 30% - Blue Abstract Shapes */}
        {/* Top-Left: Light Blue Organic Shape */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-full opacity-60 animate-float-slow"></div>
        
        {/* Top-Right: Large Dark Navy Shape */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-bl from-blue-900 to-blue-800 dark:from-blue-800 dark:to-blue-700 rounded-full opacity-70 animate-float-slower"></div>
        
        {/* Top-Right: Medium Blue Wave */}
        <div className="absolute top-20 right-10 w-64 h-64 bg-gradient-to-bl from-blue-300 to-blue-400 dark:from-blue-600/40 dark:to-blue-500/40 rounded-full opacity-50 animate-float"></div>
        
        {/* Bottom-Left: Dark Navy Rounded Shape */}
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-gradient-to-tr from-blue-800 to-blue-900 dark:from-blue-700 dark:to-blue-800 rounded-full opacity-60 animate-float-reverse"></div>
        
        {/* Bottom-Right: Light Blue Wave */}
        <div className="absolute -bottom-10 -right-10 w-80 h-80 bg-gradient-to-tl from-blue-200 to-blue-300 dark:from-blue-700/30 dark:to-blue-600/30 rounded-full opacity-50 animate-float-slow"></div>
        
        {/* Center-Right: Medium Blue Accent */}
        <div className="absolute top-1/2 right-20 w-48 h-48 bg-gradient-to-bl from-blue-400 to-blue-500 dark:from-blue-500/40 dark:to-blue-400/40 rounded-full opacity-40 animate-float-slower"></div>
        
        {/* 10% - Accent Dark Navy Shapes */}
        {/* Small accent shapes for depth */}
        <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-blue-900 dark:bg-blue-800 rounded-full opacity-30 animate-float"></div>
        <div className="absolute bottom-1/3 right-1/3 w-24 h-24 bg-blue-800 dark:bg-blue-700 rounded-full opacity-40 animate-float-reverse"></div>
        
        {/* Subtle overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-50/20 dark:to-blue-950/20"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 relative z-10">
          {/* Compact Header with Greeting and Search */}
          <div className="mb-6">
            {/* Greeting section - more compact */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {greeting}, <span className="text-indigo-600 dark:text-indigo-400">{user?.username}</span>!
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

          {/* Search Bar moved to header; hide legacy inline search */}
          <div className="relative hidden">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchResults(true)}
                placeholder="Search notes, tasks, decks... (Ctrl+K)"
                className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-colors"
              />
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div 
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
              >
                {isSearching ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500 mx-auto mb-2"></div>
                    Searching...
                  </div>
                ) : searchResults.length === 0 && searchQuery.trim() ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No results found for "{searchQuery}". Try a different search term.
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    Start typing to search...
                  </div>
                ) : (
                  <>
                    {/* Filter Buttons */}
                    {getAvailableFilters().length > 1 && (
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex flex-wrap gap-2">
                          {getAvailableFilters().map((filter) => (
                            <button
                              key={filter.key}
                              data-filter-button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setActiveFilter(filter.key);
                                setSelectedResultIndex(-1);
                              }}
                              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                                activeFilter === filter.key
                                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                              }`}
                            >
                              {filter.label} ({filter.count})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Search Results */}
                    <div className="py-2">
                      {getFilteredResults().map((result, index) => (
                        <div
                          key={result.id}
                          data-search-result
                          className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${
                            index === selectedResultIndex 
                              ? 'bg-indigo-50 dark:bg-indigo-900/20' 
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleResultClick(result);
                          }}
                          onMouseEnter={() => setSelectedResultIndex(index)}
                        >
                          <div className="mr-3 text-indigo-600 dark:text-indigo-400">{result.icon}</div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{result.title}</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{result.description}</p>
                            {result.timestamp && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{format(new Date(result.timestamp), 'MMM d, yyyy')}</p>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0">
                            {result.category}
                          </div>
                        </div>
                      ))}
                      
                      {/* No results for current filter */}
                      {getFilteredResults().length === 0 && searchResults.length > 0 && (
                        <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          <p>No results found for the selected filter.</p>
                          <button
                            data-filter-button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveFilter('all');
                            }}
                            className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Show all results
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          </div>

          {/* Dynamic Stats grid - more compact */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4 mb-6">
            <div 
              className="bg-white/90 dark:bg-[#252525] backdrop-blur-md overflow-hidden rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 cursor-pointer group border border-gray-200 dark:border-[#333333] dark:hover:border-[#404040]"
              onClick={() => navigate('/study-timer')}
            >
              <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-md p-2 sm:p-3 bg-gray-100 dark:bg-[#1e1e1e] group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
                    <Clock size={16} className="sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="ml-3 sm:ml-5">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Today's Study Time</p>
                    <p className="mt-1 text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white">
                      {todaysStudyTime >= 60 
                        ? (() => {
                            const hours = Math.floor(todaysStudyTime / 60);
                            const minutes = todaysStudyTime % 60;
                            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
                          })()
                        : `${todaysStudyTime}m`
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div 
              className="bg-white/90 dark:bg-[#252525] backdrop-blur-md overflow-hidden rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 cursor-pointer group border border-gray-200 dark:border-[#333333] dark:hover:border-[#404040]"
              onClick={() => navigate('/tasks')}
            >
              <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-md p-2 sm:p-3 bg-gray-100 dark:bg-[#1e1e1e] group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 transition-colors">
                    <CheckSquare size={16} className="sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="ml-3 sm:ml-5">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Tasks Incomplete</p>
                    <p className="mt-1 text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white">{tasks.length}</p>
                  </div>
                </div>
              </div>
            </div>
            <div 
              className="bg-white/90 dark:bg-[#252525] backdrop-blur-md overflow-hidden rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 cursor-pointer group border border-gray-200 dark:border-[#333333] dark:hover:border-[#404040]"
              onClick={() => navigate('/notes')}
            >
              <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-md p-2 sm:p-3 bg-gray-100 dark:bg-[#1e1e1e] group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
                    <BookOpen size={16} className="sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-3 sm:ml-5">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Notes Created</p>
                    <p className="mt-1 text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white">{notesCount}</p>
                  </div>
                </div>
              </div>
            </div>
            <div 
              className="bg-white/90 dark:bg-[#252525] backdrop-blur-md overflow-hidden rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 cursor-pointer group border border-gray-200 dark:border-[#333333] dark:hover:border-[#404040]"
              onClick={() => navigate('/schedule')}
            >
              <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-md p-2 sm:p-3 bg-gray-100 dark:bg-[#1e1e1e] group-hover:bg-purple-100 dark:group-hover:bg-purple-500/20 transition-colors">
                    <Calendar size={16} className="sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-3 sm:ml-5">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Upcoming Events</p>
                    <p className="mt-1 text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white">{upcomingEventsCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Notes History section with horizontal slider */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                Recent Note Activities
              </h2>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => navigate('/notes')}
                  className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline font-medium transition-colors hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  View All Notes
                </button>
                {/* Show navigation only on mobile when there are more than 4 notes */}
                <div className="md:hidden">
                  {recentNotes.length > 4 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={prevSlide}
                        className="p-1 rounded-full bg-gray-100 dark:bg-[#252525] hover:bg-gray-200 dark:hover:bg-[#2d2d2d] text-gray-600 dark:text-gray-300 transition-colors border border-transparent dark:border-[#333333]"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={nextSlide}
                        className="p-1 rounded-full bg-gray-100 dark:bg-[#252525] hover:bg-gray-200 dark:hover:bg-[#2d2d2d] text-gray-600 dark:text-gray-300 transition-colors border border-transparent dark:border-[#333333]"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
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
                        className="bg-white/90 dark:bg-[#252525] backdrop-blur-md border border-gray-200 dark:border-[#333333] rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer aspect-square flex flex-col min-w-[100px] group overflow-hidden dark:hover:border-[#404040]"
                        onClick={() => handleOpenNote(note.id)}
                      >
                        <div className="p-2 flex-1 flex flex-col items-center justify-center text-center overflow-hidden w-full">
                          <div className="mb-1 p-1.5 bg-indigo-100 dark:bg-indigo-500/20 rounded-full group-hover:bg-indigo-200 dark:group-hover:bg-indigo-500/30 transition-colors flex-shrink-0">
                            <BookOpen size={14} className="text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <h3 className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2 px-1 w-full break-words overflow-hidden">
                            {note.title || 'Untitled Note'}
                          </h3>
                          {note.notebook_name && (
                            <span className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 px-1 w-full truncate">
                              {note.notebook_name}
                            </span>
                          )}
                          {(note.last_visited || note.updated_at) && (
                            <span className="mt-1 text-[8px] text-gray-400 dark:text-gray-500 line-clamp-1 px-1 w-full truncate">
                              {format(new Date(note.last_visited || note.updated_at), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div 
                    className="w-full bg-white dark:bg-[#252525] rounded-lg shadow-sm p-4 text-center cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] border border-gray-200 dark:border-[#333333]"
                    onClick={() => navigate('/notes')}
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <BookOpen size={16} className="text-gray-400 dark:text-gray-500" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">No recent notes found</p>
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline">Click to create a new note</p>
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
                      className="bg-white/90 dark:bg-[#252525] backdrop-blur-md border border-gray-200 dark:border-[#333333] rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer aspect-square flex flex-col min-w-[100px] group overflow-hidden dark:hover:border-[#404040]"
                      onClick={() => handleOpenNote(note.id)}
                    >
                      <div className="p-2 flex-1 flex flex-col items-center justify-center text-center overflow-hidden w-full">
                        <div className="mb-1 p-1.5 bg-indigo-100 dark:bg-indigo-500/20 rounded-full group-hover:bg-indigo-200 dark:group-hover:bg-indigo-500/30 transition-colors flex-shrink-0">
                          <BookOpen size={14} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2 px-1 w-full break-words overflow-hidden">
                          {note.title || 'Untitled Note'}
                        </h3>
                        {note.notebook_name && (
                          <span className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 px-1 w-full truncate">
                            {note.notebook_name}
                          </span>
                        )}
                        {(note.last_visited || note.updated_at) && (
                          <span className="mt-1 text-[8px] text-gray-400 dark:text-gray-500 line-clamp-1 px-1 w-full truncate">
                            {format(new Date(note.last_visited || note.updated_at), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div 
                    className="col-span-full bg-white dark:bg-[#252525] rounded-lg shadow-sm p-4 text-center cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] border border-gray-200 dark:border-[#333333]"
                    onClick={() => navigate('/notes')}
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <BookOpen size={16} className="text-gray-400 dark:text-gray-500" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">No recent notes found</p>
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline">Click to create a new note</p>
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
                          : 'bg-gray-300 dark:bg-[#404040]'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Two-column layout for Tasks and Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Tasks section (left) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Pending Tasks</h2>
                <button 
                  onClick={() => navigate('/tasks')}
                  className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline font-medium transition-colors hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  View Tasks
                </button>
              </div>
              <div className="h-96 bg-gray-100 dark:bg-[#252525] rounded-lg shadow flex flex-col p-4 border border-gray-200 dark:border-[#333333]">
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  {tasksLoading ? (
                    <div className="text-gray-500 dark:text-gray-400">Loading tasks...</div>
                  ) : tasks.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {tasks.map((task) => (
                        <div 
                          key={task.id} 
                          className="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm p-3 flex flex-col justify-between min-h-[90px] cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-gray-50 dark:hover:bg-[#2d2d2d] border border-transparent dark:border-[#333333] hover:border-gray-200 dark:hover:border-[#404040]"
                          onClick={() => navigate('/tasks')}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              task.priority === 'high'
                                ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400'
                                : task.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400'
                                : 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400'
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
                          <div className="mt-1 flex flex-wrap gap-1">
                            {task.task_category && (
                              <span className={`text-xs rounded px-1.5 py-0.5 ${getCategoryColor(task.task_category).bg} ${getCategoryColor(task.task_category).text}`}>
                                {task.task_category}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div 
                      className="rounded-lg shadow-sm p-4 text-center text-gray-500 dark:text-gray-400 cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-gray-50 dark:hover:bg-[#2d2d2d] border border-transparent dark:border-[#333333]"
                      onClick={() => navigate('/tasks')}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <CheckSquare size={24} className="text-gray-400 dark:text-gray-500" />
                        <p>No pending tasks found</p>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Click to create a new task</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Schedule section (right) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Upcoming Events</h2>
                <button 
                  onClick={() => navigate('/schedule')}
                  className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline font-medium transition-colors hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  View Schedule
                </button>
              </div>
              <div className="h-96 bg-gray-100 dark:bg-[#252525] rounded-lg shadow flex flex-col p-4 border border-gray-200 dark:border-[#333333]">
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  {events.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {events.map((event) => (
                        <div 
                          key={event.id} 
                          className="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm p-3 flex flex-col justify-between min-h-[90px] cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-gray-50 dark:hover:bg-[#2d2d2d] border border-transparent dark:border-[#333333] hover:border-gray-200 dark:hover:border-[#404040]"
                          onClick={() => navigate('/schedule')}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              event.category === 'study'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400'
                                : event.category === 'assignment'
                                ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400'
                                : event.category === 'exam'
                                ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400'
                                : event.category === 'meeting'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400'
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
                    <div 
                      className="rounded-lg shadow-sm p-4 text-center text-gray-500 dark:text-gray-400 cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-gray-50 dark:hover:bg-[#2d2d2d] border border-transparent dark:border-[#333333]"
                      onClick={() => navigate('/schedule')}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <Calendar size={24} className="text-gray-400 dark:text-gray-500" />
                        <p>No upcoming events found</p>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Click to create a new event</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
      </div>
    </PageLayout>
  );
};

export default Home;
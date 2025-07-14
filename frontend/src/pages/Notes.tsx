// frontend/src/pages/Notes.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import NotebookList from '../components/notes/NotebookList';
import NotesList from '../components/notes/NotesList';
import SearchBar from '../components/notes/SearchBar';
import NoteEditor from '../components/notes/NoteEditor';
import PageLayout from '../components/PageLayout';
import DeleteConfirmationModal from '../components/common/DeleteConfirmationModal';
import Toast from '../components/common/Toast';
import { ChevronLeft, Plus } from 'lucide-react';

interface Notebook {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  notes_count: number;
}

interface Note {
  id: number;
  title: string;
  content: string;
  notebook: number;
  notebook_name: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

interface User {
  username: string;
  email?: string;
}

// Initialize the API service URLs - FIXED
const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

const Notes = () => {
  const { id: noteIdFromUrl } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for notebooks and notes
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  
  // State for form inputs
  const [newNotebookName, setNewNotebookName] = useState('');
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [searchTerm, setSearchTerm] = useState(''); 
  
  // UI state management
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // 1. Add state for NoteEditor modal
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [noteEditorNote, setNoteEditorNote] = useState<Note | null>(null);
  const [isNewNoteEditor, setIsNewNoteEditor] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Add filter state
  const [filterType, setFilterType] = useState<'all' | 'title' | 'content' | 'date'>('all');

  // Add tab state
  const [activeTab, setActiveTab] = useState<'notes' | 'logs' | 'archived'>('notes');

  // Add toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Mobile view state
  const [mobileView, setMobileView] = useState<'notebooks' | 'notes'>('notebooks');

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken'); // Changed from 'token' to 'accessToken'
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Load user data and initialize app
  useEffect(() => {
    const initializeApp = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const getUserData = () => {
        const userData = localStorage.getItem('user');
        if (userData && userData !== "undefined") {
          try {
            const parsedUser = JSON.parse(userData);
            
            if (parsedUser && typeof parsedUser === 'object') {
              if (parsedUser.username) {
                setUser(parsedUser);
              } else if (parsedUser.user && parsedUser.user.username) {
                setUser(parsedUser.user);
              } else {
                setUser({ username: 'User' });
              }
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
      };

      getUserData();
      
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good morning');
      else if (hour < 18) setGreeting('Good afternoon');
      else setGreeting('Good evening');
      
      try {
        await fetchNotebooks();
      } catch (error: any) {
        console.error('Failed to fetch notebooks:', error);
        if (error?.response?.status === 401) {
          window.location.href = '/login';
          return;
        }
      }
      
      setLoading(false);
    };

    initializeApp();
  }, []);

  // Error handler
  const handleError = (error: any, message: string) => {
    console.error(message, error);
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken'); // Changed from 'token' to 'accessToken'
      localStorage.removeItem('refreshToken'); // Also remove refresh token
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    setError(message);
  };

  // Fetch notebooks from API
  const fetchNotebooks = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const response = await axios.get(`${API_URL}/notes/notebooks/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data) {
        setNotebooks(response.data);
      } else {
        setError('No notebooks found');
      }
    } catch (error: any) {
      console.error('Failed to fetch notebooks:', error);
      if (error.response?.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        setError('Failed to fetch notebooks. Please try again.');
      }
    }
  };

  // Fetch notes for selected notebook
  const fetchNotes = async (notebookId: number) => {
    try {
      const response = await axios.get(`${API_URL}/notes/?notebook=${notebookId}`, {
        headers: getAuthHeaders()
      });
      setNotes(response.data);
    } catch (error) {
      handleError(error, 'Failed to fetch notes');
    }
  };

  // Notebook management functions
  const handleNotebookSelect = (notebook: Notebook) => {
    setSelectedNotebook(notebook);
    fetchNotes(notebook.id);
    setSearchTerm('');
    // On mobile, switch to notes view
    setMobileView('notes');
  };

  // Mobile back button handler
  const handleMobileBack = () => {
    setMobileView('notebooks');
    setSelectedNotebook(null);
    setNotes([]);
  };

  const handleAddNotebook = async () => {
    if (!newNotebookName.trim()) return;
    
    try {
      const response = await axios.post(`${API_URL}/notes/notebooks/`, {
        name: newNotebookName.trim()
      }, {
        headers: getAuthHeaders()
      });
      
      setNotebooks([...notebooks, response.data]);
      setEditingNotebook(null);
      setNewNotebookName('');
    } catch (error) {
      handleError(error, 'Failed to create notebook');
    }
  };

  const handleStartEditingNotebook = (notebook: Notebook) => {
    setEditingNotebook(notebook);
    setNewNotebookName(notebook.name);
  };

  const handleCancelEditingNotebook = () => {
    setEditingNotebook(null);
    setNewNotebookName('');
  };

  const handleUpdateNotebook = async () => {
    if (!editingNotebook || !newNotebookName.trim()) return;
    
    try {
      const response = await axios.put(`${API_URL}/notes/notebooks/${editingNotebook.id}/`, {
        name: newNotebookName.trim()
      }, {
        headers: getAuthHeaders()
      });
      
      const updatedNotebooks = notebooks.map(nb => 
        nb.id === editingNotebook.id ? response.data : nb
      );
      setNotebooks(updatedNotebooks);
      
      if (selectedNotebook?.id === editingNotebook.id) {
        setSelectedNotebook(response.data);
      }
      
      setEditingNotebook(null);
      setNewNotebookName('');
    } catch (error) {
      handleError(error, 'Failed to update notebook');
    }
  };

  const handleDeleteNotebook = async (notebookId: number) => {
    try {
      await axios.delete(`${API_URL}/notes/notebooks/${notebookId}/`, {
        headers: getAuthHeaders()
      });
      
      setNotebooks(notebooks.filter(nb => nb.id !== notebookId));
      
      if (selectedNotebook?.id === notebookId) {
        setSelectedNotebook(null);
        setNotes([]);
      }
    } catch (error) {
      handleError(error, 'Failed to delete notebook');
    }
  };

  // Note management functions
  const handleStartAddingNote = () => {
    setIsNewNoteEditor(true);
    setShowNoteEditor(true);
    setNewNote({ title: '', content: '' });
  };

  const handleCancelAddingNote = () => {
    setNewNote({ title: '', content: '' });
  };

  const handleAddNote = async () => {
    if (!selectedNotebook) return;
    try {
      const response = await axios.post(`${API_URL}/notes/`, {
        title: (newNote.title && newNote.title.trim()) ? newNote.title.trim() : 'Untitled Note',
        content: newNote.content,
        notebook: selectedNotebook.id
      }, {
        headers: getAuthHeaders()
      });
      setNotes([response.data, ...notes]);
      setIsNewNoteEditor(false);
      setNewNote({ title: '', content: '' });
      // Update notebook notes count
      const updatedNotebooks = notebooks.map(nb => 
        nb.id === selectedNotebook.id 
          ? { ...nb, notes_count: nb.notes_count + 1 }
          : nb
      );
      setNotebooks(updatedNotebooks);
      setSelectedNotebook({ ...selectedNotebook, notes_count: selectedNotebook.notes_count + 1 });
    } catch (error) {
      handleError(error, 'Failed to create note');
    }
  };

  const handleEditNote = (note: Note) => {
    // Find the latest note by id from the notes state
    const latestNote = notes.find(n => n.id === note.id) || note;
    setEditingNote(null); // Hide inline form
    setNoteEditorNote(latestNote);
    setIsNewNoteEditor(false);
    setShowNoteEditor(true);
    
    // Update URL with note ID
    navigate(`/notes/${note.id}`);
    
    // Update last_visited timestamp
    updateLastVisited(note.id);
  };

  // Add function to update last_visited timestamp
  const updateLastVisited = async (noteId: number) => {
    try {
      await axios.patch(`${API_URL}/notes/${noteId}/`, {
        last_visited: new Date().toISOString()
      }, {
        headers: getAuthHeaders()
      });
    } catch (error) {
      console.error('Failed to update last_visited timestamp:', error);
    }
  };

  const handleCancelEditingNote = () => {
    setEditingNote(null);
    setNewNote({ title: '', content: '' });
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !newNote.title.trim()) return;
    
    try {
      const response = await axios.put(`${API_URL}/notes/${editingNote.id}/`, {
        title: newNote.title.trim(),
        content: newNote.content,
        notebook: editingNote.notebook
      }, {
        headers: getAuthHeaders()
      });
      
      const updatedNotes = notes.map(note => 
        note.id === editingNote.id ? response.data : note
      );
      setNotes(updatedNotes);
      
      setEditingNote(null);
      setNewNote({ title: '', content: '' });
    } catch (error) {
      handleError(error, 'Failed to update note');
    }
  };

  // This DELETE request performs a soft delete (moves note to Trash)
  const handleDeleteNote = async (noteId: number) => {
    try {
      await axios.delete(`${API_URL}/notes/${noteId}/`, {
        headers: getAuthHeaders()
      });
      setNotes(notes.filter(note => note.id !== noteId));
      
      // Update notebook notes count
      if (selectedNotebook) {
        const updatedNotebooks = notebooks.map(nb => 
          nb.id === selectedNotebook.id 
            ? { ...nb, notes_count: nb.notes_count - 1 }
            : nb
        );
        setNotebooks(updatedNotebooks);
        setSelectedNotebook({ ...selectedNotebook, notes_count: selectedNotebook.notes_count - 1 });
      }
      setToast({ message: 'Note moved to Trash.', type: 'success' });
    } catch (error) {
      handleError(error, 'Failed to delete note');
      setToast({ message: 'Failed to delete note.', type: 'error' });
    }
  };

  // 3. Add handlers for saving and closing NoteEditor
  const handleSaveNoteEditor = async (title: string, content: string, closeAfterSave = false) => {
    setIsSavingNote(true);
    if (isNewNoteEditor && selectedNotebook) {
      try {
        const response = await axios.post(`${API_URL}/notes/`, {
          title: title.trim() || 'Untitled Note',
          content,
          notebook: selectedNotebook.id
        }, {
          headers: getAuthHeaders()
        });
        setNotes([response.data, ...notes]);
        // Switch to edit mode after first save to prevent duplicates
        setNoteEditorNote(response.data);
        setIsNewNoteEditor(false);
        // Update notebook notes count
        const updatedNotebooks = notebooks.map(nb => 
          nb.id === selectedNotebook.id 
            ? { ...nb, notes_count: nb.notes_count + 1 }
            : nb
        );
        setNotebooks(updatedNotebooks);
        setSelectedNotebook({ ...selectedNotebook, notes_count: selectedNotebook.notes_count + 1 });
        if (closeAfterSave) setShowNoteEditor(false);
      } catch (error) {
        handleError(error, 'Failed to create note');
      }
    } else if (noteEditorNote) {
      try {
        const response = await axios.put(`${API_URL}/notes/${noteEditorNote.id}/`, {
          title: title.trim() || 'Untitled Note',
          content,
          notebook: noteEditorNote.notebook
        }, {
          headers: getAuthHeaders()
        });
        
        // Update the note in the local state
        const updatedNotes = notes.map(note => 
          note.id === noteEditorNote.id ? response.data : note
        );
        setNotes(updatedNotes);
        
        // Update the noteEditorNote to reflect the new title
        setNoteEditorNote(response.data);
        
        // Always re-fetch notes from backend after update
        if (selectedNotebook) {
          await fetchNotes(selectedNotebook.id);
        }
        
        if (closeAfterSave) setShowNoteEditor(false);
      } catch (error) {
        handleError(error, 'Failed to update note');
      }
    }
    setIsSavingNote(false);
  };
  const handleCloseNoteEditor = () => {
    setShowNoteEditor(false);
    setNoteEditorNote(null);
    setIsNewNoteEditor(false);
    setNewNote({ title: '', content: '' });
    navigate('/notes');
  };

  // Update filteredNotes logic to use filterType
  const filteredNotes = notes.filter(note => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    if (filterType === 'title') return note.title.toLowerCase().includes(term);
    if (filterType === 'content') return note.content.toLowerCase().includes(term);
    if (filterType === 'date') return note.created_at.toLowerCase().includes(term) || note.updated_at.toLowerCase().includes(term);
    // 'all'
    return (
      note.title.toLowerCase().includes(term) ||
      note.content.toLowerCase().includes(term) ||
      note.created_at.toLowerCase().includes(term) ||
      note.updated_at.toLowerCase().includes(term)
    );
  });

  // Add handler to update note title
  const handleUpdateNoteTitle = async (noteId: number, newTitle: string) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;
      const response = await axios.put(`${API_URL}/notes/${noteId}/`, {
        title: newTitle.trim() || 'Untitled Note',
        content: note.content,
        notebook: note.notebook
      }, {
        headers: getAuthHeaders()
      });
      const updatedNotes = notes.map(n => n.id === noteId ? response.data : n);
      setNotes(updatedNotes);
      if (selectedNotebook) {
        await fetchNotes(selectedNotebook.id);
      }
    } catch (error) {
      handleError(error, 'Failed to update note title');
    }
  };

  // Add useEffect to handle opening note from URL parameter
  useEffect(() => {
    const openNoteFromUrl = async () => {
      if (noteIdFromUrl) {
        try {
          const response = await axios.get(`${API_URL}/notes/${noteIdFromUrl}/`, {
            headers: getAuthHeaders()
          });
          const note = response.data;
          
          // Find the notebook for this note
          const notebook = notebooks.find(nb => nb.id === note.notebook);
          if (notebook) {
            setSelectedNotebook(notebook);
            await fetchNotes(notebook.id);
          }
          
          // Open the note in the editor
          setNoteEditorNote(note);
          setIsNewNoteEditor(false);
          setShowNoteEditor(true);
        } catch (error) {
          console.error('Failed to fetch note:', error);
          // If note not found, redirect to notes page
          navigate('/notes');
        }
      }
    };

    // Only try to open note if we have notebooks loaded
    if (notebooks.length > 0) {
      openNoteFromUrl();
    }
  }, [notebooks, noteIdFromUrl]);

  // Add useEffect to handle opening note from localStorage
  useEffect(() => {
    const openNoteFromStorage = async () => {
      const noteId = localStorage.getItem('openNoteId');
      
      if (noteId) {
        try {
          const response = await axios.get(`${API_URL}/notes/${noteId}/`, {
            headers: getAuthHeaders()
          });
          const note = response.data;
          
          // Find the notebook for this note
          const notebook = notebooks.find(nb => nb.id === note.notebook);
          if (notebook) {
            setSelectedNotebook(notebook);
            await fetchNotes(notebook.id);
          }
          
          // Open the note in the editor
          setNoteEditorNote(note);
          setIsNewNoteEditor(false);
          setShowNoteEditor(true);
          
          // Clear the stored note ID
          localStorage.removeItem('openNoteId');
        } catch (error) {
          console.error('Failed to fetch note:', error);
        }
      }
    };

    // Only try to open note if we have notebooks loaded
    if (notebooks.length > 0) {
      openNoteFromStorage();
    }
  }, [notebooks]); // Re-run when notebooks are loaded

  // Hide NoteEditor when URL does not have a note ID
  useEffect(() => {
    if (!noteIdFromUrl) {
      setShowNoteEditor(false);
      setNoteEditorNote(null);
      setIsNewNoteEditor(false);
    }
  }, [noteIdFromUrl]);

  const handleBulkDeleteNotes = async (noteIds: number[]) => {
    try {
      // Delete notes one by one
      for (const noteId of noteIds) {
        await axios.delete(`${API_URL}/notes/${noteId}/`, {
          headers: getAuthHeaders()
        });
      }
      
      // Update the notes list
      setNotes(notes.filter(note => !noteIds.includes(note.id)));
      
      // Update notebook notes count
      if (selectedNotebook) {
        const updatedNotebooks = notebooks.map(nb => 
          nb.id === selectedNotebook.id 
            ? { ...nb, notes_count: nb.notes_count - noteIds.length }
            : nb
        );
        setNotebooks(updatedNotebooks);
        setSelectedNotebook({ ...selectedNotebook, notes_count: selectedNotebook.notes_count - noteIds.length });
      }
    } catch (error) {
      handleError(error, 'Failed to delete notes');
    }
  };

  // Add state for Delete Confirmation Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  const handleRequestDeleteNote = (note: Note) => {
    setShowDeleteModal(true);
    setNoteToDelete(note);
  };

  // Add direct notebook creation handler
  const handleCreateNotebookDirect = async (name: string) => {
    if (!name.trim()) return;
    try {
      const response = await axios.post(`${API_URL}/notes/notebooks/`, {
        name: name.trim()
      }, {
        headers: getAuthHeaders()
      });
      setNotebooks([...notebooks, response.data]);
    } catch (error) {
      handleError(error, 'Failed to create notebook');
    }
  };

  // Add direct notebook update handler
  const handleUpdateNotebookDirect = async (id: number, name: string) => {
    if (!name.trim()) return;
    try {
      const response = await axios.put(`${API_URL}/notes/notebooks/${id}/`, {
        name: name.trim()
      }, {
        headers: getAuthHeaders()
      });
      const updatedNotebooks = notebooks.map(nb => 
        nb.id === id ? response.data : nb
      );
      setNotebooks(updatedNotebooks);
      if (selectedNotebook?.id === id) {
        setSelectedNotebook(response.data);
      }
    } catch (error) {
      handleError(error, 'Failed to update notebook');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="flex h-full">
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Notes
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                Create and manage your notes
              </p>
            </div>
            {/* Search and Filter Bar - Desktop */}
            <div className="hidden sm:flex items-center gap-2 mt-4 sm:mt-0 justify-end w-full sm:w-auto">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
                className="h-10 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ minWidth: '100px' }}
              >
                <option value="all">All</option>
                <option value="title">Title</option>
                <option value="content">Content</option>
                <option value="date">Date</option>
              </select>
              <div className="w-64">
                <SearchBar
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  placeholder="Search notes..."
                  inputClassName="h-10"
                  noMargin
                />
              </div>
            </div>
          </div>
          
          {/* Search and Filter Bar - Mobile */}
          <div className="sm:hidden mb-6">
            <div className="flex gap-3">
              <div className="flex-1">
                <SearchBar
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  placeholder="Search notes..."
                  inputClassName="h-12 text-base"
                  noMargin
                />
              </div>
              <div className="w-32">
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as any)}
                  className="w-full h-12 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All</option>
                  <option value="title">Title</option>
                  <option value="content">Content</option>
                  <option value="date">Date</option>
                </select>
              </div>
            </div>
          </div>
          {/* Tabs styled like Settings */}
          <div>
            <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-8">
              <button
                onClick={() => setActiveTab('notes')}
                className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                  activeTab === 'notes'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                Notes
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                  activeTab === 'logs'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                Logs
              </button>
              <button
                onClick={() => setActiveTab('archived')}
                className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                  activeTab === 'archived'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                Archived
              </button>
            </div>
          </div>
          {/* Tab Content */}
          {activeTab === 'notes' && (
            <>
              {/* Error display */}
              {error && (
                <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                  <button 
                    onClick={() => setError(null)}
                    className="ml-4 text-red-900 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              )}
              {/* Main Content */}
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Mobile: Single container view */}
                <div className="lg:hidden w-full bg-white dark:bg-gray-800 rounded-lg shadow h-[calc(100vh-12rem)] flex flex-col">
                  {/* Mobile Header with back button */}
                  {mobileView === 'notes' && selectedNotebook && (
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <button
                            onClick={handleMobileBack}
                            className="p-2 mr-3 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <div>
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                              {selectedNotebook.name}
                            </h2>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {notes.length} notes
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={handleStartAddingNote}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                        >
                          <Plus size={16} className="mr-1 text-white" />
                          Add Note
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mobile Content */}
                  <div className="flex-1 overflow-hidden">
                    {mobileView === 'notebooks' ? (
                      <NotebookList
                        notebooks={notebooks}
                        selectedNotebook={selectedNotebook}
                        editingNotebook={editingNotebook}
                        newNotebookName={newNotebookName}
                        onNotebookSelect={handleNotebookSelect}
                        onAddNotebook={handleAddNotebook}
                        onUpdateNotebook={handleUpdateNotebook}
                        onDeleteNotebook={handleDeleteNotebook}
                        onStartEditingNotebook={handleStartEditingNotebook}
                        onCancelEditingNotebook={handleCancelEditingNotebook}
                        onNotebookNameChange={setNewNotebookName}
                        onCreateNotebook={handleCreateNotebookDirect}
                      />
                    ) : (
                      <NotesList
                        selectedNotebook={selectedNotebook}
                        notes={filteredNotes}
                        isAddingNote={false}
                        editingNote={null}
                        noteTitle={newNote.title}
                        noteContent={newNote.content}
                        onStartAddingNote={handleStartAddingNote}
                        onCancelAddingNote={handleCancelAddingNote}
                        onAddNote={handleAddNote}
                        onEditNote={handleEditNote}
                        onCancelEditingNote={handleCancelEditingNote}
                        onUpdateNote={handleUpdateNote}
                        onDeleteNote={(noteId) => {
                          const note = notes.find(n => n.id === noteId);
                          if (note) handleRequestDeleteNote(note);
                        }}
                        onNoteTitleChange={(title) => setNewNote({ ...newNote, title })}
                        onNoteContentChange={(content) => setNewNote({ ...newNote, content })}
                        onUpdateNoteTitle={handleUpdateNoteTitle}
                        onBulkDelete={handleBulkDeleteNotes}
                        deletingNoteId={noteToDelete?.id || null}
                      />
                    )}
                  </div>
                </div>

                {/* Desktop: Side-by-side layout */}
                <div className="hidden lg:flex w-full gap-6">
                  {/* Notebooks Panel */}
                  <NotebookList
                    notebooks={notebooks}
                    selectedNotebook={selectedNotebook}
                    editingNotebook={editingNotebook}
                    newNotebookName={newNotebookName}
                    onNotebookSelect={handleNotebookSelect}
                    onAddNotebook={handleAddNotebook}
                    onUpdateNotebook={handleUpdateNotebook}
                    onDeleteNotebook={handleDeleteNotebook}
                    onStartEditingNotebook={handleStartEditingNotebook}
                    onCancelEditingNotebook={handleCancelEditingNotebook}
                    onNotebookNameChange={setNewNotebookName}
                    onCreateNotebook={handleCreateNotebookDirect}
                  />
                  {/* Notes Panel */}
                  <NotesList
                    selectedNotebook={selectedNotebook}
                    notes={filteredNotes}
                    isAddingNote={false}
                    editingNote={null}
                    noteTitle={newNote.title}
                    noteContent={newNote.content}
                    onStartAddingNote={handleStartAddingNote}
                    onCancelAddingNote={handleCancelAddingNote}
                    onAddNote={handleAddNote}
                    onEditNote={handleEditNote}
                    onCancelEditingNote={handleCancelEditingNote}
                    onUpdateNote={handleUpdateNote}
                    onDeleteNote={(noteId) => {
                      const note = notes.find(n => n.id === noteId);
                      if (note) handleRequestDeleteNote(note);
                    }}
                    onNoteTitleChange={(title) => setNewNote({ ...newNote, title })}
                    onNoteContentChange={(content) => setNewNote({ ...newNote, content })}
                    onUpdateNoteTitle={handleUpdateNoteTitle}
                    onBulkDelete={handleBulkDeleteNotes}
                    deletingNoteId={noteToDelete?.id || null}
                  />
                </div>
              </div>
              {/* NoteEditor Modal */}
              {showNoteEditor && (
                <NoteEditor
                  note={noteEditorNote}
                  isNewNote={isNewNoteEditor}
                  onSave={handleSaveNoteEditor}
                  onDelete={(noteId) => {
                    const note = notes.find(n => n.id === noteId);
                    if (note) handleRequestDeleteNote(note);
                  }}
                  onBack={handleCloseNoteEditor}
                  isSaving={isSavingNote}
                />
              )}
              {/* Delete Confirmation Modal */}
              <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => { setShowDeleteModal(false); setNoteToDelete(null); }}
                onConfirm={() => {
                  if (noteToDelete) handleDeleteNote(noteToDelete.id);
                  setShowDeleteModal(false);
                  setNoteToDelete(null);
                }}
                title="Move to Trash?"
                message={`Are you sure you want to move the note "${noteToDelete?.title || ''}" to Trash? You can restore it later from Trash.`}
                confirmLabel="Move to Trash"
                cancelLabel="Cancel"
              />
            </>
          )}
          {activeTab === 'logs' && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Logs content coming soon.</div>
          )}
          {activeTab === 'archived' && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Archived notes will appear here.</div>
          )}
        </div>
      </div>
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

export default Notes;


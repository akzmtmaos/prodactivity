// frontend/src/pages/Notes.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import CategoryList from '../components/notes/CategoryList';
import NotesList from '../components/notes/NotesList';
import SearchBar from '../components/notes/SearchBar';
import NoteEditor from '../components/notes/NoteEditor';
import PageLayout from '../components/PageLayout';

interface Category {
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
  category: number;
  category_name: string;
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
  
  // State for categories and notes
  const [categories, setCategories] = useState<Category[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  // State for form inputs
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [searchTerm, setSearchTerm] = useState(''); 
  
  // UI state management
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // 1. Add state for NoteEditor modal
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [noteEditorNote, setNoteEditorNote] = useState<Note | null>(null);
  const [isNewNoteEditor, setIsNewNoteEditor] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

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
        await fetchCategories();
      } catch (error: any) {
        console.error('Failed to fetch categories:', error);
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

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const response = await axios.get(`${API_URL}/notes/categories/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data) {
        setCategories(response.data);
      } else {
        setError('No categories found');
      }
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
      if (error.response?.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        setError('Failed to fetch categories. Please try again.');
      }
    }
  };

  // Fetch notes for selected category
  const fetchNotes = async (categoryId: number) => {
    try {
      const response = await axios.get(`${API_URL}/notes/?category=${categoryId}`, {
        headers: getAuthHeaders()
      });
      setNotes(response.data);
    } catch (error) {
      handleError(error, 'Failed to fetch notes');
    }
  };

  // Category management functions
  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    fetchNotes(category.id);
    setSearchTerm('');
  };

  const handleStartAddingCategory = () => {
    setIsAddingCategory(true);
    setNewCategoryName('');
  };

  const handleCancelAddingCategory = () => {
    setIsAddingCategory(false);
    setNewCategoryName('');
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const response = await axios.post(`${API_URL}/notes/categories/`, {
        name: newCategoryName.trim()
      }, {
        headers: getAuthHeaders()
      });
      
      setCategories([...categories, response.data]);
      setIsAddingCategory(false);
      setNewCategoryName('');
    } catch (error) {
      handleError(error, 'Failed to create category');
    }
  };

  const handleStartEditingCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
  };

  const handleCancelEditingCategory = () => {
    setEditingCategory(null);
    setNewCategoryName('');
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) return;
    
    try {
      const response = await axios.put(`${API_URL}/categories/${editingCategory.id}/`, {
        name: newCategoryName.trim()
      }, {
        headers: getAuthHeaders()
      });
      
      const updatedCategories = categories.map(cat => 
        cat.id === editingCategory.id ? response.data : cat
      );
      setCategories(updatedCategories);
      
      if (selectedCategory?.id === editingCategory.id) {
        setSelectedCategory(response.data);
      }
      
      setEditingCategory(null);
      setNewCategoryName('');
    } catch (error) {
      handleError(error, 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    try {
      await axios.delete(`${API_URL}/notes/categories/${categoryId}/`, {
        headers: getAuthHeaders()
      });
      
      setCategories(categories.filter(cat => cat.id !== categoryId));
      
      if (selectedCategory?.id === categoryId) {
        setSelectedCategory(null);
        setNotes([]);
      }
    } catch (error) {
      handleError(error, 'Failed to delete category');
    }
  };

  // Note management functions
  const handleStartAddingNote = () => {
    setIsAddingNote(false); // Hide inline form
    setNoteEditorNote(null);
    setIsNewNoteEditor(true);
    setShowNoteEditor(true);
  };

  const handleCancelAddingNote = () => {
    setIsAddingNote(false);
    setNewNote({ title: '', content: '' });
  };

  const handleAddNote = async () => {
    if (!selectedCategory) return;
    try {
      const response = await axios.post(`${API_URL}/notes/`, {
        title: (newNote.title && newNote.title.trim()) ? newNote.title.trim() : 'Untitled Note',
        content: newNote.content,
        category: selectedCategory.id
      }, {
        headers: getAuthHeaders()
      });
      setNotes([response.data, ...notes]);
      setIsAddingNote(false);
      setNewNote({ title: '', content: '' });
      // Update category notes count
      const updatedCategories = categories.map(cat => 
        cat.id === selectedCategory.id 
          ? { ...cat, notes_count: cat.notes_count + 1 }
          : cat
      );
      setCategories(updatedCategories);
      setSelectedCategory({ ...selectedCategory, notes_count: selectedCategory.notes_count + 1 });
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
        category: editingNote.category
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

  const handleDeleteNote = async (noteId: number) => {
    try {
      await axios.delete(`${API_URL}/notes/${noteId}/`, {
        headers: getAuthHeaders()
      });
      
      setNotes(notes.filter(note => note.id !== noteId));
      
      // Update category notes count
      if (selectedCategory) {
        const updatedCategories = categories.map(cat => 
          cat.id === selectedCategory.id 
            ? { ...cat, notes_count: cat.notes_count - 1 }
            : cat
        );
        setCategories(updatedCategories);
        setSelectedCategory({ ...selectedCategory, notes_count: selectedCategory.notes_count - 1 });
      }
    } catch (error) {
      handleError(error, 'Failed to delete note');
    }
  };

  // 3. Add handlers for saving and closing NoteEditor
  const handleSaveNoteEditor = async (title: string, content: string, closeAfterSave = false) => {
    setIsSavingNote(true);
    if (isNewNoteEditor && selectedCategory) {
      try {
        const response = await axios.post(`${API_URL}/notes/`, {
          title: (title && title.trim()) ? title.trim() : 'Untitled Note',
          content,
          category: selectedCategory.id
        }, {
          headers: getAuthHeaders()
        });
        setNotes([response.data, ...notes]);
        // Update category notes count
        const updatedCategories = categories.map(cat => 
          cat.id === selectedCategory.id 
            ? { ...cat, notes_count: cat.notes_count + 1 }
            : cat
        );
        setCategories(updatedCategories);
        setSelectedCategory({ ...selectedCategory, notes_count: selectedCategory.notes_count + 1 });
        if (closeAfterSave) setShowNoteEditor(false);
      } catch (error) {
        handleError(error, 'Failed to create note');
      }
    } else if (noteEditorNote) {
      try {
        const response = await axios.put(`${API_URL}/notes/${noteEditorNote.id}/`, {
          title: title.trim(),
          content,
          category: noteEditorNote.category
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
        if (selectedCategory) {
          await fetchNotes(selectedCategory.id);
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
    navigate('/notes');
  };

  // Filter notes based on search term
  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add handler to update note title
  const handleUpdateNoteTitle = async (noteId: number, newTitle: string) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;
      const response = await axios.put(`${API_URL}/notes/${noteId}/`, {
        title: newTitle.trim() || 'Untitled Note',
        content: note.content,
        category: note.category
      }, {
        headers: getAuthHeaders()
      });
      const updatedNotes = notes.map(n => n.id === noteId ? response.data : n);
      setNotes(updatedNotes);
      if (selectedCategory) {
        await fetchNotes(selectedCategory.id);
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
          
          // Find the category for this note
          const category = categories.find(cat => cat.id === note.category);
          if (category) {
            setSelectedCategory(category);
            await fetchNotes(category.id);
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

    // Only try to open note if we have categories loaded
    if (categories.length > 0) {
      openNoteFromUrl();
    }
  }, [categories, noteIdFromUrl]);

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
          
          // Find the category for this note
          const category = categories.find(cat => cat.id === note.category);
          if (category) {
            setSelectedCategory(category);
            await fetchNotes(category.id);
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

    // Only try to open note if we have categories loaded
    if (categories.length > 0) {
      openNoteFromStorage();
    }
  }, [categories]); // Re-run when categories are loaded

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
      
      // Update category notes count
      if (selectedCategory) {
        const updatedCategories = categories.map(cat => 
          cat.id === selectedCategory.id 
            ? { ...cat, notes_count: cat.notes_count - noteIds.length }
            : cat
        );
        setCategories(updatedCategories);
        setSelectedCategory({ ...selectedCategory, notes_count: selectedCategory.notes_count - noteIds.length });
      }
    } catch (error) {
      handleError(error, 'Failed to delete notes');
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Notes
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create and manage your notes
            </p>
          </div>

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
          {/* Search Bar */}
          {selectedCategory && (
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="Search notes..."
            />
          )}
          {/* Main Content */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Categories Panel */}
            <CategoryList
              categories={categories}
              selectedCategory={selectedCategory}
              isAddingCategory={isAddingCategory}
              editingCategory={editingCategory}
              newCategoryName={newCategoryName}
              onCategorySelect={handleCategorySelect}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onStartAddingCategory={handleStartAddingCategory}
              onCancelAddingCategory={handleCancelAddingCategory}
              onStartEditingCategory={handleStartEditingCategory}
              onCancelEditingCategory={handleCancelEditingCategory}
              onCategoryNameChange={setNewCategoryName}
            />
            {/* Notes Panel */}
            <NotesList
              selectedCategory={selectedCategory}
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
              onDeleteNote={handleDeleteNote}
              onNoteTitleChange={(title) => setNewNote({ ...newNote, title })}
              onNoteContentChange={(content) => setNewNote({ ...newNote, content })}
              onUpdateNoteTitle={handleUpdateNoteTitle}
              onBulkDelete={handleBulkDeleteNotes}
            />
          </div>
          {/* NoteEditor Modal */}
          {showNoteEditor && (
            <NoteEditor
              note={noteEditorNote}
              isNewNote={isNewNoteEditor}
              onSave={handleSaveNoteEditor}
              onDelete={handleDeleteNote}
              onBack={handleCloseNoteEditor}
              isSaving={isSavingNote}
            />
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default Notes;


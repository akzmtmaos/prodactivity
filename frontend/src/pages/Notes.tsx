// frontend/src/pages/Notes.tsx
import React, { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosConfig';
import { useParams, useNavigate } from 'react-router-dom';
import NotebookList from '../components/notes/NotebookList';
import NotesList from '../components/notes/NotesList';
import NoteEditor from '../components/notes/NoteEditor';
import PageLayout from '../components/PageLayout';
import DeleteConfirmationModal from '../components/common/DeleteConfirmationModal';
import Toast from '../components/common/Toast';
import GlobalSearch from '../components/notes/GlobalSearch';
import ImportantItemsPanel from '../components/notes/ImportantItemsPanel';
import ColorPickerModal from '../components/notes/ColorPickerModal';
import { ChevronLeft, Plus, Book, Archive, Search, AlertTriangle } from 'lucide-react';
import NotesHeader from '../components/notes/NotesHeader';
import NotesTabs from '../components/notes/NotesTabs';

import NotebookAIInsights from '../components/notes/NotebookAIInsights';

interface Notebook {
  id: number;
  name: string;
  notebook_type: 'study' | 'meeting' | 'personal' | 'work' | 'project' | 'research' | 'other';
  urgency_level: 'normal' | 'important' | 'urgent' | 'critical';
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
  notes_count: number;
  is_archived: boolean;
  archived_at: string | null;
}

interface Note {
  id: number;
  title: string;
  content: string;
  notebook: number;
  notebook_name: string;
  notebook_type: string;
  notebook_urgency: string;
  notebook_color: string;
  note_type: 'lecture' | 'reading' | 'assignment' | 'exam' | 'meeting' | 'personal' | 'work' | 'project' | 'research' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_urgent: boolean;
  tags: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  is_archived: boolean;
  archived_at: string | null;
}



const Notes = () => {
  const { id: noteIdFromUrl } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for notebooks and notes
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [archivedNotebooks, setArchivedNotebooks] = useState<Notebook[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [archivedNotes, setArchivedNotes] = useState<Note[]>([]);
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

  // Search and filter state
  const [notebookSearchTerm, setNotebookSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'title' | 'content' | 'date'>('all');
  const [notebookFilterType, setNotebookFilterType] = useState<'all' | 'name' | 'date'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [notebookSortOrder, setNotebookSortOrder] = useState<'asc' | 'desc'>('asc');

  // Add tab state
  const [activeTab, setActiveTab] = useState<'notes' | 'logs' | 'archived'>('notes');
  const [activeNotebookTab, setActiveNotebookTab] = useState<'notebooks' | 'archived'>('notebooks');

  // Add toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Global search state
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  
  // Important items panel state
  const [showImportantItemsPanel, setShowImportantItemsPanel] = useState(false);

  // AI Insights panel state
  const [showAIInsights, setShowAIInsights] = useState(false);

  // Color picker modal state
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [notebookToColor, setNotebookToColor] = useState<Notebook | null>(null);

  // Hierarchical navigation state - NEW
  type ViewType = 'notebooks' | 'notes';
  const [currentView, setCurrentView] = useState<ViewType>('notebooks');
  




  // Fetch notebooks from API
  const fetchNotebooks = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const response = await axiosInstance.get(`/notes/notebooks/`);
      
      // Handle paginated response
      const notebooksData = response.data.results || response.data;
      
      console.log('Fetched notebooks data:', notebooksData);
      
      if (notebooksData) {
        // Get saved colors from localStorage
        const savedColors = JSON.parse(localStorage.getItem('notebookColors') || '{}');
        
        // Ensure each notebook has a color field with a default value
        const notebooksWithColors = notebooksData.map((notebook: any) => ({
          ...notebook,
          color: notebook.color || savedColors[notebook.id] || `hsl(${(notebook.id * 137.5) % 360}, 70%, 85%)`
        }));
        
        console.log('Notebooks with colors:', notebooksWithColors);
        setNotebooks(notebooksWithColors);
      } else {
        setNotebooks([]);
        setError('No notebooks found');
      }
    } catch (error: any) {
      console.error('Failed to fetch notebooks:', error);
      setError('Failed to fetch notebooks. Please try again.');
    }
  };

  // Fetch archived notebooks from API
  const fetchArchivedNotebooks = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const response = await axiosInstance.get(`/notes/archived/notebooks/`);
      
      // Handle paginated response
      const archivedNotebooksData = response.data.results || response.data;
      
      if (archivedNotebooksData) {
        // Get saved colors from localStorage
        const savedColors = JSON.parse(localStorage.getItem('notebookColors') || '{}');
        
        // Ensure each archived notebook has a color field with a default value
        const archivedNotebooksWithColors = archivedNotebooksData.map((notebook: any) => ({
          ...notebook,
          color: notebook.color || savedColors[notebook.id] || `hsl(${(notebook.id * 137.5) % 360}, 70%, 85%)`
        }));
        
        setArchivedNotebooks(archivedNotebooksWithColors);
      } else {
        setArchivedNotebooks([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch archived notebooks:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
  };

  // Fetch notes for selected notebook
  const fetchNotes = async (notebookId: number) => {
    try {
      const response = await axiosInstance.get(`/notes/?notebook=${notebookId}`);
      // Handle paginated response
      const notesData = response.data.results || response.data;
      
      // Get saved colors from localStorage
      const savedColors = JSON.parse(localStorage.getItem('notebookColors') || '{}');
      
      // Ensure each note has the notebook_color field
      const notesWithColors = (notesData || []).map((note: any) => ({
        ...note,
        notebook_color: note.notebook_color || savedColors[note.notebook] || `hsl(${(note.notebook * 137.5) % 360}, 70%, 85%)`
      }));
      
      setNotes(notesWithColors);
    } catch (error) {
      handleError(error, 'Failed to fetch notes');
    }
  };

  // Fetch archived notes
  const fetchArchivedNotes = async () => {
    try {
      const response = await axiosInstance.get(`/notes/archived/notes/`);
      // Handle paginated response
      const archivedNotesData = response.data.results || response.data;
      
      // Get saved colors from localStorage
      const savedColors = JSON.parse(localStorage.getItem('notebookColors') || '{}');
      
      // Ensure each archived note has the notebook_color field
      const archivedNotesWithColors = (archivedNotesData || []).map((note: any) => ({
        ...note,
        notebook_color: note.notebook_color || savedColors[note.notebook] || `hsl(${(note.notebook * 137.5) % 360}, 70%, 85%)`
      }));
      
      setArchivedNotes(archivedNotesWithColors);
    } catch (error) {
      handleError(error, 'Failed to fetch archived notes');
    }
  };

  // Notebook management functions
  const handleNotebookSelect = (notebook: Notebook) => {
    setSelectedNotebook(notebook);
    fetchNotes(notebook.id);
    setSearchTerm('');
    // Switch to notes view for both mobile and desktop
    setCurrentView('notes');
  };

  // Back button handler to return to notebooks view
  const handleBackToNotebooks = () => {
    setCurrentView('notebooks');
    setSelectedNotebook(null);
    setNotes([]);
    setSearchTerm('');
    setNotebookSearchTerm('');
    setFilterType('all');
    setNotebookFilterType('all');
  };

  const handleAddNotebook = async () => {
    if (!newNotebookName.trim()) return;
    
    try {
      const response = await axiosInstance.post(`/notes/notebooks/`, {
        name: newNotebookName.trim()
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
      const response = await axiosInstance.put(`/notes/notebooks/${editingNotebook.id}/`, {
        name: newNotebookName.trim()
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
            await axiosInstance.delete(`/notes/notebooks/${notebookId}/`);
      
      setNotebooks(notebooks.filter(nb => nb.id !== notebookId));
      
      if (selectedNotebook?.id === notebookId) {
        setSelectedNotebook(null);
        setNotes([]);
      }
    } catch (error) {
      handleError(error, 'Failed to delete notebook');
    }
  };

  // Archive/Unarchive notebook
  const handleArchiveNotebook = async (notebookId: number, archive: boolean) => {
    try {
      await axiosInstance.patch(`/notes/notebooks/${notebookId}/`, {
        is_archived: archive
      });
      
      if (archive) {
        // Move from active notebooks to archived notebooks
        const notebookToArchive = notebooks.find(nb => nb.id === notebookId);
        if (notebookToArchive) {
          const archivedNotebook = { ...notebookToArchive, is_archived: true, archived_at: new Date().toISOString() };
          setArchivedNotebooks([...archivedNotebooks, archivedNotebook]);
          setNotebooks(notebooks.filter(nb => nb.id !== notebookId));
          
          // If this was the selected notebook, clear selection
          if (selectedNotebook?.id === notebookId) {
            setSelectedNotebook(null);
            setNotes([]);
          }
        }
      } else {
        // Move from archived notebooks back to active notebooks
        const notebookToUnarchive = archivedNotebooks.find(nb => nb.id === notebookId);
        if (notebookToUnarchive) {
          const activeNotebook = { ...notebookToUnarchive, is_archived: false, archived_at: null };
          setNotebooks([...notebooks, activeNotebook]);
          setArchivedNotebooks(archivedNotebooks.filter(nb => nb.id !== notebookId));
        }
      }
      
      setToast({ 
        message: `Notebook ${archive ? 'archived' : 'unarchived'} successfully.`, 
        type: 'success' 
      });
    } catch (error) {
      handleError(error, `Failed to ${archive ? 'archive' : 'unarchive'} notebook`);
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
      const response = await axiosInstance.post(`/notes/`, {
        title: (newNote.title && newNote.title.trim()) ? newNote.title.trim() : 'Untitled Note',
        content: newNote.content,
        notebook: selectedNotebook.id
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
      await axiosInstance.patch(`/notes/${noteId}/`, {
        last_visited: new Date().toISOString()
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
      const response = await axiosInstance.put(`/notes/${editingNote.id}/`, {
        title: newNote.title.trim(),
        content: newNote.content,
        notebook: editingNote.notebook
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
      await axiosInstance.delete(`/notes/${noteId}/`);
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
  const handleSaveNoteEditor = async (title: string, content: string, priority: 'low' | 'medium' | 'high' | 'urgent', closeAfterSave = false) => {
    setIsSavingNote(true);
    if (isNewNoteEditor && selectedNotebook) {
      try {
        const response = await axiosInstance.post(`/notes/`, {
          title: title.trim() || 'Untitled Note',
          content,
          priority,
          notebook: selectedNotebook.id
        });
        setNotes([response.data, ...notes]);
        // Notify other parts of the app (e.g., Home quick notes) to refresh
        window.dispatchEvent(new Event('noteUpdated'));
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
        const response = await axiosInstance.put(`/notes/${noteEditorNote.id}/`, {
          title: title.trim() || 'Untitled Note',
          content,
          priority,
          notebook: noteEditorNote.notebook
        });
        
        // Update the note in the local state
        const updatedNotes = notes.map(note => 
          note.id === noteEditorNote.id ? response.data : note
        );
        setNotes(updatedNotes);
        // Notify other parts of the app (e.g., Home quick notes) to refresh
        window.dispatchEvent(new Event('noteUpdated'));
        
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

  // Global search state for notes and notebooks
  const [globalSearchResults, setGlobalSearchResults] = useState<{notes: Note[], notebooks: Notebook[]}>({notes: [], notebooks: []});
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);

  // Global search function
  const performGlobalSearch = async (query: string) => {
    if (!query.trim()) {
      setGlobalSearchResults({notes: [], notebooks: []});
      return;
    }

    setIsGlobalSearching(true);
    try {
      const response = await axiosInstance.get(`/notes/global-search/?q=${encodeURIComponent(query)}`);
      const results = response.data.results || [];
      
      // Separate notes and notebooks from results
      const notes = results.filter((item: any) => item.type === 'note').map((item: any) => ({
        ...item,
        notebook: item.notebook_id,
        notebook_name: item.notebook_name
      }));
      
      const notebooks = results.filter((item: any) => item.type === 'notebook');
      
      setGlobalSearchResults({notes, notebooks});
    } catch (error) {
      console.error('Global search failed:', error);
      setGlobalSearchResults({notes: [], notebooks: []});
    } finally {
      setIsGlobalSearching(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm || notebookSearchTerm) {
        const query = searchTerm || notebookSearchTerm;
        performGlobalSearch(query);
      } else {
        setGlobalSearchResults({notes: [], notebooks: []});
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, notebookSearchTerm]);

  // Local filtering and sorting logic
  const filteredNotes = notes
    .filter(note => {
      // Search term filter
      const term = searchTerm.toLowerCase();
      if (!term) return true; // If no search term, show all notes
      
      // Apply search filter based on filterType
      if (filterType === 'title') return note.title.toLowerCase().includes(term);
      if (filterType === 'content') return note.content.toLowerCase().includes(term);
      if (filterType === 'date') {
        const createdDate = new Date(note.created_at).toLocaleDateString().toLowerCase();
        const updatedDate = new Date(note.updated_at).toLocaleDateString().toLowerCase();
        return createdDate.includes(term) || updatedDate.includes(term);
      }
      // 'all' - search in all fields
      return (
        note.title.toLowerCase().includes(term) ||
        note.content.toLowerCase().includes(term) ||
        new Date(note.created_at).toLocaleDateString().toLowerCase().includes(term) ||
        new Date(note.updated_at).toLocaleDateString().toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      // Sort based on filterType
      if (filterType === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (filterType === 'content') {
        comparison = a.content.localeCompare(b.content);
      } else if (filterType === 'date') {
        // Sort by date
        comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      } else {
        // Default sort by most recent update
        comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      }
      // Apply sort order
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const filteredNotebooks = notebooks
    .filter(notebook => {
      const term = notebookSearchTerm.toLowerCase();
      if (!term) return true; // If no search term, show all notebooks
      
      // Apply search filter based on notebookFilterType
      if (notebookFilterType === 'name') return notebook.name.toLowerCase().includes(term);
      if (notebookFilterType === 'date') {
        const createdDate = new Date(notebook.created_at).toLocaleDateString().toLowerCase();
        const updatedDate = new Date(notebook.updated_at).toLocaleDateString().toLowerCase();
        return createdDate.includes(term) || updatedDate.includes(term);
      }
      // 'all' - search in all fields
      return (
        notebook.name.toLowerCase().includes(term) ||
        new Date(notebook.created_at).toLocaleDateString().toLowerCase().includes(term) ||
        new Date(notebook.updated_at).toLocaleDateString().toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      // Sort based on notebookFilterType
      if (notebookFilterType === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (notebookFilterType === 'date') {
        // Sort by date
        comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      } else {
        // Default sort by name
        comparison = a.name.localeCompare(b.name);
      }
      // Apply sort order
      return notebookSortOrder === 'asc' ? comparison : -comparison;
    });

  // Add handler to update note title
  const handleUpdateNoteTitle = async (noteId: number, newTitle: string) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;
      const response = await axiosInstance.put(`/notes/${noteId}/`, {
        title: newTitle.trim() || 'Untitled Note',
        content: note.content,
        notebook: note.notebook
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
          const response = await axiosInstance.get(`/notes/${noteIdFromUrl}/`);
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
  }, [notebooks, noteIdFromUrl, navigate]);

  // Add useEffect to handle notebook selection from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const notebookId = urlParams.get('notebook');
    
    if (notebookId && notebooks.length > 0) {
      const notebook = notebooks.find(nb => nb.id === parseInt(notebookId));
      if (notebook) {
        setSelectedNotebook(notebook);
        fetchNotes(notebook.id);
        setCurrentView('notes');
      }
    }
  }, [notebooks]);

  // Add useEffect to handle opening note from localStorage
  useEffect(() => {
    const openNoteFromStorage = async () => {
      const noteId = localStorage.getItem('openNoteId');
      
      if (noteId) {
        try {
          const response = await axiosInstance.get(`/notes/${noteId}/`);
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

  // Add keyboard shortcut for global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to open global search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
      // Escape to close global search
      if (e.key === 'Escape' && showGlobalSearch) {
        setShowGlobalSearch(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showGlobalSearch]);

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
        await axiosInstance.delete(`/notes/${noteId}/`);
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
      const response = await axiosInstance.post(`/notes/notebooks/`, {
        name: name.trim()
      });
      setNotebooks([...notebooks, response.data]);
    } catch (error) {
      handleError(error, 'Failed to create notebook');
    }
  };

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

  // Add useEffect to handle tab changes
  useEffect(() => {
    if (activeNotebookTab === 'archived') {
      fetchArchivedNotebooks();
    } else {
      fetchNotebooks();
    }
  }, [activeNotebookTab]);

  useEffect(() => {
    if (activeTab === 'archived') {
      fetchArchivedNotes();
    } else if (selectedNotebook) {
      fetchNotes(selectedNotebook.id);
    }
  }, [activeTab, selectedNotebook]);

  useEffect(() => {
    const initializeApp = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/login';
        return;
      }
      
      try {
        await fetchNotebooks();
        await fetchArchivedNotebooks(); // Fetch archived notebooks
        await fetchNotes(notebooks[0]?.id || 0); // Fetch notes for the first notebook if available
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
  }, []); // Only run once on mount

  // Handle color picker for notebooks
  const handleOpenColorPicker = (notebook: Notebook) => {
    setNotebookToColor(notebook);
    setShowColorPicker(true);
  };

  const handleCloseColorPicker = () => {
    setShowColorPicker(false);
    setNotebookToColor(null);
  };

  const handleColorSelect = async (color: string) => {
    if (!notebookToColor) return;

    try {
      console.log('Saving color:', color, 'for notebook:', notebookToColor.id);
      
      // Try to save to backend first
      try {
        const response = await axiosInstance.patch(`/notes/notebooks/${notebookToColor.id}/`, {
          color: color
        });
        console.log('Color save response:', response.data);
      } catch (backendError) {
        console.warn('Backend color save failed, using localStorage fallback:', backendError);
      }
      
      // Always save to localStorage as fallback
      const notebookColors = JSON.parse(localStorage.getItem('notebookColors') || '{}');
      notebookColors[notebookToColor.id] = color;
      localStorage.setItem('notebookColors', JSON.stringify(notebookColors));
      
      // Update the notebook in the local state
      const updatedNotebooks = notebooks.map(nb => 
        nb.id === notebookToColor.id ? { ...nb, color: color } : nb
      );
      setNotebooks(updatedNotebooks);
      
      // Update selected notebook if it's the one being colored
      if (selectedNotebook?.id === notebookToColor.id) {
        setSelectedNotebook({ ...selectedNotebook, color: color });
      }
      
      setToast({ 
        message: 'Notebook color updated successfully.', 
        type: 'success' 
      });
    } catch (error) {
      console.error('Color save error:', error);
      handleError(error, 'Failed to update notebook color');
    }
  };

  // Toggle Important status for note
  const handleToggleImportant = async (noteId: number) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;

      await axiosInstance.patch(`/notes/${noteId}/`, {
        is_urgent: !note.is_urgent
      });
      
      // Update the note in the local state
      const updatedNotes = notes.map(n => 
        n.id === noteId ? { ...n, is_urgent: !n.is_urgent } : n
      );
      setNotes(updatedNotes);
      
      setToast({ 
        message: `Note ${!note.is_urgent ? 'marked as important' : 'removed from important'}.`, 
        type: 'success' 
      });
    } catch (error) {
      handleError(error, 'Failed to update note importance');
    }
  };

  // Archive/Unarchive note
  const handleArchiveNote = async (noteId: number, archive: boolean) => {
    try {
      await axiosInstance.patch(`/notes/${noteId}/`, {
        is_archived: archive
      });
      
      if (archive) {
        // Move from active notes to archived notes
        const noteToArchive = notes.find(n => n.id === noteId);
        if (noteToArchive) {
          const archivedNote = { ...noteToArchive, is_archived: true, archived_at: new Date().toISOString() };
          setArchivedNotes([...archivedNotes, archivedNote]);
          setNotes(notes.filter(n => n.id !== noteId));
          
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
        }
      } else {
        // Move from archived notes back to active notes
        const noteToUnarchive = archivedNotes.find(n => n.id === noteId);
        if (noteToUnarchive) {
          const activeNote = { ...noteToUnarchive, is_archived: false, archived_at: null };
          setNotes([...notes, activeNote]);
          setArchivedNotes(archivedNotes.filter(n => n.id !== noteId));
          
          // Update notebook notes count
          if (selectedNotebook) {
            const updatedNotebooks = notebooks.map(nb => 
              nb.id === selectedNotebook.id 
                ? { ...nb, notes_count: nb.notes_count + 1 }
                : nb
            );
            setNotebooks(updatedNotebooks);
            setSelectedNotebook({ ...selectedNotebook, notes_count: selectedNotebook.notes_count + 1 });
          }
        }
      }
      
      setToast({ 
        message: `Note ${archive ? 'archived' : 'unarchived'} successfully.`, 
        type: 'success' 
      });
    } catch (error) {
      handleError(error, `Failed to ${archive ? 'archive' : 'unarchive'} note`);
    }
  };

  // Debug logging
  console.log('Current state:', {
    loading,
    currentView,
    notebooks: notebooks.length,
    selectedNotebook,
    error,
    notebooksData: notebooks
  });

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
          <NotesHeader
            currentView={currentView}
            selectedNotebook={selectedNotebook}
            notesCount={notes.length}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterType={filterType}
            setFilterType={setFilterType}
            notebookSearchTerm={notebookSearchTerm}
            setNotebookSearchTerm={setNotebookSearchTerm}
            notebookFilterType={notebookFilterType}
            setNotebookFilterType={setNotebookFilterType}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            notebookSortOrder={notebookSortOrder}
            setNotebookSortOrder={setNotebookSortOrder}
            onBackToNotebooks={handleBackToNotebooks}
            onGlobalSearch={() => setShowGlobalSearch(true)}
            onAIInsights={() => setShowAIInsights(true)}
            isSearching={isGlobalSearching}
          />
          
          {/* Tabs styled like Settings - Show for both notebooks and notes */}
          <NotesTabs
            currentView={currentView}
            activeTab={activeTab}
            setActiveTab={setActiveTab as (tab: 'notes' | 'logs' | 'archived') => void}
            activeNotebookTab={activeNotebookTab}
            setActiveNotebookTab={setActiveNotebookTab as (tab: 'notebooks' | 'archived') => void}
          />
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
          <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow h-[calc(100vh-8rem)] flex flex-col">
            {/* Header with back button when viewing notes */}
            {currentView === 'notes' && selectedNotebook && activeTab === 'notes' && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <button
                      onClick={handleBackToNotebooks}
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
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <Plus size={16} />
                    <span className="font-medium">Add Note</span>
                  </button>
                </div>
              </div>
            )}

            {/* Header with back button when viewing archived notes - no Add button */}
            {currentView === 'notes' && selectedNotebook && activeTab === 'archived' && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <button
                      onClick={handleBackToNotebooks}
                      className="p-2 mr-3 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {selectedNotebook.name} - Archived
                      </h2>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {archivedNotes.length} archived notes
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {currentView.includes('notebook') && (
                <>
                  {activeNotebookTab === 'notebooks' && (
                    <>
                      {notebooks.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="text-gray-400 dark:text-gray-500 mb-4">
                              <Book size={48} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                              No notebooks yet
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                              Create your first notebook to get started
                            </p>
                            <button
                              onClick={() => {/* This will be handled by the NotebookList component */}}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              Create Notebook
                            </button>
                          </div>
                        </div>
                      ) : filteredNotebooks.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="text-gray-400 dark:text-gray-500 mb-4">
                              <Book size={48} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                              No notebooks found
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                              Try adjusting your search terms
                            </p>
                            <button
                              onClick={() => setNotebookSearchTerm('')}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              Clear Search
                            </button>
                          </div>
                        </div>
                      ) : (
                        <NotebookList
                          notebooks={filteredNotebooks}
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
                          onArchiveNotebook={handleArchiveNotebook}
                          onColorChange={handleOpenColorPicker}
                          showAddButton={true}
                        />
                      )}
                    </>
                  )}
                  {activeNotebookTab === 'archived' && (
                    <>
                      {archivedNotebooks.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="text-gray-400 dark:text-gray-500 mb-4">
                              <Archive size={48} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                              No archived notebooks
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                              Archived notebooks will appear here
                            </p>
                          </div>
                        </div>
                      ) : (
                        <NotebookList
                          notebooks={archivedNotebooks}
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
                          onArchiveNotebook={handleArchiveNotebook}
                          onColorChange={handleOpenColorPicker}
                          showAddButton={false}
                        />
                      )}
                    </>
                  )}
                </>
              )}
              {currentView.includes('note') && !currentView.includes('notebook') && (
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
                  onArchiveNote={handleArchiveNote}
                  onToggleImportant={handleToggleImportant}
                  deletingNoteId={noteToDelete?.id || null}
                />
              )}
              {/* Fallback for debugging */}
              {!currentView.includes('notebook') && !currentView.includes('note') && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Debug: Current view is "{currentView}"
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      This should not happen. Please check the console for more details.
                    </p>
                  </div>
                </div>
              )}
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
          {currentView === 'notes' && activeTab === 'archived' && (
            <>
              {archivedNotes.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-gray-400 dark:text-gray-500 mb-4">
                      <Archive size={48} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No archived notes
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Archived notes will appear here
                    </p>
                  </div>
                </div>
              ) : (
                <NotesList
                  selectedNotebook={selectedNotebook}
                  notes={archivedNotes}
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
                    const note = archivedNotes.find(n => n.id === noteId);
                    if (note) handleRequestDeleteNote(note);
                  }}
                  onNoteTitleChange={(title) => setNewNote({ ...newNote, title })}
                  onNoteContentChange={(content) => setNewNote({ ...newNote, content })}
                  onUpdateNoteTitle={handleUpdateNoteTitle}
                  onBulkDelete={handleBulkDeleteNotes}
                  onArchiveNote={handleArchiveNote}
                  onToggleImportant={handleToggleImportant}
                  deletingNoteId={noteToDelete?.id || null}
                />
              )}
            </>
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
      
      {/* Global Search Modal */}
      <GlobalSearch
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
      />
      
      {/* Important Items Panel */}
      <ImportantItemsPanel
        isOpen={showImportantItemsPanel}
        onClose={() => setShowImportantItemsPanel(false)}
        onNoteClick={(note) => {
          // Find the notebook for this note and navigate to it
          const notebook = notebooks.find(nb => nb.id === note.notebook);
          if (notebook) {
            setSelectedNotebook(notebook);
            fetchNotes(notebook.id);
            setCurrentView('notes');
            // Open the note in editor
            setNoteEditorNote(note);
            setIsNewNoteEditor(false);
            setShowNoteEditor(true);
          }
          setShowImportantItemsPanel(false);
        }}
        onNotebookClick={(notebook) => {
          setSelectedNotebook(notebook);
          fetchNotes(notebook.id);
          setCurrentView('notes');
          setShowImportantItemsPanel(false);
        }}
      />

      {/* AI Insights Panel */}
      {selectedNotebook && (
        <NotebookAIInsights
          notebook={selectedNotebook}
          notes={notes}
          isOpen={showAIInsights}
          onClose={() => setShowAIInsights(false)}
        />
      )}

      {/* Color Picker Modal */}
      <ColorPickerModal
        isOpen={showColorPicker}
        onClose={handleCloseColorPicker}
        onColorSelect={handleColorSelect}
        currentColor={notebookToColor?.color || '#3b82f6'}
        title={`Choose color for "${notebookToColor?.name || 'Notebook'}"`}
      />
    </PageLayout>
  );
};

export default Notes;


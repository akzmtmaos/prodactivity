// frontend/src/pages/Notes.tsx
import React, { useEffect, useState, useRef } from 'react';
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
import CreateNotebookModal from '../components/notes/CreateNotebookModal';
import { ChevronLeft, Plus, Book, Archive, Search, AlertTriangle, Star } from 'lucide-react';
import NotesHeader from '../components/notes/NotesHeader';
import NotesTabs from '../components/notes/NotesTabs';

import NotebookAIInsights from '../components/notes/NotebookAIInsights';

// Generate organized colors with better visual progression (same as ColorPickerModal)
const generateNotebookColor = (notebookId: number): string => {
  const hueSteps = [0, 15, 30, 45, 60, 90, 120, 150, 180, 210, 240, 270];
  const saturation = 70;
  const lightness = 85;
  const hue = hueSteps[notebookId % hueSteps.length];
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const NOTEBOOKS_CACHE_KEY = 'cachedNotebooksV1';

// Helper function to update notebook cache
const updateNotebookCache = (notebooks: Notebook[]) => {
  try {
    localStorage.setItem(NOTEBOOKS_CACHE_KEY, JSON.stringify({ 
      ts: Date.now(), 
      data: notebooks 
    }));
  } catch (error) {
    console.warn('Failed to update notebook cache:', error);
  }
};

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
  is_favorite?: boolean;
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
  const { notebookId, noteId: noteIdFromUrl } = useParams();
  const navigate = useNavigate();
  
  // Debug URL params
  // console.log('🔗 URL Params from useParams:', { notebookId, noteIdFromUrl });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for notebooks and notes
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [archivedNotebooks, setArchivedNotebooks] = useState<Notebook[]>([]);
  const [favoriteNotebooks, setFavoriteNotebooks] = useState<Notebook[]>([]);
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
  const [filterType, setFilterType] = useState<'title' | 'content' | 'date'>('title');
  const [notebookFilterType, setNotebookFilterType] = useState<'name' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [notebookSortOrder, setNotebookSortOrder] = useState<'asc' | 'desc'>('asc');

  // Add tab state
  const [activeTab, setActiveTab] = useState<'notes' | 'logs' | 'archived'>('notes');
  const [activeNotebookTab, setActiveNotebookTab] = useState<'notebooks' | 'favorites' | 'archived'>('notebooks');

  // Add toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  // Bulk selection state for inline Delete Selected
  const [selectedForBulk, setSelectedForBulk] = useState<number[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  
  // Bulk delete function for notebooks
  const handleBulkDeleteNotebooks = async (notebookIds: number[]) => {
    try {
      console.log('Bulk deleting notebooks with IDs:', notebookIds);
      
      // Backend now supports soft delete for notebooks
      console.log('Using soft delete for bulk notebook deletion');
      const responses = await Promise.allSettled(
        notebookIds.map(notebookId => {
          console.log('Sending PATCH request for notebook ID:', notebookId);
          return axiosInstance.patch(`/notes/notebooks/${notebookId}/`, {
            is_deleted: true,
            deleted_at: new Date().toISOString()
          });
        })
      );
      
      console.log('Bulk delete responses:', responses);
      
      // Check for any failures
      const failures = responses.filter(response => response.status === 'rejected') as PromiseRejectedResult[];
      if (failures.length > 0) {
        console.error('Some notebook deletions failed:', failures);
        failures.forEach((failure, index) => {
          console.error(`Failed to delete notebook ${notebookIds[index]}:`, failure.reason);
        });
      }
      
      const successes = responses.filter(response => response.status === 'fulfilled');
      console.log('Successful deletions:', successes.length);
      
      // Only update the UI if there were successful deletions
      if (successes.length > 0) {
        // Get the IDs of successfully deleted notebooks
        const successfulIds = notebookIds.filter((id, index) => {
          return responses[index].status === 'fulfilled';
        });
        
        // Update the notebooks list only for successfully deleted ones
        setNotebooks(notebooks.filter(notebook => !successfulIds.includes(notebook.id)));
        
        // Clear selection if any of the successfully deleted notebooks was selected
        if (selectedNotebook && successfulIds.includes(selectedNotebook.id)) {
          setSelectedNotebook(null);
          setNotes([]);
        }
        
        setToast({ message: `${successfulIds.length} notebook${successfulIds.length > 1 ? 's' : ''} moved to trash!`, type: 'success' });
      } else {
        setToast({ message: 'Failed to delete notebooks. Please try again.', type: 'error' });
      }
    } catch (error) {
      console.error('Error in bulk delete notebooks:', error);
      handleError(error, 'Failed to delete notebooks');
    }
  };

  // Global search state
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  
  // Important items panel state
  const [showImportantItemsPanel, setShowImportantItemsPanel] = useState(false);

  // AI Insights panel state
  const [showAIInsights, setShowAIInsights] = useState(false);

  // Color picker modal state
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [notebookToColor, setNotebookToColor] = useState<Notebook | null>(null);

  // Create notebook modal state
  const [showCreateNotebookModal, setShowCreateNotebookModal] = useState(false);

  // Hierarchical navigation state - NEW
  type ViewType = 'notebooks' | 'notes';
  const [currentView, setCurrentView] = useState<ViewType>('notebooks');
  
  // Fetch notebooks from API
  const fetchNotebooks = async () => {
    // Prevent duplicate calls if already fetching
    if (notebooks.length > 0) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('📡 Fetching notebooks from baseURL:', (axiosInstance.defaults as any).baseURL);
      }

      let response;
      try {
        // Use a shorter timeout specifically for notebooks for snappier UI
        // Exclude deleted notebooks from the main notebooks list
        console.log('📡 Fetching notebooks with filter: /notes/notebooks/?is_deleted=false');
        response = await axiosInstance.get(`/notes/notebooks/?is_deleted=false`, { timeout: 4000 });
      } catch (err: any) {
        console.log('❌ Filtered fetch failed, trying without filter:', err);
        // One quick retry after 300ms in case of transient network issues
        await new Promise(r => setTimeout(r, 300));
        console.log('📡 Fetching notebooks without filter: /notes/notebooks/');
        response = await axiosInstance.get(`/notes/notebooks/`, { timeout: 5000 });
      }
      
      // Handle paginated response
      const notebooksData = response.data.results || response.data;
      
      console.log('Fetched notebooks data:', notebooksData);
      
      if (notebooksData) {
        // Get saved colors and cached notebooks (to preserve favorites)
        const savedColors = JSON.parse(localStorage.getItem('notebookColors') || '{}');
        const cached = localStorage.getItem(NOTEBOOKS_CACHE_KEY);
        const favoritesOverrideRaw = localStorage.getItem('NOTEBOOKS_FAVORITES_OVERRIDE');
        const cachedMap: Record<number, any> = {};
        const favoritesOverride: Record<number, boolean> = favoritesOverrideRaw ? JSON.parse(favoritesOverrideRaw) : {};
        try {
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && Array.isArray(parsed.data)) {
              for (const nb of parsed.data) {
                cachedMap[nb.id] = nb;
              }
            }
          }
        } catch {}

        // Ensure each notebook has a color field and preserve cached is_favorite when server is stale/undefined
        const notebooksWithColors = notebooksData.map((notebook: any) => {
          const cachedNb = cachedMap[notebook.id];
          // Apply favorites override first, then server, then cache
          const favorite = (favoritesOverride && Object.prototype.hasOwnProperty.call(favoritesOverride, notebook.id))
            ? favoritesOverride[notebook.id]
            : (typeof notebook.is_favorite === 'boolean'
                ? notebook.is_favorite
                : (cachedNb?.is_favorite ?? false));
          return {
            ...notebook,
            is_favorite: favorite,
            color: notebook.color || savedColors[notebook.id] || generateNotebookColor(notebook.id)
          };
        });
        
        console.log('Notebooks with colors:', notebooksWithColors);
        setNotebooks(notebooksWithColors);
        // Cache for instant next-load hydration
        try {
          localStorage.setItem(NOTEBOOKS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: notebooksWithColors }));
        } catch {}
      } else {
        setNotebooks([]);
        setError('No notebooks found');
      }
    } catch (error: any) {
      // Surface precise diagnostics
      const status = error?.response?.status;
      const detail = error?.response?.data || error?.message;
      console.error('❌ Failed to fetch notebooks:', { status, detail });
      if (status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      setError(`Failed to fetch notebooks${status ? ` (HTTP ${status})` : ''}. Please try again.`);
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

        // this is a comment statement statement j
        
        // Ensure each archived notebook has a color field with a default value
        const archivedNotebooksWithColors = archivedNotebooksData.map((notebook: any) => ({
          ...notebook,
          color: notebook.color || savedColors[notebook.id] || generateNotebookColor(notebook.id)
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

  // Update favorites whenever notebooks change
  useEffect(() => {
    const favorites = notebooks.filter(nb => nb.is_favorite);
    setFavoriteNotebooks(favorites);
  }, [notebooks]);

  // Fetch notes for selected notebook
  const fetchNotes = async (notebookId: number) => {
    // Prevent duplicate calls for the same notebook
    if (selectedNotebook && selectedNotebook.id === notebookId && notes.length > 0) {
      return;
    }

    try {
      console.log(`📥 Fetching notes for notebook ID: ${notebookId}`);
      const response = await axiosInstance.get(`/notes/?notebook=${notebookId}`);
      // Handle paginated response
      const notesData = response.data.results || response.data;
      
      console.log(`📝 Received ${notesData.length} notes for notebook ${notebookId}:`);
      notesData.forEach((note: any) => {
        console.log(`  - Note ID: ${note.id}, Title: "${note.title}", Notebook: ${note.notebook}, Notebook Name: "${note.notebook_name}"`);
      });
      
      // Check for mismatched notes
      const mismatches = notesData.filter((note: any) => note.notebook !== notebookId);
      if (mismatches.length > 0) {
        console.error(`❌ MISMATCH DETECTED! ${mismatches.length} notes don't belong to notebook ${notebookId}:`);
        mismatches.forEach((note: any) => {
          console.error(`  ⚠️ Note "${note.title}" (ID: ${note.id}) belongs to notebook ${note.notebook}, not ${notebookId}`);
        });
      }
      
      // Get saved colors from localStorage
      const savedColors = JSON.parse(localStorage.getItem('notebookColors') || '{}');
      
      // Ensure each note has the notebook_color field
      const notesWithColors = (notesData || []).map((note: any) => ({
        ...note,
        notebook_color: note.notebook_color || savedColors[note.notebook] || generateNotebookColor(note.notebook)
      }));
      
      console.log(`✅ Setting ${notesWithColors.length} notes to state for notebook ${notebookId}`);
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
        notebook_color: note.notebook_color || savedColors[note.notebook] || generateNotebookColor(note.notebook)
      }));
      
      setArchivedNotes(archivedNotesWithColors);
    } catch (error) {
      handleError(error, 'Failed to fetch archived notes');
    }
  };

  // Notebook management functions
  const handleNotebookSelect = (notebook: Notebook) => {
    // Clear notes FIRST to prevent showing old notes
    setNotes([]);
    setArchivedNotes([]);
    
    setSelectedNotebook(notebook);
    
    // Save to localStorage to preserve selection across hot reloads
    localStorage.setItem('lastSelectedNotebookId', String(notebook.id));
    
    fetchNotes(notebook.id);
    setSearchTerm('');
    setSelectedForBulk([]); // Clear selection when selecting a different notebook
    // Switch to notes view for both mobile and desktop
    setCurrentView('notes');
    
    // Update URL to reflect notebook selection (but don't rely on URL parsing for state)
    navigate(`/notes/notebooks/${notebook.id}`, { replace: true });
  };

  // Back button handler to return to notebooks view
  const handleBackToNotebooks = () => {
    // Clear all state first
    setSelectedNotebook(null);
    setNotes([]);
    setArchivedNotes([]);
    setSearchTerm('');
    setNotebookSearchTerm('');
    setFilterType('title');
    setNotebookFilterType('name');
    setSelectedForBulk([]); // Clear selection when going back to notebooks
    
    // Clear the saved notebook selection
    localStorage.removeItem('lastSelectedNotebookId');
    
    // Update URL to return to main notes page
    navigate('/notes');
    
    // Set view to notebooks AFTER navigation
    setCurrentView('notebooks');
  };

  const handleAddNotebook = async () => {
    if (!newNotebookName.trim()) return;
    
    // Optimistic UI update - show the notebook immediately
    const tempId = Date.now(); // Temporary ID for optimistic update
    const optimisticColor = generateNotebookColor(tempId); // Store color to preserve it
    const optimisticNotebook = {
      id: tempId,
      name: newNotebookName.trim(),
      notebook_type: 'other' as const,
      urgency_level: 'normal' as const,
      description: '',
      color: optimisticColor,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes_count: 0,
      is_archived: false,
      archived_at: null,
      is_favorite: false
    };
    
    // Add optimistic notebook immediately for instant feedback
    setNotebooks(prev => [optimisticNotebook, ...prev]);
    setEditingNotebook(null);
    setNewNotebookName('');
    setToast({ message: 'Notebook created successfully!', type: 'success' });
    
    try {
      console.log('📝 Creating new notebook:', newNotebookName.trim());
      const response = await axiosInstance.post(`/notes/notebooks/`, {
        name: newNotebookName.trim()
      });
      console.log('✅ Notebook creation response:', response.data);
      
      // Replace optimistic notebook with real server response
      // ALWAYS preserve the original optimistic color to prevent color changes on refresh
      const realNotebook = {
        ...response.data,
        color: optimisticColor // Always use the optimistic color, never generate a new one
      };
      
      // Update cache with the new notebook and save color to localStorage
      setNotebooks(prev => {
        const updated = prev.map(nb => nb.id === tempId ? realNotebook : nb);
        updateNotebookCache(updated);
        
        // Save the color to localStorage with the real ID
        const notebookColors = JSON.parse(localStorage.getItem('notebookColors') || '{}');
        notebookColors[realNotebook.id] = optimisticColor;
        localStorage.setItem('notebookColors', JSON.stringify(notebookColors));
        
        return updated;
      });
      
    } catch (error) {
      // Remove optimistic notebook on error
      setNotebooks(prev => prev.filter(nb => nb.id !== tempId));
      handleError(error, 'Failed to create notebook');
      setToast({ message: 'Failed to create notebook', type: 'error' });
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
      setToast({ message: 'Notebook updated successfully!', type: 'success' });
    } catch (error) {
      handleError(error, 'Failed to update notebook');
    }
  };

  const handleDeleteNotebook = async (notebookId: number) => {
    try {
      console.log('Deleting notebook with ID:', notebookId);
      console.log('Sending PATCH request to:', `/notes/notebooks/${notebookId}/`);
      
      // First, let's check what the current notebook data looks like
      try {
        const currentData = await axiosInstance.get(`/notes/notebooks/${notebookId}/`);
        console.log('Current notebook data:', currentData.data);
      } catch (getError) {
        console.log('Failed to get current notebook data:', getError);
      }
      
      // Backend now supports soft delete for notebooks
      console.log('Attempting soft delete for notebook ID:', notebookId);
      let deleteSuccessful = false;
      try {
        const response = await axiosInstance.patch(`/notes/notebooks/${notebookId}/`, {
          is_deleted: true,
          deleted_at: new Date().toISOString()
        });
        console.log('Soft delete successful:', response.status);
        deleteSuccessful = true;
      } catch (deleteError: any) {
        console.error('Soft delete failed:', deleteError);
        if (deleteError.response?.status === 404) {
          console.log('Notebook not found (404) - might already be deleted');
          // Treat 404 as success since notebook is gone
          deleteSuccessful = true;
        } else {
          throw deleteError;
        }
      }
      
      // Only update the UI if the delete was successful
      if (deleteSuccessful) {
        setNotebooks(notebooks.filter(nb => nb.id !== notebookId));
        
        if (selectedNotebook?.id === notebookId) {
          setSelectedNotebook(null);
          setNotes([]);
        }
        setToast({ message: 'Notebook moved to trash!', type: 'success' });
      } else {
        setToast({ message: 'Failed to delete notebook. Please try again.', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting notebook:', error);
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

  // Toggle favorite status for notebook
  const handleToggleFavorite = async (notebookId: number) => {
    try {
      const notebook = notebooks.find(nb => nb.id === notebookId);
      if (!notebook) return;

      const newFavoriteStatus = !notebook.is_favorite;

      console.log('⭐ Toggling favorite for notebook:', notebookId, 'New status:', newFavoriteStatus);

      await axiosInstance.patch(`/notes/notebooks/${notebookId}/`, {
        is_favorite: newFavoriteStatus
      });
      
      // Update the notebook in the local state
      const updatedNotebooks = notebooks.map(nb => 
        nb.id === notebookId ? { ...nb, is_favorite: newFavoriteStatus } : nb
      );
      setNotebooks(updatedNotebooks);
      // Persist favorites override map immediately to survive refresh even if server is stale
      try {
        const overrideRaw = localStorage.getItem('NOTEBOOKS_FAVORITES_OVERRIDE');
        const override = overrideRaw ? JSON.parse(overrideRaw) : {};
        override[notebookId] = newFavoriteStatus;
        localStorage.setItem('NOTEBOOKS_FAVORITES_OVERRIDE', JSON.stringify(override));
      } catch {}
      // Persist to local cache so favorites survive refresh even if network is slow
      try {
        localStorage.setItem(NOTEBOOKS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: updatedNotebooks }));
      } catch {}
      
      console.log('✅ Updated notebooks state');

      // Update selected notebook if it's the one being toggled
      if (selectedNotebook?.id === notebookId) {
        setSelectedNotebook({ ...selectedNotebook, is_favorite: newFavoriteStatus });
      }

      // Favorites list will be updated automatically by useEffect
      console.log('✅ Favorite status toggled successfully');
      
      setToast({ 
        message: `Notebook ${newFavoriteStatus ? 'added to' : 'removed from'} favorites.`, 
        type: 'success' 
      });
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
      handleError(error, 'Failed to update favorite status');
    }
  };

  // Note management functions
  const handleStartAddingNote = () => {
    setIsNewNoteEditor(true);
    setNoteEditorNote(null); // Clear the previous note
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
        note_type: 'other',
        priority: 'medium',
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
      setToast({ message: 'Note created successfully!', type: 'success' });
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
    
    // Update URL with notebook and note ID
    if (selectedNotebook) {
      navigate(`/notes/notebooks/${selectedNotebook.id}/notes/${note.id}`);
    } else {
      // Fallback: navigate to main notes page if no notebook selected
      navigate('/notes');
    }
    
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
      setToast({ message: 'Note updated successfully!', type: 'success' });
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
  const isSavingRef = useRef(false);
  
  const handleSaveNoteEditor = async (title: string, content: string, priority: 'low' | 'medium' | 'high' | 'urgent', closeAfterSave = false) => {
    // Prevent duplicate saves
    if (isSavingRef.current) {
      console.log('⚠️ Save already in progress, skipping duplicate call');
      return;
    }
    
    isSavingRef.current = true;
    setIsSavingNote(true);
    
    if (isNewNoteEditor && selectedNotebook) {
      try {
        const response = await axiosInstance.post(`/notes/`, {
          title: title.trim() || 'Untitled Note',
          content,
          priority,
          note_type: 'other',
          notebook: selectedNotebook.id
        });
        setNotes([response.data, ...notes]);
        // Notify other parts of the app (e.g., Home quick notes) to refresh
        window.dispatchEvent(new Event('noteUpdated'));
        // Switch to edit mode after first save to prevent duplicates
        setNoteEditorNote(response.data);
        setIsNewNoteEditor(false);
        
        // Only update URL if not closing after save (for autosave)
        // If closeAfterSave is true, we'll close the editor instead
        if (!closeAfterSave) {
          // Update URL to include the new note ID with notebook context
          if (selectedNotebook) {
            navigate(`/notes/notebooks/${selectedNotebook.id}/notes/${response.data.id}`);
          } else {
            // Fallback: navigate to main notes page if no notebook selected
            navigate('/notes');
          }
        }
        
        // Update notebook notes count
        const updatedNotebooks = notebooks.map(nb => 
          nb.id === selectedNotebook.id 
            ? { ...nb, notes_count: nb.notes_count + 1 }
            : nb
        );
        setNotebooks(updatedNotebooks);
        setSelectedNotebook({ ...selectedNotebook, notes_count: selectedNotebook.notes_count + 1 });
        setToast({ message: 'Note created successfully!', type: 'success' });
        if (closeAfterSave) setShowNoteEditor(false);
      } catch (error) {
        handleError(error, 'Failed to create note');
      } finally {
        isSavingRef.current = false;
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
        
        // Only show toast for manual saves, not autosaves
        if (closeAfterSave) {
          setToast({ message: 'Note updated successfully!', type: 'success' });
          setShowNoteEditor(false);
        }
      } catch (error) {
        handleError(error, 'Failed to update note');
      } finally {
        isSavingRef.current = false;
      }
    }
    
    // Always reset the saving flag
    setIsSavingNote(false);
    isSavingRef.current = false;
  };
  const isClosingEditorRef = useRef(false);
  
  const handleCloseNoteEditor = () => {
    // Set flag to indicate we're intentionally closing the editor
    isClosingEditorRef.current = true;
    
    setShowNoteEditor(false);
    setNoteEditorNote(null);
    setIsNewNoteEditor(false);
    setNewNote({ title: '', content: '' });
    
    // Navigate back to the appropriate view
    if (selectedNotebook) {
      navigate(`/notes/notebooks/${selectedNotebook.id}`);
    } else {
      navigate('/notes');
    }
    
    // Reset flags after navigation
    setTimeout(() => {
      hasOpenedNoteFromUrlRef.current = null;
      isClosingEditorRef.current = false;
    }, 100);
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
      // Default to title search
      return note.title.toLowerCase().includes(term);
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
      // Default to name search
      return notebook.name.toLowerCase().includes(term);
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
  const hasOpenedNoteFromUrlRef = useRef<string | null>(null);
  
  useEffect(() => {
    const openNoteFromUrl = async () => {
      // Skip if we're intentionally closing the editor
      if (isClosingEditorRef.current) {
        return;
      }
      
      // Skip if we already opened this note or if no note ID in URL
      if (!noteIdFromUrl || hasOpenedNoteFromUrlRef.current === noteIdFromUrl) {
        return;
      }
      
      try {
        const response = await axiosInstance.get(`/notes/${noteIdFromUrl}/`);
        const note = response.data;
        
        // Find the notebook for this note
        const notebook = notebooks.find(nb => nb.id === note.notebook);
        if (notebook) {
          setSelectedNotebook(notebook);
          setCurrentView('notes');
          await fetchNotes(notebook.id);
        }
        
        // Open the note in the editor
        setNoteEditorNote(note);
        setIsNewNoteEditor(false);
        setShowNoteEditor(true);
        
        // Mark this note as opened to prevent reopening
        hasOpenedNoteFromUrlRef.current = noteIdFromUrl;
      } catch (error) {
        console.error('Failed to fetch note:', error);
        // If note not found, redirect to notes page
        navigate('/notes');
      }
    };

    // Only try to open note if we have notebooks loaded
    if (notebooks.length > 0 && noteIdFromUrl) {
      openNoteFromUrl();
    }
    
    // Reset the flag when URL changes to no note
    if (!noteIdFromUrl) {
      hasOpenedNoteFromUrlRef.current = null;
    }
  }, [notebooks, noteIdFromUrl, navigate]);

  // Add useEffect to handle URL-based navigation (only for direct URL access/refresh)
  useEffect(() => {
    if (notebooks.length > 0) {
      if (notebookId) {
        // URL has notebook ID: /notes/notebooks/{id} or /notes/notebooks/{id}/notes/{noteId}
        const parsedNotebookId = parseInt(notebookId);
        const notebook = notebooks.find(nb => nb.id === parsedNotebookId);
        
        if (notebook && (!selectedNotebook || selectedNotebook.id !== notebook.id)) {
          setSelectedNotebook(notebook);
          setCurrentView('notes');
          fetchNotes(notebook.id);
          setSelectedForBulk([]); // Clear selection when navigating to a notebook
          
          // If there's a note ID in the URL, open that note
          if (noteIdFromUrl) {
            const parsedNoteId = parseInt(noteIdFromUrl);
            const note = notes.find(n => n.id === parsedNoteId);
            if (note) {
              setNoteEditorNote(note);
              setIsNewNoteEditor(false);
              setShowNoteEditor(true);
            }
          }
        }
      } else if (noteIdFromUrl) {
        // Legacy URL: /notes/{id} - just open the note
        const parsedNoteId = parseInt(noteIdFromUrl);
        const note = notes.find(n => n.id === parsedNoteId);
        if (note) {
          const notebook = notebooks.find(nb => nb.id === note.notebook);
          if (notebook && (!selectedNotebook || selectedNotebook.id !== notebook.id)) {
            setSelectedNotebook(notebook);
            setCurrentView('notes');
            fetchNotes(notebook.id);
            setNoteEditorNote(note);
            setIsNewNoteEditor(false);
            setShowNoteEditor(true);
          }
        }
      } else {
        // Main notes page: /notes - ensure we show notebooks view
        if (currentView !== 'notebooks' || selectedNotebook) {
          setCurrentView('notebooks');
          setSelectedNotebook(null);
          setNotes([]);
        }
      }
    }
  }, [notebooks, notebookId, noteIdFromUrl]); // Removed currentView and selectedNotebook from dependencies

  // Add useEffect to handle opening note from localStorage
  const hasOpenedNoteFromStorageRef = useRef(false);
  
  useEffect(() => {
    const openNoteFromStorage = async () => {
      // Only run once
      if (hasOpenedNoteFromStorageRef.current) {
        return;
      }
      
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
          
          // Mark as opened to prevent reopening
          hasOpenedNoteFromStorageRef.current = true;
        } catch (error) {
          console.error('Failed to fetch note:', error);
        }
      }
    };

    // Only try to open note if we have notebooks loaded
    if (notebooks.length > 0 && !hasOpenedNoteFromStorageRef.current) {
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
      // Delete all notes in parallel for much faster performance
      await Promise.all(
        noteIds.map(noteId => axiosInstance.delete(`/notes/${noteId}/`))
      );
      
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
      setToast({ message: `${noteIds.length} note${noteIds.length > 1 ? 's' : ''} deleted successfully!`, type: 'success' });
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
    
    // Optimistic UI update - show the notebook immediately
    const tempId = Date.now(); // Temporary ID for optimistic update
    const optimisticColor = generateNotebookColor(tempId); // Store color to preserve it
    const optimisticNotebook = {
      id: tempId,
      name: name.trim(),
      notebook_type: 'other' as const,
      urgency_level: 'normal' as const,
      description: '',
      color: optimisticColor,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes_count: 0,
      is_archived: false,
      archived_at: null,
      is_favorite: false
    };
    
    // Add optimistic notebook immediately for instant feedback
    setNotebooks(prev => [optimisticNotebook, ...prev]);
    
    try {
      console.log('📝 Creating notebook directly:', name.trim());
      const response = await axiosInstance.post(`/notes/notebooks/`, {
        name: name.trim()
      });
      console.log('✅ Direct notebook creation response:', response.data);
      
      // Replace optimistic notebook with real server response
      // ALWAYS preserve the original optimistic color to prevent color changes on refresh
      const realNotebook = {
        ...response.data,
        color: optimisticColor // Always use the optimistic color, never generate a new one
      };
      
      // Update cache with the new notebook and save color to localStorage
      setNotebooks(prev => {
        const updated = prev.map(nb => nb.id === tempId ? realNotebook : nb);
        updateNotebookCache(updated);
        
        // Save the color to localStorage with the real ID
        const notebookColors = JSON.parse(localStorage.getItem('notebookColors') || '{}');
        notebookColors[realNotebook.id] = optimisticColor;
        localStorage.setItem('notebookColors', JSON.stringify(notebookColors));
        
        return updated;
      });
      
    } catch (error) {
      // Remove optimistic notebook on error
      setNotebooks(prev => prev.filter(nb => nb.id !== tempId));
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
    }
    // Note: favorites tab doesn't need to fetch, it uses the useEffect hook that watches notebooks state
    // Note: notebooks tab doesn't need to refetch, data is already loaded
  }, [activeNotebookTab]);

  useEffect(() => {
    if (activeTab === 'archived') {
      fetchArchivedNotes();
    }
    // Note: Don't fetch notes here when selectedNotebook changes
    // fetchNotes is already called in handleNotebookSelect
    // This was causing race conditions and duplicate fetches
  }, [activeTab]);

  useEffect(() => {
    const initializeApp = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/login';
        return;
      }
      
      try {
        // 1) Instant hydrate from cache if available
        try {
          const cached = localStorage.getItem(NOTEBOOKS_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && Array.isArray(parsed.data)) {
              setNotebooks(parsed.data);
            }
          }
        } catch {}

        // 2) Kick off fresh fetch in background
        fetchNotebooks();
        // Defer archived notebooks fetch until the Archived tab is viewed (performance)
        // Don't auto-fetch notes - let user select a notebook first
        // This prevents race conditions and wrong notes appearing during hot reload
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
  // console.log('Current state:', {
  //   loading,
  //   currentView,
  //   notebooks: notebooks.length,
  //   selectedNotebook: selectedNotebook ? { id: selectedNotebook.id, name: selectedNotebook.name } : null,
  //   notes: notes.length,
  //   error,
  //   urlParams: { notebookId, noteIdFromUrl },
  //   activeTab
  // });
  
  // console.log('Render conditions:', {
  //   showNotebooksView: currentView === 'notebooks',
  //   showNotesView: currentView === 'notes',
  //   showNotesTab: currentView === 'notes' && activeTab === 'notes',
  //   showArchivedTab: currentView === 'notes' && activeTab === 'archived'
  // });

  // Debug logging for notes display
  useEffect(() => {
    if (selectedNotebook && currentView === 'notes') {
      console.log(`📋 Currently displaying notebook: "${selectedNotebook.name}" (ID: ${selectedNotebook.id})`);
      console.log(`📄 Notes in state (${notes.length} total):`);
      notes.forEach(note => {
        console.log(`  - "${note.title}" (ID: ${note.id}, Notebook: ${note.notebook})`);
      });
      
      // Check for mismatched notes in state
      const wrongNotebook = notes.filter(note => note.notebook !== selectedNotebook.id);
      if (wrongNotebook.length > 0) {
        console.error(`❌ STATE CORRUPTION! Found ${wrongNotebook.length} notes that don't belong to notebook ${selectedNotebook.id}:`);
        wrongNotebook.forEach(note => {
          console.error(`  ⚠️ "${note.title}" belongs to notebook ${note.notebook}, not ${selectedNotebook.id}`);
        });
        console.error(`🔧 FIXING: Clearing wrong notes from state...`);
        // Filter out the wrong notes
        const correctNotes = notes.filter(note => note.notebook === selectedNotebook.id);
        setNotes(correctNotes);
      }
    }
  }, [selectedNotebook, notes, currentView]);

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
            setActiveNotebookTab={setActiveNotebookTab as (tab: 'notebooks' | 'favorites' | 'archived') => void}
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
                  <div className="flex items-center gap-2">
                    {selectedForBulk.length > 0 && (
                      <button
                        onClick={() => setShowBulkDeleteModal(true)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
                      >
                        <span>Delete Selected ({selectedForBulk.length})</span>
                      </button>
                    )}
                    <button
                      onClick={handleStartAddingNote}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
                    >
                      <Plus size={16} />
                      <span className="font-medium">Add Note</span>
                    </button>
                  </div>
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
              {currentView === 'notebooks' && (
                <>
                  {activeNotebookTab === 'notebooks' && (
                    <>
                      {notebooks.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="flex justify-center text-gray-400 dark:text-gray-500 mb-4">
                              <Book size={48} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                              No notebooks yet
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                              Create your first notebook to get started
                            </p>
                            <button
                              onClick={() => setShowCreateNotebookModal(true)}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              Create Notebook
                            </button>
                          </div>
                        </div>
                      ) : filteredNotebooks.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="flex justify-center text-gray-400 dark:text-gray-500 mb-4">
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
                          onToggleFavorite={handleToggleFavorite}
                          onBulkDelete={handleBulkDeleteNotebooks}
                          showAddButton={true}
                        />
                      )}
                    </>
                  )}
                  {activeNotebookTab === 'favorites' && (
                    <>
                      {favoriteNotebooks.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="flex justify-center text-yellow-400 dark:text-yellow-500 mb-4">
                              <Star size={48} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                              No favorite notebooks
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                              Click the star icon on any notebook to add it to favorites
                            </p>
                          </div>
                        </div>
                      ) : (
                        <NotebookList
                          notebooks={favoriteNotebooks}
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
                          onToggleFavorite={handleToggleFavorite}
                          onBulkDelete={handleBulkDeleteNotebooks}
                          showAddButton={false}
                        />
                      )}
                    </>
                  )}
                  {activeNotebookTab === 'archived' && (
                    <>
                      {archivedNotebooks.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="flex justify-center text-gray-400 dark:text-gray-500 mb-4">
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
                          onToggleFavorite={handleToggleFavorite}
                          onBulkDelete={handleBulkDeleteNotebooks}
                          showAddButton={false}
                        />
                      )}
                    </>
                  )}
                </>
              )}
              {currentView === 'notes' && activeTab === 'notes' && (
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
                  onSelectionChange={setSelectedForBulk}
                />
              )}
              {currentView === 'notes' && activeTab === 'archived' && (
                <>
                  {archivedNotes.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="flex justify-center text-gray-400 dark:text-gray-500 mb-4">
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
                      onSelectionChange={setSelectedForBulk}
                    />
                  )}
                </>
              )}
              {/* Fallback for debugging */}
              {currentView !== 'notebooks' && currentView !== 'notes' && (
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
          {/* Bulk Delete Confirmation Modal */}
          <DeleteConfirmationModal
            isOpen={showBulkDeleteModal}
            onClose={() => setShowBulkDeleteModal(false)}
            onConfirm={() => {
              handleBulkDeleteNotes(selectedForBulk);
              setSelectedForBulk([]);
              setShowBulkDeleteModal(false);
            }}
            title="Delete Selected Notes"
            message={`Are you sure you want to delete ${selectedForBulk.length} selected note${selectedForBulk.length > 1 ? 's' : ''}?`}
            confirmLabel="Delete"
            cancelLabel="Cancel"
          />
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
            setSelectedForBulk([]); // Clear selection when navigating to a notebook
            setCurrentView('notes');
            // Open the note in editor
            setNoteEditorNote(note);
            setIsNewNoteEditor(false);
            setShowNoteEditor(true);
            // Update URL to reflect the note being opened
            navigate(`/notes/notebooks/${notebook.id}/notes/${note.id}`);
          }
          setShowImportantItemsPanel(false);
        }}
        onNotebookClick={(notebook) => {
          setSelectedNotebook(notebook);
          fetchNotes(notebook.id);
          setCurrentView('notes');
          setSelectedForBulk([]); // Clear selection when selecting a different notebook
          // Update URL to reflect the notebook being selected
          navigate(`/notes/notebooks/${notebook.id}`);
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

      {/* Create Notebook Modal */}
      <CreateNotebookModal
        isOpen={showCreateNotebookModal}
        onClose={() => setShowCreateNotebookModal(false)}
        onCreateNotebook={(data) => {
          handleCreateNotebookDirect(data.name);
          setShowCreateNotebookModal(false);
        }}
      />
    </PageLayout>
  );
};

export default Notes;
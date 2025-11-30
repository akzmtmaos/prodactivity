import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, BookOpen, TrendingUp, Clock, Target, FileText } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import HelpButton from '../components/HelpButton';
import Pagination from '../components/common/Pagination';
import DeckCard from '../components/decks/DeckCard';
import CreateDeckModal from '../components/decks/CreateDeckModal';
import EditDeckModal from '../components/decks/EditDeckModal';
import DeckStatsModal from '../components/decks/DeckStatsModal';
import DeleteConfirmationModal from '../components/decks/DeleteConfirmationModal';
import ManageFlashcards from '../components/decks/ManageFlashcardModal';
import StudySession from '../components/decks/StudySession';
import SubDeckModal from '../components/decks/SubDeckModal';
import QuizSession from '../components/decks/QuizSession';
import Toast from '../components/common/Toast';
import type { SubDeck } from '../components/decks/SubDeckModal';
import { truncateHtmlContent } from '../utils/htmlUtils';
import { API_BASE_URL } from '../config/api';
import axiosInstance from '../utils/axiosConfig';

interface FlashcardData {
  id: string;
  question: string;
  answer: string;
  front?: string;
  back?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface Deck {
  id: string;
  title: string;
  flashcardCount: number;
  progress: number;
  lastStudied?: string;
  created_at: string;
  updated_at: string;
  createdAt: string;
  flashcards: FlashcardData[];
  subDecks?: SubDeck[];
  is_deleted: boolean;
  is_archived: boolean;
  archived_at?: string;
}

interface DeckStats {
  totalCards: number;
  masteredCards: number;
  learningCards: number;
  newCards: number;
  averageScore: number;
  totalStudyTime: number;
  lastStudied?: string;
  studyStreak: number;
  weeklyProgress: number[];
}

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateDeck: (deckData: { title: string }) => void;
}

const Decks = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [archivedDecks, setArchivedDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [selectedDeckStats, setSelectedDeckStats] = useState<DeckStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'progress'>('recent');
  const [filterBy, setFilterBy] = useState<'all' | 'studied' | 'new'>('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showStudySession, setShowStudySession] = useState(false);
  const [showSubDeckModal, setShowSubDeckModal] = useState(false);
  const [showQuizSession, setShowQuizSession] = useState(false);
  const [showNoFlashcardsModal, setShowNoFlashcardsModal] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'decks' | 'archived'>('decks');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentArchivedPage, setCurrentArchivedPage] = useState<number>(1);
  const PAGE_SIZE = 12;

  // Notes -> Flashcards conversion modal state
interface Notebook {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  archived_at: string | null;
}
interface NoteItem {
  id: number;
  title: string;
  content: string;
  notebook: number;
  notebook_name: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  is_archived: boolean;
  archived_at: string | null;
}
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [notesByNotebook, setNotesByNotebook] = useState<Record<number, NoteItem[]>>({});
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<number>>(new Set());
  const [loadingNotes, setLoadingNotes] = useState<boolean>(false);
  const [deckName, setDeckName] = useState<string>('AI Generated Deck');
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    } as Record<string, string>;
  };

  // Use centralized API base URL (for any direct fetch fallbacks)
  // Note: All API calls now use axiosInstance instead

  const DECKS_CACHE_KEY = 'cachedDecksV1';
  const ARCHIVED_DECKS_CACHE_KEY = 'cachedArchivedDecksV1';

  const [modalSelectedNotebookId, setModalSelectedNotebookId] = useState<number | null>(null);
  const [previewCount, setPreviewCount] = useState<number>(0);
  const [aiPreviewCards, setAiPreviewCards] = useState<FlashcardData[]>([]);
  const [showAiPreview, setShowAiPreview] = useState<boolean>(false);

  const ensureNotebooksLoaded = async () => {
    if (notebooks.length > 0) return;
    try {
      setLoadingNotes(true);
      const res = await axiosInstance.get('/notes/notebooks/');
      // Handle paginated response
      const notebooksData = res.data.results || res.data;
      setNotebooks(notebooksData);
      if (notebooksData.length > 0) setModalSelectedNotebookId(notebooksData[0].id);
    } catch (e) {
      setToast({ message: 'Failed to load notebooks', type: 'error' });
    } finally {
      setLoadingNotes(false);
    }
  };

  const fetchNotesForNotebook = async (notebookId: number) => {
    if (notesByNotebook[notebookId]) return; // already loaded
    try {
      setLoadingNotes(true);
      const res = await axiosInstance.get(`/notes/?notebook=${notebookId}`);
      // Handle paginated response
      const notesData = res.data.results || res.data;
      setNotesByNotebook(prev => ({ ...prev, [notebookId]: notesData }));
    } catch (e) {
      setToast({ message: 'Failed to load notes', type: 'error' });
    } finally {
      setLoadingNotes(false);
    }
  };

  // Legacy function kept for potential fallback, but we now use AI for all conversion
  const parseNotesToCards = (notes: NoteItem[]): { question: string; answer: string }[] => {
    // This function is no longer used since we use AI for all conversions
    // Keeping it for potential fallback scenarios
    return [];
  };

  useEffect(() => {
    if (!showConvertModal) return;
    ensureNotebooksLoaded();
  }, [showConvertModal]);

  useEffect(() => {
    if (!showConvertModal || modalSelectedNotebookId == null) return;
    fetchNotesForNotebook(modalSelectedNotebookId);
  }, [showConvertModal, modalSelectedNotebookId]);

  useEffect(() => {
    if (!showConvertModal) return;
    if (modalSelectedNotebookId == null) { 
      setPreviewCount(0); 
      setAiPreviewCards([]);
      setShowAiPreview(false);
      return; 
    }
    const notes = notesByNotebook[modalSelectedNotebookId] || [];
    const selected = notes.filter(n => selectedNoteIds.has(n.id));
    
    // Estimate 3-5 cards per note for AI generation
    setPreviewCount(selected.length * 4);
    setShowAiPreview(false);
  }, [selectedNoteIds, notesByNotebook, modalSelectedNotebookId, showConvertModal]);

  const handleToggleNoteSelection = (noteId: number) => {
    setSelectedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId); else next.add(noteId);
      return next;
    });
  };

  const handleSelectAllNotes = (checked: boolean) => {
    if (modalSelectedNotebookId == null) return;
    const notes = notesByNotebook[modalSelectedNotebookId] || [];
    if (checked) {
      setSelectedNoteIds(new Set(notes.map(n => n.id)));
    } else {
      setSelectedNoteIds(new Set());
    }
  };


  const convertSelectedNotes = async () => {
    if (modalSelectedNotebookId == null) return;
    const notes = notesByNotebook[modalSelectedNotebookId] || [];
    const selectedNotes = notes.filter(n => selectedNoteIds.has(n.id));
    if (selectedNotes.length === 0) {
      setToast({ message: 'Select at least one note', type: 'error' });
      return;
    }
    
    // Check if any selected notes are empty
    const emptyNotes = selectedNotes.filter(note => !note.content || note.content.trim() === '');
    if (emptyNotes.length > 0) {
      setToast({ 
        message: `Cannot generate flashcards from empty notes. Please add content to: ${emptyNotes.map(n => n.title).join(', ')}`, 
        type: 'error' 
      });
      return;
    }
    const token = localStorage.getItem('accessToken');
    try {
      setLoadingNotes(true);
      
      // Create single deck with AI-generated name
      const deckTitle = deckName.trim() || 'AI Generated Deck';
      const res = await fetch(`${API_BASE_URL}/decks/decks/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ title: deckTitle })
      });
      if (!res.ok) throw new Error('Failed to create deck');
      const deckData = await res.json();
      
      // Use AI to generate flashcards from all selected notes
      const combinedContent = selectedNotes.map(note => 
        `Title: ${note.title}\nContent: ${note.content}`
      ).join('\n\n---\n\n');
      
      const aiResponse = await fetch(`${API_BASE_URL}/decks/ai/generate-flashcards/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          content: combinedContent,
          title: deckTitle,
          strategy: 'ai_enhanced',
          deck_id: deckData.id
        })
      });
      
      if (!aiResponse.ok) {
        const errorData = await aiResponse.json();
        throw new Error(errorData.error || 'AI generation failed');
      }
      
      const aiData = await aiResponse.json();
      
      // Fetch the updated deck with flashcards
      const updatedDeckRes = await fetch(`${API_BASE_URL}/decks/decks/${deckData.id}/`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (updatedDeckRes.ok) {
        const updatedDeckData = await updatedDeckRes.json();
        const newDeck: Deck = {
          id: updatedDeckData.id.toString(),
          title: updatedDeckData.title,
          flashcardCount: updatedDeckData.flashcard_count || 0,
          progress: 0,
          created_at: updatedDeckData.created_at,
          updated_at: updatedDeckData.updated_at,
          createdAt: updatedDeckData.created_at,
          flashcards: (updatedDeckData.flashcards || []).map((fc: any) => ({
            id: fc.id.toString(),
            question: fc.front,
            answer: fc.back,
            front: fc.front,
            back: fc.back,
            difficulty: undefined
          })),
          subDecks: [],
          is_deleted: false,
          is_archived: false,
        };
        
        // Add the new deck to the current decks
        setDecks(prev => [...prev, newDeck]);
        setToast({ 
          message: `Successfully created "${newDeck.title}" with ${newDeck.flashcardCount} flashcards!`, 
          type: 'success' 
        });
      }
      
      // Reset modal state
      setShowConvertModal(false);
      setSelectedNoteIds(new Set());
      setShowAiPreview(false);
      setAiPreviewCards([]);
    } catch (e) {
      console.error('Conversion error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      setToast({ message: `Conversion failed: ${errorMessage}`, type: 'error' });
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        // 1) Hydrate from cache instantly
        try {
          const cached = localStorage.getItem(DECKS_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && Array.isArray(parsed.data)) setDecks(parsed.data);
          }
          const cachedArchived = localStorage.getItem(ARCHIVED_DECKS_CACHE_KEY);
          if (cachedArchived) {
            const parsed = JSON.parse(cachedArchived);
            if (parsed && Array.isArray(parsed.data)) setArchivedDecks(parsed.data);
          }
        } catch {}

        // 2) Fetch active decks with axios (short timeout, auth via interceptor)
        const activeRes = await axiosInstance.get('/decks/decks/', { timeout: 4000 });
        const activeData = activeRes.data;
        const activeDecks = activeData.results || activeData;
        const topLevelDecks = activeDecks.filter((deck: any) => !deck.parent).map((deck: any) => {
          return {
            id: deck.id.toString(),
            title: deck.title,
            flashcardCount: deck.flashcard_count || 0,
            progress: deck.progress || 0,
            created_at: deck.created_at,
            updated_at: deck.updated_at,
            createdAt: deck.created_at,
            flashcards: (deck.flashcards || []).map((fc: any) => ({
              id: fc.id.toString(),
              question: fc.front,
              answer: fc.back,
              front: fc.front,
              back: fc.back,
              difficulty: undefined
            })),
            subDecks: (deck.sub_decks || []).map((sd: any) => ({
              id: sd.id.toString(),
              title: sd.title,
              description: sd.description || '',
              parentDeckId: sd.parent_deck_id.toString(),
              created_at: sd.created_at,
              updated_at: sd.updated_at
            })),
            is_deleted: false,
            is_archived: false,
          };
        });
        setDecks(topLevelDecks);
        try {
          localStorage.setItem(DECKS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: topLevelDecks }));
        } catch {}

        // 3) Fetch archived decks
        const archivedRes = await axiosInstance.get('/decks/archived/decks/', { timeout: 4000 });
        if (archivedRes.status >= 200 && archivedRes.status < 300) {
          const archivedData = archivedRes.data;
          const archivedDecks = archivedData.results || archivedData;
          const archivedTopLevelDecks = archivedDecks.filter((deck: any) => !deck.parent).map((deck: any) => {
            return {
          id: deck.id.toString(),
          title: deck.title,
          flashcardCount: deck.flashcard_count || 0,
          progress: deck.progress || 0,
          created_at: deck.created_at,
          updated_at: deck.updated_at,
          createdAt: deck.created_at,
          flashcards: (deck.flashcards || []).map((fc: any) => ({
            id: fc.id.toString(),
            question: fc.front,
            answer: fc.back,
            front: fc.front,
            back: fc.back,
                difficulty: undefined
              })),
              subDecks: (deck.sub_decks || []).map((sd: any) => ({
                id: sd.id.toString(),
                title: sd.title,
                description: sd.description || '',
                parentDeckId: sd.parent_deck_id.toString(),
                created_at: sd.created_at,
                updated_at: sd.updated_at
          })),
          is_deleted: false,
              is_archived: true,
              archived_at: deck.archived_at,
            };
          });
          setArchivedDecks(archivedTopLevelDecks);
          try {
            localStorage.setItem(ARCHIVED_DECKS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: archivedTopLevelDecks }));
          } catch {}
        }
      } catch (error) {
        setDecks([]);
        setArchivedDecks([]);
      }
    };
    fetchDecks();
  }, []);

  const handleCreateDeck = async (deckData: { title: string }) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE_URL}/decks/decks/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ title: deckData.title })
      });
      if (!res.ok) throw new Error('Failed to create deck');
      const data = await res.json();
      setDecks(prev => [...prev, {
        id: data.id.toString(),
        title: data.title,
        flashcardCount: data.flashcard_count || 0,
          progress: 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
        createdAt: data.created_at,
          flashcards: [],
        subDecks: [],
          is_deleted: false,
        is_archived: false,
      }]);
    } catch (error) {
      alert('Error creating deck.');
    }
  };

  const handleUpdateDeck = (deckId: string, deckData: { title: string }) => {
    setDecks(decks.map(d => 
      d.id === deckId 
        ? { 
            ...d, 
            title: deckData.title,
            updated_at: new Date().toISOString()
          }
        : d
    ));
  };

  // This DELETE request performs a soft delete (moves deck to Trash)
  const handleDeleteDeck = async (deck: Deck) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE_URL}/decks/decks/${deck.id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (!res.ok) throw new Error('Failed to delete deck');
      setDecks(decks.filter(d => d.id !== deck.id));
      setToast({ message: 'Deck moved to Trash.', type: 'success' });
    } catch (error) {
      alert('Error deleting deck.');
      setToast({ message: 'Failed to delete deck.', type: 'error' });
    }
  };

  const handleArchiveDeck = async (deck: Deck, archive: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE_URL}/decks/decks/${deck.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_archived: archive }),
      });
      if (!res.ok) throw new Error('Failed to archive deck');
      
      if (archive) {
        // Move from active decks to archived decks
        // Add at the top (most recent first) by prepending instead of appending
        const deckToArchive = { ...deck, is_archived: true, archived_at: new Date().toISOString() };
        setArchivedDecks(prev => [deckToArchive, ...prev]);
        setDecks(prev => prev.filter(d => d.id !== deck.id));
      } else {
        // Move from archived decks back to active decks
        // Add at the top (most recent first) by prepending instead of appending
        const deckToUnarchive = { ...deck, is_archived: false, archived_at: undefined };
        setDecks(prev => [deckToUnarchive, ...prev]);
        setArchivedDecks(prev => prev.filter(d => d.id !== deck.id));
      }
      
      setToast({ 
        message: `Deck ${archive ? 'archived' : 'unarchived'} successfully.`, 
        type: 'success' 
      });
    } catch (error) {
      setToast({ message: `Failed to ${archive ? 'archive' : 'unarchive'} deck`, type: 'error' });
    }
  };

  const handleStudy = (deckId: string) => {
    navigate(`/decks/${deckId}/practice`);
  };

  const handleQuiz = (deckId: string) => {
    navigate(`/decks/${deckId}/quiz`);
  };

  const handleOpenDeck = (deckId: string) => {
    navigate(`/decks/${deckId}`);
  };

  const handlePractice = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
      if (deck.flashcardCount === 0) {
        setSelectedDeck(deck);
        setShowNoFlashcardsModal(true);
      } else {
    setSelectedDeck(deck);
    setShowStudySession(true);
      }
    }
  };

  const handleQuizMode = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
      if (deck.flashcardCount === 0) {
        setSelectedDeck(deck);
        setShowNoFlashcardsModal(true);
      } else {
    setSelectedDeck(deck);
    setShowQuizSession(true);
      }
    }
  };

  const handleEdit = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
      setSelectedDeck(deck);
      setShowEditModal(true);
    }
  };

  const handleDelete = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
      setSelectedDeck(deck);
      setShowDeleteModal(true);
    }
  };

  const handleResetProgress = async (deckId: string) => {
    try {
      const res = await axiosInstance.patch(`/decks/decks/${deckId}/`, {
        progress: 0
      });

      if (res.status === 200) {
        // Update local state
        setDecks(decks.map(d =>
          d.id === deckId
            ? { ...d, progress: 0 }
            : d
        ));
        setToast({ message: 'Progress reset successfully!', type: 'success' });
      }
    } catch (error: any) {
      console.error('Error resetting progress:', error);
      setToast({ message: 'Failed to reset progress. Please try again.', type: 'error' });
    }
  };

  const handleArchive = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId) || archivedDecks.find(d => d.id === deckId);
    if (deck) {
      handleArchiveDeck(deck, !deck.is_archived);
    }
  };

  const handleViewStats = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
      setSelectedDeck(deck);
      setSelectedDeckStats(generateDeckStats(deck));
      setShowStatsModal(true);
    }
  };

  const handleAddSubDeck = (deckId: string, subDeck: Omit<SubDeck, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    console.log('Adding subdeck:', { deckId, subDeck });
    
    const newSubDeck: SubDeck = {
      id: Date.now().toString(),
      ...subDeck,
      description: subDeck.description || '',
      parentDeckId: deckId,
      created_at: now,
      updated_at: now
    };
    
    setDecks(decks.map(deck => 
      deck.id === deckId 
        ? { ...deck, subDecks: [...(deck.subDecks || []), newSubDeck] }
        : deck
    ));
    
    // Also update the selectedDeck if it's currently selected
    if (selectedDeck && selectedDeck.id === deckId) {
      setSelectedDeck(prev => prev ? {
        ...prev,
        subDecks: [...(prev.subDecks || []), newSubDeck]
      } : null);
    }
    
    setToast({ message: 'SubDeck created successfully!', type: 'success' });
  };

  const handleUpdateSubDeck = (deckId: string, subDeckId: string, subDeck: Omit<SubDeck, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    console.log('Updating subdeck:', { deckId, subDeckId, subDeck });
    
    setDecks(decks.map(deck => 
      deck.id === deckId 
        ? { 
            ...deck, 
            subDecks: (deck.subDecks || []).map((sd: SubDeck) => 
              sd.id === subDeckId 
                ? { ...sd, ...subDeck, description: subDeck.description || '', updated_at: now }
                : sd
            )
          }
        : deck
    ));
    
    // Also update the selectedDeck if it's currently selected
    if (selectedDeck && selectedDeck.id === deckId) {
      setSelectedDeck(prev => prev ? {
        ...prev,
        subDecks: (prev.subDecks || []).map((sd: SubDeck) => 
          sd.id === subDeckId 
            ? { ...sd, ...subDeck, description: subDeck.description || '', updated_at: now }
            : sd
        )
      } : null);
    }
    
    setToast({ message: 'SubDeck updated successfully!', type: 'success' });
  };

  const handleDeleteSubDeck = (deckId: string, subDeckId: string) => {
    console.log('Deleting subdeck:', { deckId, subDeckId });
    
    setDecks(decks.map(deck => 
      deck.id === deckId 
        ? { 
            ...deck, 
            subDecks: (deck.subDecks || []).filter((sd: SubDeck) => sd.id !== subDeckId)
          }
        : deck
    ));
    
    // Also update the selectedDeck if it's currently selected
    if (selectedDeck && selectedDeck.id === deckId) {
      setSelectedDeck(prev => prev ? {
        ...prev,
        subDecks: (prev.subDecks || []).filter((sd: SubDeck) => sd.id !== subDeckId)
      } : null);
    }
    
    setToast({ message: 'SubDeck deleted successfully!', type: 'success' });
  };

  // New function to handle editing the SubDeck itself
  const handleEditSubDeck = (updatedSubDeck: SubDeck) => {
    console.log('Editing SubDeck itself:', updatedSubDeck);
    
    // Find the parent deck that contains this SubDeck
    const parentDeck = decks.find(deck => 
      deck.subDecks?.some(sd => sd.id === updatedSubDeck.id)
    );
    
    if (parentDeck) {
      setDecks(decks.map(deck => 
        deck.id === parentDeck.id 
          ? { 
              ...deck, 
              subDecks: (deck.subDecks || []).map((sd: SubDeck) => 
                sd.id === updatedSubDeck.id 
                  ? { ...sd, ...updatedSubDeck, updated_at: new Date().toISOString() }
                  : sd
              )
            }
          : deck
      ));
      
      // Also update the selectedDeck if it's currently selected
      if (selectedDeck && selectedDeck.id === parentDeck.id) {
        setSelectedDeck(prev => prev ? {
          ...prev,
          subDecks: (prev.subDecks || []).map((sd: SubDeck) => 
            sd.id === updatedSubDeck.id 
              ? { ...sd, ...updatedSubDeck, updated_at: new Date().toISOString() }
              : sd
          )
        } : null);
      }
      
      setToast({ message: 'SubDeck updated successfully!', type: 'success' });
    } else {
      console.error('Parent deck not found for SubDeck:', updatedSubDeck);
      setToast({ message: 'Failed to update SubDeck', type: 'error' });
    }
  };

  // New function to open a SubDeck for editing/viewing
  const handleOpenSubDeck = (subDeck: SubDeck) => {
    console.log('Opening SubDeck for editing/viewing:', subDeck);
    
    // For now, we'll just show a toast with the SubDeck info
    // In the future, this could open a dedicated SubDeck view/edit modal
    setToast({ 
      message: `Opening SubDeck: ${subDeck.title}`, 
      type: 'success' 
    });
    
    // TODO: Implement proper SubDeck viewing/editing interface
    // This could involve:
    // 1. Opening a dedicated SubDeck modal
    // 2. Navigating to a SubDeck-specific page
    // 3. Opening the SubDeck in edit mode
  };

  const handleManageSubDecks = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
      console.log('Opening SubDeck modal for deck:', deck.title, 'with subdecks:', deck.subDecks);
      console.log('Deck data structure:', deck);
      setSelectedDeck(deck);
      setShowSubDeckModal(true);
    } else {
      console.error('Deck not found for ID:', deckId);
    }
  };

  const handleAddFlashcard = async (flashcard: Omit<FlashcardData, 'id'>) => {
    if (!selectedDeck) return;
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE_URL}/decks/flashcards/`, {
          method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          deck: selectedDeck.id,
          front: flashcard.question,
          back: flashcard.answer
        })
      });
      if (!res.ok) throw new Error('Failed to create flashcard');
      const data = await res.json();
      const newFlashcard: FlashcardData = {
        id: data.id.toString(),
        question: data.front,
        answer: data.back,
        front: data.front,
        back: data.back,
        difficulty: undefined
      };
      let updatedDeck: Deck | null = null;
      setDecks(prevDecks => prevDecks.map(deck => {
        if (deck.id === selectedDeck.id) {
          updatedDeck = {
            ...deck,
            flashcards: [...deck.flashcards, newFlashcard],
            flashcardCount: deck.flashcardCount + 1,
            updated_at: new Date().toISOString()
          };
          return updatedDeck;
        }
        return deck;
      }));
      if (updatedDeck) setSelectedDeck(updatedDeck);
    } catch (error) {
      alert('Error creating flashcard.');
    }
  };

  // Filter and sort decks
  const filteredDecks = decks
    .filter(deck => {
      const matchesSearch = deck.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      switch (filterBy) {
        case 'studied':
          return deck.progress > 0;
        case 'new':
          return deck.progress === 0;
        default:
          return true;
      }
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'progress':
          return b.progress - a.progress;
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

  // Filter and sort archived decks
  const filteredArchivedDecks = archivedDecks
    .filter(deck => {
      const matchesSearch = deck.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      switch (filterBy) {
        case 'studied':
          return deck.progress > 0;
        case 'new':
          return deck.progress === 0;
        default:
          return true;
      }
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'progress':
          return b.progress - a.progress;
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

  const totalPages = Math.max(1, Math.ceil(filteredDecks.length / PAGE_SIZE));
  const totalArchivedPages = Math.max(1, Math.ceil(filteredArchivedDecks.length / PAGE_SIZE));
  
  useEffect(() => {
    // Reset to first page when filters/search change
    setCurrentPage(1);
    setCurrentArchivedPage(1);
  }, [searchTerm, sortBy, filterBy]);
  
  useEffect(() => {
    // Clamp current page if total pages shrinks
    if (currentPage > totalPages) setCurrentPage(totalPages);
    if (currentArchivedPage > totalArchivedPages) setCurrentArchivedPage(totalArchivedPages);
  }, [totalPages, totalArchivedPages]);
  
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const pagedDecks = filteredDecks.slice(startIndex, endIndex);
  
  const startArchivedIndex = (currentArchivedPage - 1) * PAGE_SIZE;
  const endArchivedIndex = startArchivedIndex + PAGE_SIZE;
  const pagedArchivedDecks = filteredArchivedDecks.slice(startArchivedIndex, endArchivedIndex);

  // Calculate summary stats
  const totalDecks = decks.length;
  const totalCards = decks.reduce((sum, deck) => sum + deck.flashcardCount, 0);
  const averageProgress = decks.length > 0 
    ? Math.round(decks.reduce((sum, deck) => sum + deck.progress, 0) / decks.length)
    : 0;

  const generateDeckStats = (deck: Deck): DeckStats => {
    const notStartedCards = deck.flashcards.filter(card => !card.difficulty).length;
    const masteredCards = deck.flashcards.filter(card => card.difficulty === 'easy').length;
    const learningCards = deck.flashcards.filter(card => card.difficulty === 'medium').length;
    return {
      totalCards: deck.flashcardCount,
      masteredCards,
      learningCards,
      newCards: notStartedCards,
      averageScore: Math.floor(Math.random() * 30) + 70,
      totalStudyTime: Math.floor(Math.random() * 120) + 30,
      lastStudied: deck.lastStudied,
      studyStreak: Math.floor(Math.random() * 7) + 1,
      weeklyProgress: Array.from({ length: 7 }, () => Math.floor(Math.random() * 20))
    };
  };

  return (
    <>
      {/* Modals and overlays */}
      {showStudySession && selectedDeck && (
        <StudySession
          deckTitle={selectedDeck.title}
          flashcards={selectedDeck.flashcards
            .filter(f => f && f.id && (f.front || f.question) && (f.back || f.answer))
            .map(f => ({
              id: f.id,
              front: f.front || f.question,
              back: f.back || f.answer,
              difficulty: f.difficulty
            }))}
          onClose={() => {
            setShowStudySession(false);
            setSelectedDeck(null);
          }}
          onComplete={(results) => {
            const newProgress = Math.round(Math.min(100, (selectedDeck?.progress || 0) + 10));
            setDecks(decks.map(d =>
              d.id === selectedDeck.id
                ? {
                    ...d,
                    progress: newProgress,
                    lastStudied: new Date().toISOString()
                  }
                : d
            ));
            // Persist progress to backend
            const token = localStorage.getItem('accessToken');
            fetch(`${API_BASE_URL}/decks/decks/${selectedDeck.id}/`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
              },
              body: JSON.stringify({ progress: newProgress })
            });
            setShowStudySession(false);
            setSelectedDeck(null);
          }}
        />
      )}
      {showQuizSession && selectedDeck && (
        <QuizSession
          deckId={selectedDeck.id}
          deckTitle={selectedDeck.title}
          flashcards={selectedDeck.flashcards
            .filter(f => f && f.id && (f.front || f.question) && (f.back || f.answer))
            .map(f => ({
              id: f.id,
              front: f.front || f.question,
              back: f.back || f.answer,
              difficulty: f.difficulty
            }))}
          onClose={() => {
            setShowQuizSession(false);
            setSelectedDeck(null);
          }}
          onComplete={async (results) => {
            // Refetch deck from backend for updated progress
            const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE_URL}/decks/decks/${selectedDeck.id}/`, {
              headers: {
                'Authorization': token ? `Bearer ${token}` : '',
              },
      });
      if (res.ok) {
        const data = await res.json();
              setDecks(decks.map(d =>
                d.id === selectedDeck.id
                  ? {
                      ...d,
                      progress: data.progress || 0,
                      lastStudied: new Date().toISOString()
                    }
                  : d
              ));
            }
            setShowQuizSession(false);
            setSelectedDeck(null);
          }}
        />
      )}
      {showManageModal && selectedDeck && (
        <ManageFlashcards
          isOpen={showManageModal}
          deckTitle={selectedDeck.title}
          flashcards={selectedDeck.flashcards}
          onClose={() => {
            setShowManageModal(false);
            setSelectedDeck(null);
          }}
          onAddFlashcard={handleAddFlashcard}
          onUpdateFlashcard={(id, flashcard) => {
            setDecks(decks.map(deck =>
          deck.id === selectedDeck.id 
                ? {
                    ...deck,
                    flashcards: deck.flashcards.map(f =>
                      f.id === id
                        ? { ...f, ...flashcard }
                        : f
                    ),
                    updated_at: new Date().toISOString()
                  }
            : deck
        ));
          }}
          onDeleteFlashcard={(id) => {
            setDecks(decks.map(deck =>
              deck.id === selectedDeck.id
                ? {
                    ...deck,
                    flashcards: deck.flashcards.filter(f => f.id !== id),
                    flashcardCount: deck.flashcardCount - 1,
                    updated_at: new Date().toISOString()
                  }
                : deck
            ));
          }}
        />
      )}
      <PageLayout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                Flashcards
                <HelpButton 
                  content={
                    <div>
                      <p className="font-semibold mb-2">Flashcards & Study</p>
                      <ul className="space-y-1 text-xs">
                        <li>• <strong>Create Decks:</strong> Organize flashcards by topic</li>
                        <li>• <strong>Study Modes:</strong> Practice, Quiz, and Review sessions</li>
                        <li>• <strong>Spaced Repetition:</strong> Cards appear based on difficulty</li>
                        <li>• <strong>Progress Tracking:</strong> Monitor your learning progress</li>
                        <li>• <strong>Import from Notes:</strong> Convert notes to flashcards</li>
                        <li>• <strong>Sub-decks:</strong> Organize cards into smaller groups</li>
                        <li>• <strong>Statistics:</strong> View detailed study analytics</li>
                      </ul>
            </div>
                  } 
                  title="Flashcards Help" 
                />
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Ready to learn something new today?
              </p>
            </div>
            {/* Add Deck and Convert buttons */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2 md:gap-4 w-full md:w-auto">
              {/* AI Generate Flashcards button */}
            <button
                onClick={() => setShowConvertModal(true)}
                className="inline-flex items-center h-10 min-w-[200px] px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                <FileText size={20} className="mr-2" />
                Convert to Flashcards 
              </button>
              {/* Add Deck button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center h-10 min-w-[140px] px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus size={20} className="mr-2" />
                Add Deck
            </button>
          </div>
          </div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <BookOpen size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{totalDecks}</h3>
                  <p className="text-gray-600 dark:text-gray-400">Total Decks</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Target size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{totalCards}</h3>
                  <p className="text-gray-600 dark:text-gray-400">Total Flashcards</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <TrendingUp size={24} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{averageProgress}%</h3>
                  <p className="text-gray-600 dark:text-gray-400">Average Progress</p>
                </div>
              </div>
            </div>
          </div>
          {/* Tab Bar styled like Settings */}
          <div>
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 mb-2 gap-4 flex-wrap">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('decks')}
                  className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                    activeTab === 'decks'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  Decks
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
              {/* Search and Filters next to tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative w-full sm:w-56">
                  <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search ${activeTab === 'decks' ? 'decks' : 'archived'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {/* Sort */}
                <div className="flex items-center gap-1">
                  <Clock size={18} className="text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'recent' | 'name' | 'progress')}
                    className="px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="recent">Recent</option>
                    <option value="name">Name</option>
                    <option value="progress">Progress</option>
                  </select>
                </div>
                {/* Filter */}
                <div className="flex items-center gap-1">
                  <Target size={18} className="text-gray-400" />
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value as 'all' | 'studied' | 'new')}
                    className="px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Decks</option>
                    <option value="studied">Studied Decks</option>
                    <option value="new">New Decks</option>
                  </select>
                </div>
                {/* Pagination next to filters */}
                {activeTab === 'decks' && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredDecks.length / PAGE_SIZE)}
                    onPageChange={setCurrentPage}
                  />
                )}
                {activeTab === 'archived' && (
                  <Pagination
                    currentPage={currentArchivedPage}
                    totalPages={Math.ceil(filteredArchivedDecks.length / PAGE_SIZE)}
                    onPageChange={setCurrentArchivedPage}
                  />
                )}
              </div>
            </div>
            {/* Removed the <hr> below the tabs for consistency */}
          </div>
          {/* Tab Content */}
          {activeTab === 'decks' && (
            <div className="space-y-6 pb-6">
              {/* Decks Grid with scroll */}
              <div className="max-h-[80vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {pagedDecks.map((deck) => (
                  <div key={deck.id} className="relative">
                <DeckCard
                  deck={deck}
                      onStudy={handleStudy}
                      onQuiz={handleQuiz}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onViewStats={handleViewStats}
                      onOpen={handleOpenDeck}
                      onArchive={handleArchive}
                      onResetProgress={handleResetProgress}
                    />
                    {/* Subdecks display - click to open deck and view subdeck */}
                    {deck.subDecks && deck.subDecks.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {deck.subDecks.map((sub) => (
                          <div 
                            key={sub.id} 
                            onClick={() => navigate(`/decks/${deck.id}?subdeck=${sub.id}`)}
                            className="group relative bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 truncate">
                                  📚 {sub.title}
                                </h4>
                                {sub.description && (
                                  <p className="text-xs text-indigo-600 dark:text-indigo-400 truncate mt-0.5">
                                    {sub.description}
                                  </p>
                                )}
                              </div>
                              <div className="text-indigo-400 dark:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Removed Manage Subdecks button as requested */}
          </div>
                  ))}
        </div>
      </div>
              {/* Empty State */}
              {filteredDecks.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                    {decks.length === 0 ? 'No decks yet' : 'No decks found'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {decks.length === 0
                      ? 'Create your first deck to start learning!'
                      : 'Try adjusting your search or filter criteria.'
                    }
                  </p>
                  {decks.length === 0 && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Create Your First Deck
                    </button>
                  )}
                </div>
              )}
      {/* Modals */}
              {showCreateModal && (
        <CreateDeckModal
                  isOpen={showCreateModal}
                  onClose={() => setShowCreateModal(false)}
          onCreateDeck={handleCreateDeck}
        />
      )}
              {showEditModal && selectedDeck && (
                <EditDeckModal
                  isOpen={showEditModal}
                  deck={{
                    id: selectedDeck.id,
                    title: selectedDeck.title
                  }}
        onClose={() => {
                    setShowEditModal(false);
                    setSelectedDeck(null);
        }}
                  onUpdateDeck={handleUpdateDeck}
      />
              )}
              {showDeleteModal && selectedDeck && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
                  deckTitle={selectedDeck.title}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedDeck(null);
          }}
          onConfirm={() => {
                    handleDeleteDeck(selectedDeck);
                    setShowDeleteModal(false);
                    setSelectedDeck(null);
          }}
        />
      )}
              {showStatsModal && selectedDeck && selectedDeckStats && (
                <DeckStatsModal
                  isOpen={showStatsModal}
          deckTitle={selectedDeck.title}
                  stats={selectedDeckStats}
                  onClose={() => {
                    setShowStatsModal(false);
                    setSelectedDeck(null);
                    setSelectedDeckStats(null);
          }}
        />
      )}
                          {showSubDeckModal && selectedDeck && (
        <SubDeckModal
          isOpen={showSubDeckModal}
          deckTitle={selectedDeck.title}
          subDecks={selectedDeck.subDecks || []}
          onClose={() => {
            setShowSubDeckModal(false);
            setSelectedDeck(null);
          }}
          onAddSubDeck={(subDeckData) => handleAddSubDeck(selectedDeck.id, subDeckData)}
          onUpdateSubDeck={(id, subDeckData) => handleUpdateSubDeck(selectedDeck.id, id, subDeckData)}
          onDeleteSubDeck={(id) => handleDeleteSubDeck(selectedDeck.id, id)}
          onEditSubDeck={handleEditSubDeck}
        />
      )}
      {/* No Flashcards Error Modal */}
      {showNoFlashcardsModal && selectedDeck && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      No Flashcards Available
                    </h3>
                    <div className="mt-2">
                                           <p className="text-sm text-gray-500 dark:text-gray-400">
                       The deck "{selectedDeck.title}" has no flashcards. Please add some cards first!
                     </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    setShowNoFlashcardsModal(false);
                    setSelectedDeck(null);
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Convert Notes Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-6 pt-6 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/20 sm:mx-0 sm:h-10 sm:w-10">
                    <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="mt-3 text-left sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">🤖 AI-Powered Flashcard Generation</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Select notes and let DeepSeek-R1 intelligently convert them into high-quality flashcards.</p>
                    <div className="mt-4 space-y-4">
                      {/* Notebook selector */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notebook</label>
                        <div className="flex items-center gap-2">
                          <select
                            disabled={loadingNotes}
                            value={modalSelectedNotebookId ?? ''}
                            onChange={(e) => { const id = Number(e.target.value); setModalSelectedNotebookId(Number.isNaN(id) ? null : id); setSelectedNoteIds(new Set()); }}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            {notebooks.length === 0 && <option value="">{loadingNotes ? 'Loading...' : 'No notebooks found'}</option>}
                            {notebooks.map(nb => (
                              <option key={nb.id} value={nb.id}>{nb.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => ensureNotebooksLoaded()}
                            className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                            type="button"
                          >
                            Refresh
                          </button>
                        </div>
                      </div>
                      {/* Notes list */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                          <div className="flex items-center gap-2 text-sm">
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={modalSelectedNotebookId != null && (notesByNotebook[modalSelectedNotebookId]?.length || 0) > 0 && (notesByNotebook[modalSelectedNotebookId] || []).every(n => selectedNoteIds.has(n.id))}
                                onChange={(e) => handleSelectAllNotes(e.target.checked)}
                              />
                              <span className="text-gray-700 dark:text-gray-300">Select all</span>
                            </label>
                          </div>
                        </div>
                        <div className="max-h-60 overflow-auto rounded border border-gray-200 dark:border-gray-700">
                          {loadingNotes && (
                            <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading notes...</div>
                          )}
                          {!loadingNotes && modalSelectedNotebookId != null && (notesByNotebook[modalSelectedNotebookId]?.length || 0) === 0 && (
                            <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No notes in this notebook.</div>
                          )}
                          {!loadingNotes && modalSelectedNotebookId != null && (notesByNotebook[modalSelectedNotebookId]?.length || 0) > 0 && (
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                              {(notesByNotebook[modalSelectedNotebookId] || []).map(note => (
                                <li key={note.id} className="flex items-start gap-3 p-2">
                                  <input
                                    type="checkbox"
                                    className="mt-1"
                                    checked={selectedNoteIds.has(note.id)}
                                    onChange={() => handleToggleNoteSelection(note.id)}
                                  />
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{note.title}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xl">{truncateHtmlContent(note.content || '', 140)}</div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                      {/* Deck name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deck Name</label>
                        <input
                          type="text"
                          value={deckName}
                          onChange={(e) => setDeckName(e.target.value)}
                          placeholder="Enter a name for your flashcard deck"
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          🤖 DeepSeek-R1 will intelligently analyze your notes and create high-quality flashcards automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={loadingNotes || aiLoading}
                  onClick={convertSelectedNotes}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-60"
                >
                  {loadingNotes ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      AI Generating...
                    </>
                  ) : (
                    <>
                      🤖 Generate Flashcards
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
            </div>
          )}
          {activeTab === 'archived' && (
            <div className="space-y-6 pb-6">
              {filteredArchivedDecks.length > 0 ? (
                <div className="max-h-[80vh] overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {pagedArchivedDecks.map((deck) => (
                      <div key={deck.id} className="relative">
                        <DeckCard
                          deck={deck}
                          onStudy={handleStudy}
                          onQuiz={handleQuiz}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onViewStats={handleViewStats}
                          onOpen={handleOpenDeck}
                          onArchive={handleArchive}
                        />
                        {/* Subdecks display - click to open deck and view subdeck */}
                        {deck.subDecks && deck.subDecks.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {deck.subDecks.map((sub) => (
                              <div 
                                key={sub.id} 
                                onClick={() => navigate(`/decks/${deck.id}?subdeck=${sub.id}`)}
                                className="group relative bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 truncate">
                                      📚 {sub.title}
                                    </h4>
                                    {sub.description && (
                                      <p className="text-xs text-indigo-600 dark:text-indigo-400 truncate mt-0.5">
                                        {sub.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-indigo-400 dark:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                    {archivedDecks.length === 0 ? 'No archived decks yet' : 'No archived decks found'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {archivedDecks.length === 0
                      ? 'Archived decks will appear here when you archive them.'
                      : 'Try adjusting your search or filter criteria.'
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
    </PageLayout>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default Decks;
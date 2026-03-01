import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, BookOpen, TrendingUp, Clock, Target, FileText, ChevronDown, LayoutList, Play, X, Pencil, Trash2, Filter } from 'lucide-react';
import PageLayout from '../components/PageLayout';
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
import CreateGroupQuizModal from '../components/collaboration/CreateGroupQuizModal';
import GroupQuizResultsModal from '../components/collaboration/GroupQuizResultsModal';
import Toast from '../components/common/Toast';
import type { SubDeck } from '../components/decks/SubDeckModal';
import { truncateHtmlContent } from '../utils/htmlUtils';
import { API_BASE_URL } from '../config/api';
import axiosInstance from '../utils/axiosConfig';
import HeaderTooltip from '../components/common/HeaderTooltip';

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
  const [activeTab, setActiveTab] = useState<'decks' | 'archived' | 'stats' | 'groupQuizzes'>('decks');
  const [groupQuizzes, setGroupQuizzes] = useState<any[]>([]);
  const [loadingGroupQuizzes, setLoadingGroupQuizzes] = useState(false);
  const [showCreateGroupQuiz, setShowCreateGroupQuiz] = useState(false);
  const [selectedDeckForGroupQuiz, setSelectedDeckForGroupQuiz] = useState<Deck | null>(null);
  const [showGroupQuizResults, setShowGroupQuizResults] = useState(false);
  const [selectedGroupQuizIdForResults, setSelectedGroupQuizIdForResults] = useState<string | null>(null);
  const [activeGroupQuizId, setActiveGroupQuizId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentArchivedPage, setCurrentArchivedPage] = useState<number>(1);
  const PAGE_SIZE = 12;

  // Decks toolbar dropdowns (match Notes toolbar style)
  const [deckSortOpen, setDeckSortOpen] = useState(false);
  const [deckFilterOpen, setDeckFilterOpen] = useState(false);
  const deckSortRef = useRef<HTMLDivElement | null>(null);
  const deckFilterRef = useRef<HTMLDivElement | null>(null);
  const [deckListViewMode, setDeckListViewMode] = useState<'comfortable' | 'compact'>(() => {
    try {
      const saved = localStorage.getItem('prodactivity-decks-list-view');
      return saved === 'compact' ? 'compact' : 'comfortable';
    } catch {
      return 'comfortable';
    }
  });

  // Bulk delete decks (Delete Section) – same pattern as Notebooks
  const [showBulkDeleteDecksModal, setShowBulkDeleteDecksModal] = useState(false);
  const [selectedDecksForDelete, setSelectedDecksForDelete] = useState<string[]>([]);
  const [bulkDeleteDecksLoading, setBulkDeleteDecksLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('prodactivity-decks-list-view', deckListViewMode);
    } catch {
      // ignore
    }
  }, [deckListViewMode]);

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
  const [convertNotebookDropdownOpen, setConvertNotebookDropdownOpen] = useState(false);
  const [convertNotebookDropdownPosition, setConvertNotebookDropdownPosition] = useState<{
    top: number;
    bottom: number;
    left: number;
    width: number;
    openUpward?: boolean;
    maxHeight: number;
  } | null>(null);
  const convertNotebookDropdownRef = useRef<HTMLDivElement>(null);
  const convertNotebookPortalRef = useRef<HTMLDivElement>(null);
  const convertModalBodyRef = useRef<HTMLDivElement>(null);

  const DROPDOWN_MAX_HEIGHT = 224; // max-h-56
  const VIEWPORT_PADDING = 16;

  const updateConvertNotebookDropdownPosition = () => {
    const el = convertNotebookDropdownRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
    const spaceAbove = rect.top - VIEWPORT_PADDING;
    const openUpward = spaceBelow < Math.min(DROPDOWN_MAX_HEIGHT, 180) && spaceAbove > spaceBelow;
    const maxHeight = openUpward
      ? Math.min(DROPDOWN_MAX_HEIGHT, spaceAbove)
      : Math.min(DROPDOWN_MAX_HEIGHT, spaceBelow);
    setConvertNotebookDropdownPosition({
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      openUpward,
      maxHeight: Math.max(120, maxHeight),
    });
  };
  const [previewCount, setPreviewCount] = useState<number>(0);
  const [aiPreviewCards, setAiPreviewCards] = useState<FlashcardData[]>([]);
  const [showAiPreview, setShowAiPreview] = useState<boolean>(false);

  const getDeckProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

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

  // Close decks sort/filter dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (deckSortRef.current && !deckSortRef.current.contains(target)) {
        setDeckSortOpen(false);
      }
      if (deckFilterRef.current && !deckFilterRef.current.contains(target)) {
        setDeckFilterOpen(false);
      }
    };
    if (deckSortOpen || deckFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [deckSortOpen, deckFilterOpen]);

  useEffect(() => {
    if (!showConvertModal || !convertNotebookDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = convertNotebookDropdownRef.current?.contains(target);
      const inPortal = convertNotebookPortalRef.current?.contains(target);
      if (!inTrigger && !inPortal) setConvertNotebookDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showConvertModal, convertNotebookDropdownOpen]);

  useEffect(() => {
    if (!convertNotebookDropdownOpen || !showConvertModal) {
      setConvertNotebookDropdownPosition(null);
      return;
    }
    updateConvertNotebookDropdownPosition();
    const onScrollOrResize = () => updateConvertNotebookDropdownPosition();
    window.addEventListener('resize', onScrollOrResize);
    const body = convertModalBodyRef.current;
    body?.addEventListener('scroll', onScrollOrResize);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      body?.removeEventListener('scroll', onScrollOrResize);
      setConvertNotebookDropdownPosition(null);
    };
  }, [convertNotebookDropdownOpen, showConvertModal]);

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

  useEffect(() => {
    if (activeTab !== 'groupQuizzes') return;
    const fetchGroupQuizzes = async () => {
      setLoadingGroupQuizzes(true);
      try {
        const res = await axiosInstance.get('/decks/group-quizzes/');
        setGroupQuizzes(Array.isArray(res.data) ? res.data : []);
      } catch {
        setGroupQuizzes([]);
      } finally {
        setLoadingGroupQuizzes(false);
      }
    };
    fetchGroupQuizzes();
  }, [activeTab]);

  const handleCreateGroupQuiz = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
      setSelectedDeckForGroupQuiz(deck);
      setShowCreateGroupQuiz(true);
    }
  };

  const handleAcceptDeclineGroupQuiz = async (groupQuizId: string, accept: boolean) => {
    try {
      await axiosInstance.post(`/decks/group-quizzes/${groupQuizId}/participants/`, { action: accept ? 'accept' : 'decline' });
      setGroupQuizzes(prev => prev.filter(g => g.id !== groupQuizId));
      if (activeTab === 'groupQuizzes') {
        const res = await axiosInstance.get('/decks/group-quizzes/');
        setGroupQuizzes(Array.isArray(res.data) ? res.data : []);
      }
    } catch (e) {
      console.error(e);
      setToast({ message: accept ? 'Failed to accept' : 'Failed to decline', type: 'error' });
    }
  };

  const handleTakeGroupQuiz = async (gq: any) => {
    const deckId = gq.deck_id?.toString() ?? gq.deck_id;
    let deck = decks.find((d: Deck) => d.id === deckId) || archivedDecks.find((d: Deck) => d.id === deckId);
    if (!deck) {
      try {
        const res = await axiosInstance.get(`/decks/decks/${deckId}/`);
        const d = res.data;
        deck = {
          id: d.id.toString(),
          title: d.title,
          flashcardCount: d.flashcard_count ?? (d.flashcards?.length ?? 0),
          progress: d.progress ?? 0,
          created_at: d.created_at,
          updated_at: d.updated_at,
          createdAt: d.created_at,
          flashcards: (d.flashcards || []).map((fc: any) => ({
            id: fc.id?.toString(),
            question: fc.front,
            answer: fc.back,
            front: fc.front,
            back: fc.back,
            difficulty: fc.difficulty
          })),
          subDecks: d.sub_decks || [],
          is_deleted: false,
          is_archived: !!d.is_archived,
          archived_at: d.archived_at
        };
      } catch (err) {
        setToast({ message: 'Could not load deck', type: 'error' });
        return;
      }
    }
    if (deck.flashcardCount === 0) {
      setShowNoFlashcardsModal(true);
      return;
    }
    setSelectedDeck(deck);
    setActiveGroupQuizId(String(gq.id));
    setShowQuizSession(true);
  };

  const handleViewGroupQuizResults = (id: string) => {
    setSelectedGroupQuizIdForResults(id);
    setShowGroupQuizResults(true);
  };

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

  // Bulk delete decks (Delete Section) – moves selected decks to Trash
  const handleBulkDeleteDecks = async (deckIds: string[]) => {
    if (deckIds.length === 0) return;
    setBulkDeleteDecksLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const results = await Promise.allSettled(
        deckIds.map((id) =>
          fetch(`${API_BASE_URL}/decks/decks/${id}/`, {
            method: 'DELETE',
            headers: { Authorization: token ? `Bearer ${token}` : '' },
          })
        )
      );
      const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
      const successCount = deckIds.length - failed.length;
      setDecks((prev) => prev.filter((d) => !deckIds.includes(d.id)));
      setArchivedDecks((prev) => prev.filter((d) => !deckIds.includes(d.id)));
      setSelectedDecksForDelete([]);
      setShowBulkDeleteDecksModal(false);
      if (failed.length === 0) {
        setToast({ message: `${successCount} deck${successCount !== 1 ? 's' : ''} moved to Trash.`, type: 'success' });
      } else {
        setToast({
          message: `${successCount} deleted; ${failed.length} failed.`,
          type: 'error',
        });
      }
    } catch (error) {
      setToast({ message: 'Failed to delete decks.', type: 'error' });
    } finally {
      setBulkDeleteDecksLoading(false);
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
          groupQuizId={activeGroupQuizId ?? undefined}
          onViewGroupResults={handleViewGroupQuizResults}
          onClose={() => {
            setShowQuizSession(false);
            setSelectedDeck(null);
            setActiveGroupQuizId(null);
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
            setActiveGroupQuizId(null);
          }}
        />
      )}
      {showCreateGroupQuiz && selectedDeckForGroupQuiz && (
        <CreateGroupQuizModal
          isOpen={showCreateGroupQuiz}
          onClose={() => {
            setShowCreateGroupQuiz(false);
            setSelectedDeckForGroupQuiz(null);
          }}
          deckId={selectedDeckForGroupQuiz.id}
          deckTitle={selectedDeckForGroupQuiz.title}
          onCreateSuccess={() => {
            setActiveTab('groupQuizzes');
            const fetchGq = async () => {
              try {
                const res = await axiosInstance.get('/decks/group-quizzes/');
                setGroupQuizzes(Array.isArray(res.data) ? res.data : []);
              } catch {
                setGroupQuizzes([]);
              }
            };
            fetchGq();
          }}
        />
      )}
      {showGroupQuizResults && selectedGroupQuizIdForResults && (
        <GroupQuizResultsModal
          isOpen={showGroupQuizResults}
          onClose={() => {
            setShowGroupQuizResults(false);
            setSelectedGroupQuizIdForResults(null);
          }}
          groupQuizId={selectedGroupQuizIdForResults}
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
          onBulkDeleteFlashcards={(ids) => {
            if (!selectedDeck) return;
            const idSet = new Set(ids);
            setDecks(prev =>
              prev.map(deck =>
                deck.id === selectedDeck.id
                  ? (() => {
                      const newFlashcards = deck.flashcards.filter((f) => !idSet.has(f.id));
                      return {
                        ...deck,
                        flashcards: newFlashcards,
                        flashcardCount: newFlashcards.length,
                        updated_at: new Date().toISOString(),
                      };
                    })()
                  : deck
              )
            );
            setSelectedDeck((prev) => {
              if (!prev || prev.id !== selectedDeck.id) return prev;
              const newFlashcards = prev.flashcards.filter((f) => !idSet.has(f.id));
              return { ...prev, flashcards: newFlashcards, flashcardCount: newFlashcards.length };
            });
          }}
        />
      )}
      <PageLayout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Flashcards
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Ready to learn something new today?
              </p>
            </div>
            {/* Buttons moved down into filter row */}
            <div className="flex-1 md:flex-none" />
          </div>
          {/* Tab Bar styled like Settings (compact, like Notes) */}
          <div>
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 mb-2 gap-4 flex-wrap">
              {/* Tabs on left */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('decks')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                    activeTab === 'decks'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  Decks
                </button>
                <button
                  onClick={() => setActiveTab('archived')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                    activeTab === 'archived'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  Archived
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                    activeTab === 'stats'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  Stats
                </button>
                <button
                  onClick={() => setActiveTab('groupQuizzes')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                    activeTab === 'groupQuizzes'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  Group Quizzes
                </button>
              </div>
              {/* Pagination / Filters / Actions on right (compact) */}
              <div className="flex items-center gap-2 flex-wrap justify-end w-full md:w-auto">
                {activeTab !== 'stats' && activeTab !== 'groupQuizzes' && (
                  <>
                    {/* Pagination */}
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
                    {/* View mode toggle – Comfortable / Compact list (after pagination) */}
                    <HeaderTooltip label={deckListViewMode === 'compact' ? 'Comfortable list' : 'Compact list'}>
                      <button
                        type="button"
                        onClick={() =>
                          setDeckListViewMode((mode) =>
                            mode === 'compact' ? 'comfortable' : 'compact'
                          )
                        }
                        className={`flex items-center justify-center h-7 px-2.5 text-xs border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          deckListViewMode === 'compact'
                            ? 'border-indigo-400 bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-300 dark:border-indigo-400 dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:text-white dark:focus:ring-indigo-500'
                            : 'border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:ring-gray-300 dark:focus:ring-[#404040] hover:bg-gray-50 dark:hover:bg-[#2d2d2d]'
                        }`}
                        aria-label={
                          deckListViewMode === 'compact'
                            ? 'Switch to comfortable list'
                            : 'Switch to compact list'
                        }
                      >
                        <LayoutList size={14} className={deckListViewMode === 'compact' ? 'text-white' : 'text-gray-400'} />
                      </button>
                    </HeaderTooltip>
                    {/* Sort dropdown – Reviewer-style: icon + label + chevron */}
                    <div className="relative" ref={deckSortRef}>
                      <button
                        type="button"
                        onClick={() => setDeckSortOpen((o) => !o)}
                        className="flex items-center justify-center gap-1 h-7 pl-2.5 pr-2 text-xs rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#404040] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors"
                        aria-label="Sort decks"
                        aria-expanded={deckSortOpen}
                        title="Sort"
                      >
                        <Clock size={14} className="text-gray-500 dark:text-gray-400" />
                        <ChevronDown size={10} className={`text-gray-500 dark:text-gray-400 transition-transform ${deckSortOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {deckSortOpen && (
                        <div className="absolute right-0 top-full mt-1 min-w-[140px] bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333333] rounded-lg shadow-lg z-50 py-1">
                          {[
                            { value: 'recent' as const, label: 'Recent' },
                            { value: 'name' as const, label: 'Name' },
                            { value: 'progress' as const, label: 'Progress' },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => { setSortBy(opt.value); setDeckSortOpen(false); }}
                              className={`w-full px-2.5 py-1.5 text-left text-xs rounded-md transition-colors ${
                                sortBy === opt.value
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Filter dropdown – Reviewer-style: icon + label + chevron (All / Studied / New) */}
                    <div className="relative" ref={deckFilterRef}>
                      <button
                        type="button"
                        onClick={() => setDeckFilterOpen((o) => !o)}
                        className="flex items-center justify-center gap-1 h-7 pl-2.5 pr-2 text-xs rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#404040] hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors"
                        aria-label="Filter decks"
                        aria-expanded={deckFilterOpen}
                        title="Filter"
                      >
                        <Filter size={14} className="text-gray-500 dark:text-gray-400" />
                        <ChevronDown size={10} className={`text-gray-500 dark:text-gray-400 transition-transform ${deckFilterOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {deckFilterOpen && (
                        <div className="absolute right-0 top-full mt-1 min-w-[140px] bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333333] rounded-lg shadow-lg z-50 py-1">
                          {[
                            { value: 'all' as const, label: 'All' },
                            { value: 'studied' as const, label: 'Studied' },
                            { value: 'new' as const, label: 'New' },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => { setFilterBy(opt.value); setDeckFilterOpen(false); }}
                              className={`w-full px-2.5 py-1.5 text-left text-xs rounded-md transition-colors ${
                                filterBy === opt.value
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Delete Section (bulk delete decks) – same as Notebooks */}
                    {(activeTab === 'decks' ? filteredDecks.length : filteredArchivedDecks.length) > 0 && (
                      <HeaderTooltip label="Delete decks">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDecksForDelete([]);
                            setShowBulkDeleteDecksModal(true);
                          }}
                          className="px-2 h-7 text-xs border border-red-200 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center"
                          aria-label="Delete decks"
                        >
                          <Trash2 size={14} />
                        </button>
                      </HeaderTooltip>
                    )}
                    {/* Search Field */}
                    <div className="relative w-full sm:w-48">
                      <Search size={14} className="absolute left-2 top-1.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder={`Search ${activeTab === 'decks' ? 'decks' : 'archived'}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-7 pr-2 h-7 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    {/* Actions: Add Deck / Convert to Flashcards */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowConvertModal(true)}
                        className="inline-flex items-center h-7 px-3 text-xs font-medium rounded-lg border border-emerald-600 text-emerald-700 dark:text-emerald-300 bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                      >
                        <FileText size={14} className="mr-1.5" />
                        Convert
                      </button>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center h-7 px-3 text-xs font-medium rounded-lg border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                      >
                        <Plus size={14} className="mr-1.5" />
                        Add Deck
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Tab Content */}
          {activeTab === 'decks' && (
            <div className="space-y-6 pb-6">
              {/* Decks list/grid with scroll */}
              <div className="max-h-[80vh] overflow-y-auto pr-1">
                {deckListViewMode === 'comfortable' ? (
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
                          onCreateGroupQuiz={handleCreateGroupQuiz}
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
                ) : (
                  <div className="flex flex-col gap-1">
                    {pagedDecks.map((deck) => (
                      <div
                        key={deck.id}
                        className="flex items-center gap-3 w-full min-w-0 h-12 px-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer group"
                        onClick={() => handleOpenDeck(deck.id)}
                      >
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0">
                          <span
                            className={`block w-full h-full rounded-full ${getDeckProgressColor(
                              deck.progress
                            )}`}
                          />
                        </div>
                        <BookOpen className="flex-shrink-0 text-gray-500 dark:text-gray-400" size={18} />
                        <span className="font-medium truncate flex-1 min-w-0 text-sm text-gray-800 dark:text-gray-200">
                          {deck.title}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {deck.flashcardCount} cards
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {deck.progress}%
                        </span>
                        <div
                          className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleStudy(deck.id)}
                            className="px-2 h-7 text-[11px] rounded-md border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1"
                          >
                            <Play size={12} />
                            <span>Study</span>
                          </button>
                          <button
                            onClick={() => handleQuiz(deck.id)}
                            className="px-2 h-7 text-[11px] rounded-md border border-purple-600 bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-1"
                          >
                            <TrendingUp size={12} />
                            <span>Quiz</span>
                          </button>
                          <HeaderTooltip label="Edit deck">
                            <button
                              onClick={() => handleEdit(deck.id)}
                              className="p-1.5 h-7 w-7 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                              aria-label="Edit deck"
                            >
                              <Pencil size={12} />
                            </button>
                          </HeaderTooltip>
                          <HeaderTooltip label="Delete deck">
                            <button
                              onClick={() => handleDelete(deck.id)}
                              className="p-1.5 h-7 w-7 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:text-red-600 hover:border-red-300 dark:hover:border-red-800 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center"
                              aria-label="Delete deck"
                            >
                              <Trash2 size={12} />
                            </button>
                          </HeaderTooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
      {/* Bulk Delete Decks Modal (Delete Section) – same pattern as Notebooks */}
      {showBulkDeleteDecksModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40 dark:bg-black/60"
            onClick={() => {
              if (!bulkDeleteDecksLoading) {
                setShowBulkDeleteDecksModal(false);
                setSelectedDecksForDelete([]);
              }
            }}
          />
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="relative flex flex-col bg-white dark:bg-[#1e1e1e] rounded-md shadow-xl border border-gray-200 dark:border-[#333333] max-w-4xl w-full min-h-[36rem] max-h-[90vh] overflow-hidden z-[101]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-[#333333] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Delete Decks</h3>
                <button
                  type="button"
                  onClick={() => {
                    if (!bulkDeleteDecksLoading) {
                      setShowBulkDeleteDecksModal(false);
                      setSelectedDecksForDelete([]);
                    }
                  }}
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
                  disabled={bulkDeleteDecksLoading}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 py-3">
                <p className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Select decks to delete. They will be moved to Trash and can be restored from there.
                </p>
                {selectedDecksForDelete.length > 0 && (
                  <p className="flex-shrink-0 mb-2 text-xs text-red-600 dark:text-red-400">
                    {selectedDecksForDelete.length} deck{selectedDecksForDelete.length !== 1 ? 's' : ''} selected for deletion
                  </p>
                )}
                <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 dark:border-[#333333] rounded-md">
                  {(activeTab === 'decks' ? filteredDecks : filteredArchivedDecks).map((deck) => (
                    <div
                      key={deck.id}
                      className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] border-b border-gray-100 dark:border-[#333333] last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        id={`deck-bulk-${deck.id}`}
                        checked={selectedDecksForDelete.includes(deck.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDecksForDelete((prev) => [...prev, deck.id]);
                          } else {
                            setSelectedDecksForDelete((prev) => prev.filter((id) => id !== deck.id));
                          }
                        }}
                        disabled={bulkDeleteDecksLoading}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`deck-bulk-${deck.id}`}
                        className="ml-4 flex items-center flex-1 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg mr-4 bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                          <BookOpen size={16} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {deck.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {deck.flashcardCount} card{deck.flashcardCount !== 1 ? 's' : ''}
                            {deck.lastStudied
                              ? ` • Last studied ${new Date(deck.lastStudied).toLocaleDateString()}`
                              : ''}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0 px-4 py-2.5 border-t border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#252525] rounded-b-md flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!bulkDeleteDecksLoading) {
                      setShowBulkDeleteDecksModal(false);
                      setSelectedDecksForDelete([]);
                    }
                  }}
                  disabled={bulkDeleteDecksLoading}
                  className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-[#333333] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkDeleteDecks(selectedDecksForDelete)}
                  disabled={selectedDecksForDelete.length === 0 || bulkDeleteDecksLoading}
                  className="px-2.5 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkDeleteDecksLoading
                    ? 'Deleting…'
                    : `Delete${selectedDecksForDelete.length > 0 ? ` (${selectedDecksForDelete.length})` : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
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
      {/* Convert Notes Modal – AI-Powered Flashcard Generation (same style as Create Notebook / Document Settings) */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setShowConvertModal(false)} aria-hidden />
          <div
            className="relative bg-white dark:bg-[#1e1e1e] rounded-md shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col mx-4 border border-gray-200 dark:border-[#333333]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#333333]">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">AI-Powered Flashcard Generation</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Select notes and let DeepSeek-R1 convert them into flashcards.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div ref={convertModalBodyRef} className="px-4 py-3 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Deck Name</label>
                <input
                  type="text"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  placeholder="Enter a name for your flashcard deck"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-[#333333] rounded-md bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Notebook</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-0" ref={convertNotebookDropdownRef}>
                    <button
                      type="button"
                      disabled={loadingNotes}
                      onClick={() => !loadingNotes && notebooks.length > 0 && setConvertNotebookDropdownOpen((o) => !o)}
                      className="w-full flex items-center justify-between gap-1 h-8 pl-2.5 pr-2 text-xs rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      aria-expanded={convertNotebookDropdownOpen}
                    >
                      <span className="truncate">
                        {loadingNotes ? 'Loading...' : notebooks.length === 0 ? 'No notebooks found' : (modalSelectedNotebookId != null ? notebooks.find(nb => nb.id === modalSelectedNotebookId)?.name : 'Select notebook') ?? 'Select notebook'}
                      </span>
                      {notebooks.length > 0 && !loadingNotes && (
                        <ChevronDown size={14} className={`flex-shrink-0 text-gray-500 dark:text-gray-400 transition-transform ${convertNotebookDropdownOpen ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                    {convertNotebookDropdownOpen && notebooks.length > 0 && convertNotebookDropdownPosition && createPortal(
                      <div
                        ref={convertNotebookPortalRef}
                        className="fixed overflow-y-auto bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333333] rounded-lg shadow-lg py-1"
                        style={{
                          zIndex: 9999,
                          top: convertNotebookDropdownPosition.openUpward ? undefined : convertNotebookDropdownPosition.bottom + 4,
                          bottom: convertNotebookDropdownPosition.openUpward ? window.innerHeight - convertNotebookDropdownPosition.top + 4 : undefined,
                          left: convertNotebookDropdownPosition.left,
                          width: convertNotebookDropdownPosition.width,
                          minWidth: convertNotebookDropdownPosition.width,
                          maxHeight: convertNotebookDropdownPosition.maxHeight,
                        }}
                      >
                        {notebooks.map((nb) => (
                          <button
                            key={nb.id}
                            type="button"
                            onClick={() => { setModalSelectedNotebookId(nb.id); setSelectedNoteIds(new Set()); setConvertNotebookDropdownOpen(false); }}
                            className="w-full px-2.5 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] rounded-md transition-colors whitespace-nowrap truncate"
                          >
                            {nb.name}
                          </button>
                        ))}
                      </div>,
                      document.body
                    )}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-400">Notes</label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={modalSelectedNotebookId != null && (notesByNotebook[modalSelectedNotebookId]?.length || 0) > 0 && (notesByNotebook[modalSelectedNotebookId] || []).every(n => selectedNoteIds.has(n.id))}
                      onChange={(e) => handleSelectAllNotes(e.target.checked)}
                    />
                    Select all
                  </label>
                </div>
                <div className="max-h-48 overflow-auto rounded-md border border-gray-200 dark:border-[#333333]">
                  {loadingNotes && (
                    <div className="p-3 text-xs text-gray-500 dark:text-gray-400">Loading notes...</div>
                  )}
                  {!loadingNotes && modalSelectedNotebookId != null && (notesByNotebook[modalSelectedNotebookId]?.length || 0) === 0 && (
                    <div className="p-3 text-xs text-gray-500 dark:text-gray-400">No notes in this notebook.</div>
                  )}
                  {!loadingNotes && modalSelectedNotebookId != null && (notesByNotebook[modalSelectedNotebookId]?.length || 0) > 0 && (
                    <ul className="divide-y divide-gray-200 dark:divide-[#333333]">
                      {(notesByNotebook[modalSelectedNotebookId] || []).map(note => (
                        <li key={note.id} className="flex items-start gap-2 p-2">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={selectedNoteIds.has(note.id)}
                            onChange={() => handleToggleNoteSelection(note.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{note.title}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{truncateHtmlContent(note.content || '', 120)}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-[#333333] flex justify-end gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loadingNotes || aiLoading}
                onClick={convertSelectedNotes}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {loadingNotes || aiLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                    AI Generating...
                  </>
                ) : (
                  'Generate Flashcards'
                )}
              </button>
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
                  {deckListViewMode === 'comfortable' ? (
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
                            onCreateGroupQuiz={handleCreateGroupQuiz}
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
                  ) : (
                    <div className="flex flex-col gap-1">
                      {pagedArchivedDecks.map((deck) => (
                        <div
                          key={deck.id}
                          className="flex items-center gap-3 w-full min-w-0 h-12 px-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer group"
                          onClick={() => handleOpenDeck(deck.id)}
                        >
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0">
                            <span
                              className={`block w-full h-full rounded-full ${getDeckProgressColor(
                                deck.progress
                              )}`}
                            />
                          </div>
                          <BookOpen className="flex-shrink-0 text-gray-500 dark:text-gray-400" size={18} />
                          <span className="font-medium truncate flex-1 min-w-0 text-sm text-gray-800 dark:text-gray-200">
                            {deck.title}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                            {deck.flashcardCount} cards
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                            {deck.progress}%
                          </span>
                          <div
                            className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleStudy(deck.id)}
                              className="px-2 h-7 text-[11px] rounded-md border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1"
                            >
                              <Play size={12} />
                              <span>Study</span>
                            </button>
                            <button
                              onClick={() => handleQuiz(deck.id)}
                              className="px-2 h-7 text-[11px] rounded-md border border-purple-600 bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-1"
                            >
                              <TrendingUp size={12} />
                              <span>Quiz</span>
                            </button>
                            <HeaderTooltip label="Edit deck">
                              <button
                                onClick={() => handleEdit(deck.id)}
                                className="p-1.5 h-7 w-7 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                                aria-label="Edit deck"
                              >
                                <Pencil size={12} />
                              </button>
                            </HeaderTooltip>
                            <HeaderTooltip label="Delete deck">
                              <button
                                onClick={() => handleDelete(deck.id)}
                                className="p-1.5 h-7 w-7 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:text-red-600 hover:border-red-300 dark:hover:border-red-800 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center"
                                aria-label="Delete deck"
                              >
                                <Trash2 size={12} />
                              </button>
                            </HeaderTooltip>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
          {activeTab === 'groupQuizzes' && (
            <div className="mt-4">
              {loadingGroupQuizzes ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
                </div>
              ) : groupQuizzes.length === 0 ? (
                <div className="text-center py-12 rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1e1e1e]">
                  <Target size={40} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">No group quizzes yet.</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Create one from a deck: open the deck menu → &quot;Create group quiz&quot;.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {groupQuizzes.map((gq: any) => {
                    const userData = localStorage.getItem('user');
                    const currentUserId = userData ? (JSON.parse(userData)?.id ?? JSON.parse(userData)?.pk) : null;
                    const myPart = (gq.participants || []).find((p: any) => p.user_id === currentUserId || p.user_id === parseInt(currentUserId, 10));
                    const myStatus = myPart?.status ?? 'invited';
                    return (
                      <div
                        key={gq.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1e1e1e] px-3 py-2.5 min-h-[52px]"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{gq.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {gq.deck_title} · by {gq.created_by_username} · {gq.participant_count} participant{gq.participant_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-md ${
                            myStatus === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' :
                            myStatus === 'accepted' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' :
                            myStatus === 'declined' ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' :
                            'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                          }`}>
                            {myStatus}
                          </span>
                          {myStatus === 'invited' && (
                            <>
                              <button
                                onClick={() => handleAcceptDeclineGroupQuiz(String(gq.id), true)}
                                className="h-7 px-3 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleAcceptDeclineGroupQuiz(String(gq.id), false)}
                                className="h-7 px-3 text-xs font-medium rounded-lg border border-gray-300 dark:border-[#333333] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                              >
                                Decline
                              </button>
                            </>
                          )}
                          {myStatus === 'accepted' && gq.status === 'active' && (
                            <button
                              onClick={() => handleTakeGroupQuiz(gq)}
                              className="h-7 px-3 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                              Take Quiz
                            </button>
                          )}
                          {myStatus === 'completed' || gq.status === 'completed' ? (
                            <button
                              onClick={() => handleViewGroupQuizResults(String(gq.id))}
                              className="h-7 px-3 text-xs font-medium rounded-lg border border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                            >
                              View Results
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {activeTab === 'stats' && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
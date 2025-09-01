import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, Filter, BookOpen, TrendingUp, Clock, Target, FileText } from 'lucide-react';
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
import Toast from '../components/common/Toast';
import type { SubDeck } from '../components/decks/SubDeckModal';

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
  const [parseStrategy, setParseStrategy] = useState<'qa' | 'heading'>('qa');
  const [deckStrategy, setDeckStrategy] = useState<'per_note' | 'single'>('per_note');
  const [singleDeckName, setSingleDeckName] = useState<string>('Converted Notes');
  const [previewCount, setPreviewCount] = useState<number>(0);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    } as Record<string, string>;
  };

  const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

  const [modalSelectedNotebookId, setModalSelectedNotebookId] = useState<number | null>(null);

  const ensureNotebooksLoaded = async () => {
    if (notebooks.length > 0) return;
    try {
      setLoadingNotes(true);
      const res = await fetch(`${API_BASE}/notes/notebooks/`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch notebooks');
      const data = await res.json();
      // Handle paginated response
      const notebooksData = data.results || data;
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
      const res = await fetch(`${API_BASE}/notes/?notebook=${notebookId}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch notes');
      const data = await res.json();
      // Handle paginated response
      const notesData = data.results || data;
      setNotesByNotebook(prev => ({ ...prev, [notebookId]: notesData }));
    } catch (e) {
      setToast({ message: 'Failed to load notes', type: 'error' });
    } finally {
      setLoadingNotes(false);
    }
  };

  const parseNotesToCards = (notes: NoteItem[]): { question: string; answer: string }[] => {
    const cards: { question: string; answer: string }[] = [];
    
    // Helper function to clean HTML tags and normalize text
    const cleanText = (text: string): string => {
      return text
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace HTML entities
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };
    
    for (const note of notes) {
      const content = cleanText(note.content || '');
      console.log('Parsing note:', note.title, 'Content length:', content.length);
      
      if (parseStrategy === 'qa') {
        // Strategy 1: Look for explicit Q:/A: lines
        const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let i = 0;
        while (i < lines.length) {
          const line = lines[i];
          
          // Check for Q: A: pattern
          if (/^q\s*:|^Q\s*:/.test(line)) {
            const q = line.replace(/^q\s*:|^Q\s*:/, '').trim();
            let a = '';
            if (i + 1 < lines.length && (/^a\s*:|^A\s*:/.test(lines[i + 1]) || lines[i + 1].length > 0)) {
              const next = lines[i + 1];
              a = next.replace(/^a\s*:|^A\s*:/, '').trim();
              i += 2;
            } else {
              i += 1;
            }
            if (q && a) {
              cards.push({ question: q, answer: a });
              console.log('Found Q/A pattern:', q, '->', a);
            }
            continue;
          }
          
          // Check for question mark pattern
          if (line.endsWith('?')) {
            const q = line;
            let a = '';
            let j = i + 1;
            while (j < lines.length && !lines[j].endsWith('?') && !/^q\s*:|^Q\s*:/.test(lines[j])) {
              if (a.length > 0) a += ' ';
              a += lines[j];
              j++;
            }
            if (q && a) {
              cards.push({ question: q, answer: a });
              console.log('Found ? pattern:', q, '->', a);
            }
            i = j;
            continue;
          }
          
          i++;
        }
        
        // Strategy 2: If no Q/A patterns found, create cards from sentences with better logic
        if (cards.length === 0) {
          const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
          for (let i = 0; i < sentences.length - 1; i++) {
            const currentSentence = sentences[i].trim();
            const nextSentence = sentences[i + 1].trim();
            
            // Skip if either sentence is too short or too long
            if (currentSentence.length < 10 || currentSentence.length > 200 || 
                nextSentence.length < 10 || nextSentence.length > 300) {
              continue;
            }
            
            // Create a question from the current sentence
            let question = currentSentence;
            if (!question.endsWith('?')) {
              // Try to make it a question if it's not already
              if (question.toLowerCase().includes('is') || question.toLowerCase().includes('are') || 
                  question.toLowerCase().includes('can') || question.toLowerCase().includes('will')) {
                question = question + '?';
              } else {
                question = 'What is ' + question.toLowerCase() + '?';
              }
            }
            
            cards.push({ question, answer: nextSentence });
            console.log('Created from sentences:', question.substring(0, 50), '->', nextSentence.substring(0, 50));
          }
        }
        
        // Strategy 3: If still no cards, create from key concepts
        if (cards.length === 0) {
          const lines = content.split('\n').filter(line => line.trim().length > 20);
          for (let i = 0; i < lines.length - 1; i++) {
            const concept = lines[i].trim();
            const explanation = lines[i + 1].trim();
            
            if (concept && explanation && concept.length > 10 && explanation.length > 10) {
              const question = `What is ${concept.split(' ').slice(0, 3).join(' ')}?`;
              cards.push({ question, answer: explanation });
              console.log('Created from concepts:', question, '->', explanation.substring(0, 50));
            }
          }
        }
        
      } else {
        // Heading strategy: treat markdown headings as questions, next paragraph as answer
        const lines = content.split('\n');
        let i = 0;
        while (i < lines.length) {
          const raw = lines[i].trim();
          const isHeading = /^(#{1,6})\s+/.test(raw);
          if (isHeading) {
            const q = raw.replace(/^(#{1,6})\s+/, '').trim();
            let aLines: string[] = [];
            i++;
            while (i < lines.length) {
              const t = lines[i].trim();
              if (t.length === 0) { i++; continue; }
              if (/^(#{1,6})\s+/.test(t)) break;
              aLines.push(t);
              i++;
              // Stop answer at blank line to avoid swallowing entire doc
              if (i < lines.length && lines[i].trim() === '') break;
            }
            const a = aLines.join(' ');
            if (q && a) {
              cards.push({ question: q, answer: a });
              console.log('Found heading pattern:', q, '->', a);
            }
            continue;
          }
          i++;
        }
        
        // Fallback: If no headings found, create from paragraphs
        if (cards.length === 0) {
          const paragraphs = content.split('\n\n').filter(p => p.trim().length > 10);
          for (let i = 0; i < paragraphs.length - 1; i += 2) {
            const question = paragraphs[i].trim();
            const answer = paragraphs[i + 1].trim();
            if (question && answer && question.length > 5 && answer.length > 5) {
              cards.push({ question, answer });
              console.log('Created from paragraphs (heading strategy):', question.substring(0, 50), '->', answer.substring(0, 50));
            }
          }
        }
      }
      
      // Final fallback: If still no cards, create better cards from content chunks
      if (cards.length === 0 && content.trim().length > 20) {
        const chunks = content.split(/[.!?]+/).filter(chunk => chunk.trim().length > 20);
        
        if (chunks.length >= 2) {
          // Create multiple cards from content chunks
          for (let i = 0; i < chunks.length - 1; i++) {
            const chunk = chunks[i].trim();
            const nextChunk = chunks[i + 1].trim();
            
            if (chunk.length > 15 && nextChunk.length > 15) {
              const question = `What is ${chunk.split(' ').slice(0, 4).join(' ')}?`;
              const answer = nextChunk;
              cards.push({ question, answer });
              console.log('Created fallback card:', question, '->', answer.substring(0, 50));
            }
          }
        } else {
          // Single card from title and content
          const question = note.title || 'What is this note about?';
          const answer = content.substring(0, 300) + (content.length > 300 ? '...' : '');
          cards.push({ question, answer });
          console.log('Created single fallback card:', question, '->', answer.substring(0, 50));
        }
      }
    }
    
    console.log('Total cards created:', cards.length);
    return cards;
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
    if (modalSelectedNotebookId == null) { setPreviewCount(0); return; }
    const notes = notesByNotebook[modalSelectedNotebookId] || [];
    const selected = notes.filter(n => selectedNoteIds.has(n.id));
    const cards = parseNotesToCards(selected);
    setPreviewCount(cards.length);
  }, [selectedNoteIds, parseStrategy, notesByNotebook, modalSelectedNotebookId, showConvertModal]);

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
    const token = localStorage.getItem('accessToken');
    try {
      setLoadingNotes(true);
      const createdDecks: Deck[] = [];
      
      if (deckStrategy === 'single') {
        // Create single deck
        const res = await fetch('http://localhost:8000/api/decks/decks/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
          body: JSON.stringify({ title: singleDeckName.trim() || 'Converted Notes' })
        });
        if (!res.ok) throw new Error('Failed to create deck');
        const deckData = await res.json();
        const allCards = parseNotesToCards(selectedNotes);
        
        // Create flashcards with proper error handling
        const createdFlashcards = [];
        for (const card of allCards) {
          const flashcardRes = await fetch('http://localhost:8000/api/decks/flashcards/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
            body: JSON.stringify({ deck: deckData.id, front: card.question, back: card.answer })
          });
          if (!flashcardRes.ok) {
            console.error('Failed to create flashcard:', card);
            continue;
          }
          const flashcardData = await flashcardRes.json();
          createdFlashcards.push({
            id: flashcardData.id.toString(),
            question: flashcardData.front,
            answer: flashcardData.back,
            front: flashcardData.front,
            back: flashcardData.back,
            difficulty: undefined
          });
        }
        
        const newDeck: Deck = {
          id: deckData.id.toString(),
          title: deckData.title,
          flashcardCount: createdFlashcards.length,
          progress: 0,
          created_at: deckData.created_at,
          updated_at: deckData.updated_at,
          createdAt: deckData.created_at,
          flashcards: createdFlashcards,
          subDecks: [],
          is_deleted: false,
          is_archived: false,
        };
        createdDecks.push(newDeck);
      } else {
        // Create a deck per note
        for (const note of selectedNotes) {
          const res = await fetch('http://localhost:8000/api/decks/decks/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
            body: JSON.stringify({ title: note.title || `Note ${note.id}` })
          });
          if (!res.ok) throw new Error('Failed to create deck');
          const deckData = await res.json();
          const cards = parseNotesToCards([note]);
          
          // Create flashcards with proper error handling
          const createdFlashcards = [];
          for (const card of cards) {
            const flashcardRes = await fetch('http://localhost:8000/api/decks/flashcards/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
              body: JSON.stringify({ deck: deckData.id, front: card.question, back: card.answer })
            });
            if (!flashcardRes.ok) {
              console.error('Failed to create flashcard:', card);
              continue;
            }
            const flashcardData = await flashcardRes.json();
            createdFlashcards.push({
              id: flashcardData.id.toString(),
              question: flashcardData.front,
              answer: flashcardData.back,
              front: flashcardData.front,
              back: flashcardData.back,
              difficulty: undefined
            });
          }
          
          const newDeck: Deck = {
            id: deckData.id.toString(),
            title: deckData.title,
            flashcardCount: createdFlashcards.length,
            progress: 0,
            created_at: deckData.created_at,
            updated_at: deckData.updated_at,
            createdAt: deckData.created_at,
            flashcards: createdFlashcards,
            subDecks: [],
            is_deleted: false,
            is_archived: false,
          };
          createdDecks.push(newDeck);
        }
      }
      
      // Merge into current decks
      setDecks(prev => [...prev, ...createdDecks]);
      setToast({ message: `Successfully created ${createdDecks.length} deck(s) with flashcards`, type: 'success' });
      // Reset modal state
      setShowConvertModal(false);
      setSelectedNoteIds(new Set());
    } catch (e) {
      console.error('Conversion error:', e);
      setToast({ message: 'Conversion failed. Please try again.', type: 'error' });
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        
        // Fetch active decks
        const activeRes = await fetch('http://localhost:8000/api/decks/decks/', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });
        if (!activeRes.ok) throw new Error('Failed to fetch active decks');
        const activeData = await activeRes.json();
        // Handle paginated response
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

        // Fetch archived decks
        const archivedRes = await fetch('http://localhost:8000/api/decks/archived/decks/', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });
        if (archivedRes.ok) {
          const archivedData = await archivedRes.json();
          // Handle paginated response
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
      const res = await fetch('http://localhost:8000/api/decks/decks/', {
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
      const res = await fetch(`http://localhost:8000/api/decks/decks/${deck.id}/`, {
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
      const res = await fetch(`http://localhost:8000/api/decks/decks/${deck.id}/`, {
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
        const deckToArchive = { ...deck, is_archived: true, archived_at: new Date().toISOString() };
        setArchivedDecks(prev => [...prev, deckToArchive]);
        setDecks(prev => prev.filter(d => d.id !== deck.id));
      } else {
        // Move from archived decks back to active decks
        const deckToUnarchive = { ...deck, is_archived: false, archived_at: undefined };
        setDecks(prev => [...prev, deckToUnarchive]);
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
    const newSubDeck: SubDeck = {
      id: Date.now().toString(),
      ...subDeck,
      description: subDeck.description || '',
      created_at: now,
      updated_at: now
    };
    setDecks(decks.map(deck => 
      deck.id === deckId 
        ? { ...deck, subDecks: [...(deck.subDecks || []), newSubDeck] }
        : deck
    ));
  };

  const handleUpdateSubDeck = (deckId: string, subDeckId: string, subDeck: Omit<SubDeck, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
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
  };

  const handleDeleteSubDeck = (deckId: string, subDeckId: string) => {
    setDecks(decks.map(deck => 
      deck.id === deckId 
        ? { 
            ...deck, 
            subDecks: (deck.subDecks || []).filter((sd: SubDeck) => sd.id !== subDeckId)
          }
        : deck
    ));
  };

  const handleManageSubDecks = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
      setSelectedDeck(deck);
      setShowSubDeckModal(true);
    }
  };

  const handleAddFlashcard = async (flashcard: Omit<FlashcardData, 'id'>) => {
    if (!selectedDeck) return;
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:8000/api/decks/flashcards/', {
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

  const totalPages = Math.max(1, Math.ceil(filteredDecks.length / PAGE_SIZE));
  useEffect(() => {
    // Reset to first page when filters/search change
    setCurrentPage(1);
  }, [searchTerm, sortBy, filterBy]);
  useEffect(() => {
    // Clamp current page if total pages shrinks
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages]);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const pagedDecks = filteredDecks.slice(startIndex, endIndex);

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
            fetch(`http://localhost:8000/api/decks/decks/${selectedDeck.id}/`, {
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
            const res = await fetch(`http://localhost:8000/api/decks/decks/${selectedDeck.id}/`, {
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Flashcards
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Ready to learn something new today?
              </p>
            </div>
            {/* Controls and Add Deck button */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2 md:gap-4 w-full md:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-56">
                <Search size={20} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search decks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {/* Sort */}
              <div className="flex items-center gap-2">
                <Clock size={20} className="text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'name' | 'progress')}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="recent">Recent</option>
                  <option value="name">Name</option>
                  <option value="progress">Progress</option>
                </select>
              </div>
              {/* Filter */}
              <div className="flex items-center gap-2">
                <Filter size={20} className="text-gray-400" />
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as 'all' | 'studied' | 'new')}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Decks</option>
                  <option value="studied">Studied</option>
                  <option value="new">New</option>
                </select>
              </div>
              {/* Convert Notes button */}
              <button
                onClick={() => setShowConvertModal(true)}
                className="inline-flex items-center h-10 min-w-[180px] px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                <FileText size={20} className="mr-2" />
                Convert Notes
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
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 mb-2">
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
              <Pagination
                currentPage={currentPage}
                totalPages={activeTab === 'decks' 
                  ? Math.ceil(filteredDecks.length / PAGE_SIZE)
                  : Math.ceil(1 / PAGE_SIZE) // Placeholder for archived pagination
                }
                onPageChange={setCurrentPage}
              />
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
                    />
                    {/* Subdecks display */}
                    {deck.subDecks && deck.subDecks.length > 0 && (
                      <div className="mt-2 ml-2 flex flex-wrap gap-2">
                        {deck.subDecks.map((sub) => (
                          <span key={sub.id} className="inline-block bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-xs font-medium border border-indigo-200 dark:border-indigo-700">
                            {sub.title}
                          </span>
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
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Convert Notes to Flashcards</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Select notes and how to parse them into Q/A cards. Create a single deck or one deck per note.</p>
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
                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xl">{note.content?.slice(0, 140)}</div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                      {/* Parsing strategy */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parsing Strategy</label>
                          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                            <label className="flex items-center gap-2">
                              <input type="radio" name="parseStrategy" value="qa" checked={parseStrategy === 'qa'} onChange={() => setParseStrategy('qa')} />
                              Q/A lines (detect lines starting with "Q:" followed by "A:", or questions ending with "?")
                            </label>
                            <label className="flex items-center gap-2">
                              <input type="radio" name="parseStrategy" value="heading" checked={parseStrategy === 'heading'} onChange={() => setParseStrategy('heading')} />
                              Headings as questions (Markdown headings, next paragraph as answer)
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deck Strategy</label>
                          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                            <label className="flex items-center gap-2">
                              <input type="radio" name="deckStrategy" value="per_note" checked={deckStrategy === 'per_note'} onChange={() => setDeckStrategy('per_note')} />
                              Create a deck per selected note (deck name = note title)
                            </label>
                            <label className="flex items-center gap-2">
                              <input type="radio" name="deckStrategy" value="single" checked={deckStrategy === 'single'} onChange={() => setDeckStrategy('single')} />
                              Create a single deck for all cards
                            </label>
                            {deckStrategy === 'single' && (
                              <input
                                type="text"
                                value={singleDeckName}
                                onChange={(e) => setSingleDeckName(e.target.value)}
                                placeholder="Deck name"
                                className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Preview */}
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Estimated cards: <span className="font-semibold">{previewCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={loadingNotes}
                  onClick={convertSelectedNotes}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-60"
                >
                  Convert
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
              {archivedDecks.length > 0 ? (
                <div className="max-h-[80vh] overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {archivedDecks.map((deck) => (
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
                        {/* Subdecks display */}
                        {deck.subDecks && deck.subDecks.length > 0 && (
                          <div className="mt-2 ml-2 flex flex-wrap gap-2">
                            {deck.subDecks.map((sub) => (
                              <span key={sub.id} className="inline-block bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-xs font-medium border border-indigo-200 dark:border-indigo-700">
                                {sub.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 min-h-[300px] flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-400 text-lg">No archived decks yet.</span>
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
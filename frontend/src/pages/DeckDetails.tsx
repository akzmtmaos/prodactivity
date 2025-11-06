import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Plus, Edit2, Trash2, ChevronRight, Play, HelpCircle, ChevronLeft, FileText } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Pagination from '../components/common/Pagination';
import CreateDeckModal from '../components/decks/CreateDeckModal';
import DeleteConfirmationModal from '../components/decks/DeleteConfirmationModal';
import EditDeckModal from '../components/decks/EditDeckModal';
import DeckStatsModal from '../components/decks/DeckStatsModal';
import StudySession from '../components/decks/StudySession';
import QuizSession from '../components/decks/QuizSession';
import DeckCard from '../components/decks/DeckCard';
import { truncateHtmlContent } from '../utils/htmlUtils';
import { API_BASE_URL } from '../config/api';
import axiosInstance from '../utils/axiosConfig';
import axios from 'axios';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  front?: string;
  back?: string;
}

interface Subdeck {
  id: string;
  title: string;
  flashcards: Flashcard[];
}

interface Deck {
  id: string;
  title: string;
  subdecks: Subdeck[];
  flashcards: Flashcard[];
  flashcardCount: number;
  progress: number;
  created_at: string;
  updated_at: string;
  parent?: { id: string; title: string } | null;
}

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

const DeckDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateSubdeck, setShowCreateSubdeck] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newFlashcard, setNewFlashcard] = useState({ question: '', answer: '', questionImage: null as File | null });
  const [questionImagePreview, setQuestionImagePreview] = useState<string | null>(null);
  const [isAddingFlashcard, setIsAddingFlashcard] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFlashcardId, setEditingFlashcardId] = useState<string | null>(null);
  const [editingFlashcard, setEditingFlashcard] = useState({ question: '', answer: '' });
  const [isUpdatingFlashcard, setIsUpdatingFlashcard] = useState(false);
  const [flashcardCurrentPage, setFlashcardCurrentPage] = useState(1);
  const FLASHCARD_PAGE_SIZE = 10;
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showStudySession, setShowStudySession] = useState(false);
  const [showQuizSession, setShowQuizSession] = useState(false);
  const [selectedSubdeck, setSelectedSubdeck] = useState<Subdeck | null>(null);
  const [selectedFlashcard, setSelectedFlashcard] = useState<Flashcard | null>(null);
  const [activeTab, setActiveTab] = useState<'subdecks' | 'flashcards'>('subdecks');
  
  // Import notes modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [notesByNotebook, setNotesByNotebook] = useState<Record<number, NoteItem[]>>({});
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<number>>(new Set());
  const [loadingNotes, setLoadingNotes] = useState<boolean>(false);
  const [parseStrategy, setParseStrategy] = useState<'qa' | 'heading'>('qa');
  const [previewCount, setPreviewCount] = useState<number>(0);
  const [modalSelectedNotebookId, setModalSelectedNotebookId] = useState<number | null>(null);

  // Fetch deck data
  useEffect(() => {
    const fetchDeck = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/decks/decks/${id}/`);
        const data = res.data;
        setDeck({
          id: data.id.toString(),
          title: data.title,
          flashcardCount: data.flashcard_count || 0,
          progress: data.progress || 0,
          created_at: data.created_at,
          updated_at: data.updated_at,
          subdecks: data.subdecks || [],
          flashcards: (data.flashcards || []).map((fc: any) => ({
            id: fc.id.toString(),
            question: fc.front,
            answer: fc.back,
            front: fc.front,
            back: fc.back,
            difficulty: fc.difficulty
          })),
          parent: data.parent ? { id: data.parent, title: data.parent_title || 'Parent Deck' } : null
        });
      } catch (error) {
        console.error('Error fetching deck:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeck();
  }, [id]);

  // Fetch subdecks from backend for up-to-date data
  const [subdecksLoading, setSubdecksLoading] = useState(false);
  const [subdecks, setSubdecks] = useState<Subdeck[]>([]);
  useEffect(() => {
    const fetchSubdecks = async () => {
      if (!id) return;
      setSubdecksLoading(true);
      try {
        const res = await axiosInstance.get(`/decks/decks/?parent=${id}`);
        const data = res.data;
        setSubdecks(data.map((sd: any) => ({
          id: sd.id.toString(),
          title: sd.title,
          flashcards: (sd.flashcards || []).map((fc: any) => ({
            id: fc.id.toString(),
            question: fc.front,
            answer: fc.back,
            front: fc.front,
            back: fc.back,
            difficulty: fc.difficulty
          }))
        })));
      } catch (error) {
        setSubdecks([]);
      } finally {
        setSubdecksLoading(false);
      }
    };
    fetchSubdecks();
  }, [id, showCreateSubdeck]);

  // Import modal effects
  useEffect(() => {
    if (!showImportModal) return;
    ensureNotebooksLoaded();
  }, [showImportModal]);

  useEffect(() => {
    if (!showImportModal || modalSelectedNotebookId == null) return;
    fetchNotesForNotebook(modalSelectedNotebookId);
  }, [showImportModal, modalSelectedNotebookId]);

  useEffect(() => {
    if (!showImportModal) return;
    if (modalSelectedNotebookId == null) { setPreviewCount(0); return; }
    const notes = notesByNotebook[modalSelectedNotebookId] || [];
    const selected = notes.filter(n => selectedNoteIds.has(n.id));
    const cards = parseNotesToCards(selected);
    setPreviewCount(cards.length);
  }, [selectedNoteIds, parseStrategy, notesByNotebook, modalSelectedNotebookId, showImportModal]);

  // Real subdeck creation
  const handleCreateSubdeck = async (deckData: { title: string }) => {
    if (!id) return;
    try {
      const res = await axiosInstance.post('/decks/decks/', {
        title: deckData.title,
        parent: id
      });
      const newSubdeck = res.data;
      setSubdecks(prev => [
        ...prev,
        {
          id: newSubdeck.id.toString(),
          title: newSubdeck.title,
          flashcards: (newSubdeck.flashcards || []).map((fc: any) => ({
            id: fc.id.toString(),
            question: fc.front,
            answer: fc.back,
            front: fc.front,
            back: fc.back,
            difficulty: fc.difficulty
          }))
        }
      ]);
      setShowCreateSubdeck(false);
    } catch (error) {
      alert('Error creating subdeck.');
    }
  };

  // Handle image upload for question
  const handleQuestionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setNewFlashcard({ ...newFlashcard, questionImage: file });
      const reader = new FileReader();
      reader.onload = (e) => {
        setQuestionImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeQuestionImage = () => {
    setNewFlashcard({ ...newFlashcard, questionImage: null });
    setQuestionImagePreview(null);
  };

  const handleAddFlashcard = async () => {
    if (!deck) return;
    // Validate: must have either question text OR image
    if (!newFlashcard.question.trim() && !newFlashcard.questionImage) return;
    if (!newFlashcard.answer.trim()) return;
    
    try {
      setIsAddingFlashcard(true);
      const token = localStorage.getItem('accessToken');
      
      // Prepare question text with image if available
      let questionText = newFlashcard.question.trim();
      if (newFlashcard.questionImage && questionImagePreview) {
        // If there's an image, append it as an img tag in the question
        questionText = questionText ? `${questionText}<br/><img src="${questionImagePreview}" alt="Question image" style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 8px;" />` : `<img src="${questionImagePreview}" alt="Question image" style="max-width: 100%; height: auto; border-radius: 8px;" />`;
      }
      
      const res = await axiosInstance.post('/decks/flashcards/', {
        deck: deck.id,
        front: questionText || 'Image Question',
        back: newFlashcard.answer.trim()
      });
      
      const data = res.data;
      const createdFlashcard: Flashcard = {
        id: data.id.toString(),
        question: data.front,
        answer: data.back,
        front: data.front,
        back: data.back,
        difficulty: data.difficulty
      };
      
      // Update deck state - add new flashcard at the top
      setDeck({
        ...deck,
        flashcards: [createdFlashcard, ...deck.flashcards],
        flashcardCount: deck.flashcardCount + 1
      });
      
      // Reset form but keep it open for adding more
      setNewFlashcard({ question: '', answer: '', questionImage: null });
      setQuestionImagePreview(null);
      
      // Reset to first page after adding new flashcard
      setFlashcardCurrentPage(1);
      
      // Focus question field again for quick input
      setTimeout(() => {
        if (questionRef.current) {
          questionRef.current.focus();
        }
      }, 0);
    } catch (error) {
      console.error('Error creating flashcard:', error);
      alert('Error creating flashcard. Please try again.');
    } finally {
      setIsAddingFlashcard(false);
    }
  };

  // Autofocus question when opening the add form
  const questionRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (showAddForm && questionRef.current) {
      questionRef.current.focus();
    }
  }, [showAddForm]);

  // Handle update flashcard
  const handleUpdateFlashcard = async () => {
    if (!deck || !editingFlashcardId || !editingFlashcard.question.trim() || !editingFlashcard.answer.trim()) return;
    
    try {
      setIsUpdatingFlashcard(true);
      const res = await axiosInstance.patch(`/decks/flashcards/${editingFlashcardId}/`, {
        front: editingFlashcard.question.trim(),
        back: editingFlashcard.answer.trim()
      });
      
      const data = res.data;
      
      // Update deck state
      setDeck({
        ...deck,
        flashcards: deck.flashcards.map(card => 
          card.id === editingFlashcardId 
            ? {
                ...card,
                question: data.front,
                answer: data.back,
                front: data.front,
                back: data.back,
              }
            : card
        )
      });
      
      // Reset edit state
      setEditingFlashcardId(null);
      setEditingFlashcard({ question: '', answer: '' });
    } catch (error) {
      console.error('Error updating flashcard:', error);
      alert('Error updating flashcard. Please try again.');
    } finally {
      setIsUpdatingFlashcard(false);
    }
  };

  // Handle start editing
  const handleStartEdit = (card: Flashcard) => {
    setEditingFlashcardId(card.id);
    setEditingFlashcard({ question: card.question, answer: card.answer });
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingFlashcardId(null);
    setEditingFlashcard({ question: '', answer: '' });
  };

  // Handle delete flashcard
  const handleDeleteFlashcard = async (flashcardId: string) => {
    if (!deck) return;
    
    try {
      await axiosInstance.delete(`/decks/flashcards/${flashcardId}/`);
      
      // Update deck state - remove deleted flashcard
      setDeck({
        ...deck,
        flashcards: deck.flashcards.filter(card => card.id !== flashcardId),
        flashcardCount: deck.flashcardCount - 1
      });
      
      // Close modal and reset selected flashcard
      setShowDeleteModal(false);
      setSelectedFlashcard(null);
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      alert('Error deleting flashcard. Please try again.');
    }
  };

  const handleDeleteSubdeck = (subdeckId: string) => {
    // Mock implementation - in real app, this would make an API call
    console.log('Deleting subdeck:', subdeckId);
    setShowDeleteModal(false);
    setSelectedSubdeck(null);
  };

  const handlePractice = () => {
    if (deck) {
      setShowStudySession(true);
    }
  };

  const handleQuiz = () => {
    if (deck) {
      setShowQuizSession(true);
    }
  };

  // Import notes functionality

  const ensureNotebooksLoaded = async () => {
    if (notebooks.length > 0) return;
    try {
      setLoadingNotes(true);
      const res = await axiosInstance.get('/notes/notebooks/');
      const data = res.data.results || res.data;
      setNotebooks(data);
      if (data.length > 0) setModalSelectedNotebookId(data[0].id);
    } catch (e) {
      console.error('Failed to load notebooks:', e);
    } finally {
      setLoadingNotes(false);
    }
  };

  const fetchNotesForNotebook = async (notebookId: number) => {
    if (notesByNotebook[notebookId]) return; // already loaded
    try {
      setLoadingNotes(true);
      const res = await axiosInstance.get(`/notes/?notebook=${notebookId}`);
      const data = res.data.results || res.data;
      setNotesByNotebook(prev => ({ ...prev, [notebookId]: data }));
    } catch (e) {
      console.error('Failed to load notes:', e);
    } finally {
      setLoadingNotes(false);
    }
  };

  const parseNotesToCards = (notes: NoteItem[]): { question: string; answer: string }[] => {
    const cards: { question: string; answer: string }[] = [];
    for (const note of notes) {
      const content = (note.content || '').replace(/\r\n/g, '\n');
      if (parseStrategy === 'qa') {
        // Look for explicit Q:/A: lines, else use ? heuristic
        const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let i = 0;
        while (i < lines.length) {
          const line = lines[i];
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
            if (q && a) cards.push({ question: q, answer: a });
            continue;
          }
          if (line.endsWith('?')) {
            const q = line;
            // Collect the next non-empty line(s) until blank or new question
            let a = '';
            let j = i + 1;
            while (j < lines.length && !lines[j].endsWith('?') && !/^q\s*:|^Q\s*:/.test(lines[j])) {
              if (a.length > 0) a += ' ';
              a += lines[j];
              j++;
            }
            if (q && a) cards.push({ question: q, answer: a });
            i = j;
            continue;
          }
          i++;
        }
      } else {
        // heading strategy: treat markdown headings as questions, next paragraph as answer
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
            if (q && a) cards.push({ question: q, answer: a });
            continue;
          }
          i++;
        }
      }
    }
    return cards;
  };

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

  const importSelectedNotes = async () => {
    if (!deck || modalSelectedNotebookId == null) return;
    const notes = notesByNotebook[modalSelectedNotebookId] || [];
    const selectedNotes = notes.filter(n => selectedNoteIds.has(n.id));
    if (selectedNotes.length === 0) {
      alert('Select at least one note');
      return;
    }
    try {
      setLoadingNotes(true);
      const allCards = parseNotesToCards(selectedNotes);
      for (const card of allCards) {
        await axiosInstance.post('/decks/flashcards/', {
          deck: deck.id,
          front: card.question,
          back: card.answer
        });
      }
      // Refresh deck data
      const res = await axiosInstance.get(`/decks/decks/${deck.id}/`);
      const data = res.data;
      setDeck({
        ...deck,
        flashcards: [...deck.flashcards, ...allCards.map((c, idx) => ({
          id: `${deck.id}-imported-${idx}`,
          question: c.question,
          answer: c.answer,
          front: c.question,
          back: c.answer,
          difficulty: undefined
        }))],
        flashcardCount: deck.flashcardCount + allCards.length
      });
      
      setShowImportModal(false);
      setSelectedNoteIds(new Set());
    } catch (e) {
      alert('Import failed. Please try again.');
    } finally {
      setLoadingNotes(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </PageLayout>
    );
  }

  if (!deck) {
    return (
      <PageLayout>
        <div className="p-8">
          <button onClick={() => navigate('/decks')} className="mb-4 flex items-center text-indigo-600 hover:underline">
            <ArrowLeft className="mr-2" /> Back to Decks
          </button>
          <div className="text-center text-gray-500">Deck not found.</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center mb-6">
            <button onClick={() => navigate('/decks')} className="text-indigo-600 hover:underline flex items-center mr-2">
              Decks
            </button>
            {deck.parent && (
              <>
                <span className="mx-2 text-gray-400">&gt;</span>
                <button
                  onClick={() => navigate(`/decks/${deck.parent!.id}`)}
                  className="text-indigo-600 hover:underline flex items-center mr-2"
                >
                  {deck.parent.title}
                </button>
              </>
            )}
            <span className="mx-2 text-gray-400">&gt;</span>
            <span className="text-gray-900 dark:text-white font-semibold">{deck.title}</span>
          </div>

          {/* Deck Actions */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{deck.title}</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <span>{deck.flashcardCount} cards</span>
                <span>•</span>
                <span>{deck.progress}% complete</span>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handlePractice}
                className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                <Play size={16} className="mr-2" />
                Practice
              </button>
              <button
                onClick={handleQuiz}
                className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                <HelpCircle size={16} className="mr-2" />
                Quiz
              </button>
            </div>
          </div>

          {/* Tabs Bar */}
          <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-6">
            <button
              onClick={() => setActiveTab('subdecks')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeTab === 'subdecks'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Subdecks
            </button>
            <button
              onClick={() => setActiveTab('flashcards')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeTab === 'flashcards'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Flashcards
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'subdecks' && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Subdecks</h2>
                <button 
                  onClick={() => setShowCreateSubdeck(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
                >
                  <Plus size={20} className="mr-2" />
                  Add Subdeck
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {subdecksLoading ? (
                  <div className="col-span-full text-center py-8">Loading subdecks...</div>
                ) : subdecks.length === 0 ? (
                  <div className="col-span-full text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No subdecks yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Create your first subdeck to organize your flashcards</p>
                    <button
                      onClick={() => setShowCreateSubdeck(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium"
                    >
                      Create Subdeck
                    </button>
                  </div>
                ) : (
                  subdecks.map(subdeck => (
                    <div key={subdeck.id} className="relative">
                      <DeckCard
                        deck={{
                          id: subdeck.id,
                          title: subdeck.title,
                          flashcardCount: subdeck.flashcards.length,
                          progress: 0,
                          created_at: '',
                          updated_at: '',
                          createdAt: '',
                          flashcards: subdeck.flashcards,
                          is_deleted: false,
                          is_archived: false,
                        }}
                        onOpen={() => navigate(`/decks/${subdeck.id}`)}
                        onDelete={() => {
                          setSelectedSubdeck(subdeck);
                          setShowDeleteModal(true);
                        }}
                        onStudy={() => navigate(`/decks/${subdeck.id}/practice`)}
                        onQuiz={() => navigate(`/decks/${subdeck.id}/quiz`)}
                        onEdit={() => {
                          setSelectedSubdeck(subdeck);
                          setShowEditModal(true);
                        }}
                        onViewStats={() => {
                          setSelectedSubdeck(subdeck);
                          setShowStatsModal(true);
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'flashcards' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Flashcards</h2>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowImportModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
                  >
                    <FileText size={20} className="mr-2" />
                    Import from Notes
                  </button>
                  <button 
                    onClick={() => setShowAddForm((v) => !v)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
                  >
                    <Plus size={20} className="mr-2" />
                    {showAddForm ? 'Hide Form' : 'Add Flashcard'}
                  </button>
                </div>
              </div>
              
              {/* Add Flashcard Container */}
              {showAddForm && (
                <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-md overflow-hidden">
                  {/* Question Input */}
                  <div className="p-4">
                    <textarea
                      id="new-flashcard-question"
                      ref={questionRef}
                      rows={3}
                      maxLength={800}
                      className="w-full border-0 focus:ring-0 focus:outline-none bg-transparent text-gray-900 dark:text-white text-sm resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      value={newFlashcard.question}
                      onChange={e => setNewFlashcard({ ...newFlashcard, question: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && e.ctrlKey && (newFlashcard.question.trim() || newFlashcard.questionImage) && newFlashcard.answer.trim()) {
                          e.preventDefault();
                          handleAddFlashcard();
                        }
                      }}
                      placeholder="Question goes here (or add image below)"
                    />
                    {/* Image Upload for Question */}
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Add Image to Question (Optional)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleQuestionImageChange}
                          className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 dark:file:bg-indigo-900/30 file:text-indigo-700 dark:file:text-indigo-400 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50"
                        />
                        {questionImagePreview && (
                          <button
                            onClick={removeQuestionImage}
                            className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {questionImagePreview && (
                        <div className="mt-2 relative inline-block">
                          <img
                            src={questionImagePreview}
                            alt="Question preview"
                            className="max-w-full max-h-32 rounded-lg border border-gray-300 dark:border-gray-600"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Divider */}
                  <div className="border-t border-gray-200 dark:border-gray-700"></div>
                  
                  {/* Answer Input */}
                  <div className="p-4">
                    <textarea
                      id="new-flashcard-answer"
                      rows={3}
                      maxLength={800}
                      className="w-full border-0 focus:ring-0 focus:outline-none bg-transparent text-gray-900 dark:text-white text-sm resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      value={newFlashcard.answer}
                      onChange={e => setNewFlashcard({ ...newFlashcard, answer: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && e.ctrlKey && newFlashcard.question.trim() && newFlashcard.answer.trim()) {
                          e.preventDefault();
                          handleAddFlashcard();
                        }
                      }}
                      placeholder="Answer goes here"
                    />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="px-4 pb-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Tip: Press Ctrl+Enter to add</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { 
                          setShowAddForm(false); 
                          setNewFlashcard({ question: '', answer: '', questionImage: null }); 
                          setQuestionImagePreview(null);
                        }}
                        type="button"
                        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddFlashcard}
                        disabled={isAddingFlashcard || (!newFlashcard.question.trim() && !newFlashcard.questionImage) || !newFlashcard.answer.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center"
                      >
                        {isAddingFlashcard ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus size={16} className="mr-2" />
                            Add Flashcard
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col gap-4">
                {deck.flashcards.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No flashcards yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Use the form above to add your first flashcard</p>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const startIndex = (flashcardCurrentPage - 1) * FLASHCARD_PAGE_SIZE;
                      const endIndex = startIndex + FLASHCARD_PAGE_SIZE;
                      const paginatedFlashcards = deck.flashcards.slice(startIndex, endIndex);
                      const flashcardTotalPages = Math.ceil(deck.flashcards.length / FLASHCARD_PAGE_SIZE);
                      
                      return (
                        <>
                          {paginatedFlashcards.map(card => (
                    <div key={card.id} className="relative bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700 overflow-hidden">
                      {/* Vertical colored bar on the left - using system indigo color */}
                      <div className="absolute left-0 top-0 bottom-0 w-3 min-w-[12px] bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-l-xl" />
                      <div className="ml-6">
                      {editingFlashcardId === card.id ? (
                        // Edit Mode
                        <div className="space-y-4">
                          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                            <div className="p-4">
                              <textarea
                                rows={4}
                                maxLength={800}
                                className="w-full border-0 focus:ring-0 focus:outline-none bg-transparent text-gray-900 dark:text-white text-base resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                value={editingFlashcard.question}
                                onChange={e => setEditingFlashcard({ ...editingFlashcard, question: e.target.value })}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && e.ctrlKey && editingFlashcard.question.trim() && editingFlashcard.answer.trim()) {
                                    e.preventDefault();
                                    handleUpdateFlashcard();
                                  }
                                }}
                                placeholder="Question goes here"
                              />
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-700"></div>
                            <div className="p-4">
                              <textarea
                                rows={4}
                                maxLength={800}
                                className="w-full border-0 focus:ring-0 focus:outline-none bg-transparent text-gray-900 dark:text-white text-base resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                value={editingFlashcard.answer}
                                onChange={e => setEditingFlashcard({ ...editingFlashcard, answer: e.target.value })}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && e.ctrlKey && editingFlashcard.question.trim() && editingFlashcard.answer.trim()) {
                                    e.preventDefault();
                                    handleUpdateFlashcard();
                                  }
                                }}
                                placeholder="Answer goes here"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={handleCancelEdit}
                              type="button"
                              className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleUpdateFlashcard}
                              disabled={isUpdatingFlashcard || !editingFlashcard.question.trim() || !editingFlashcard.answer.trim()}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center"
                            >
                              {isUpdatingFlashcard ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <Edit2 size={16} className="mr-2" />
                                  Save Changes
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <>
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="mb-3 text-gray-900 dark:text-white font-semibold text-lg">
                                {card.question && card.question.includes('<img') ? (
                                  <div>
                                    <span className="block mb-2">Q:</span>
                                    {card.question.split('<img')[0].trim() && (
                                      <div className="mb-2">{card.question.split('<img')[0].trim()}</div>
                                    )}
                                    <div dangerouslySetInnerHTML={{ __html: card.question.match(/<img[^>]+>/)?.[0] || '' }} className="[&_img]:max-w-full [&_img]:max-h-64 [&_img]:h-auto [&_img]:rounded-lg [&_img]:border [&_img]:border-gray-300 [&_img]:dark:border-gray-600 [&_img]:mt-2" />
                                  </div>
                                ) : (
                                  <>Q: {card.question}</>
                                )}
                              </div>
                              <div className="text-gray-700 dark:text-gray-300 text-base">A: {card.answer}</div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleStartEdit(card)}
                                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedFlashcard(card);
                                  setShowDeleteModal(true);
                                }}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                          {card.difficulty && (
                            <div className="mt-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                card.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                card.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              }`}>
                                {card.difficulty.charAt(0).toUpperCase() + card.difficulty.slice(1)}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      </div>
                    </div>
                        ))}
                        {/* Pagination below flashcard list */}
                        {flashcardTotalPages > 1 && (
                          <Pagination
                            currentPage={flashcardCurrentPage}
                            totalPages={flashcardTotalPages}
                            onPageChange={setFlashcardCurrentPage}
                          />
                        )}
                      </>
                    );
                  })()}
                </>
              )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateSubdeck && (
        <CreateDeckModal
          isOpen={showCreateSubdeck}
          onClose={() => setShowCreateSubdeck(false)}
          onCreateDeck={handleCreateSubdeck}
        />
      )}


      {showDeleteModal && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          deckTitle={selectedSubdeck?.title || selectedFlashcard?.question || ''}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedSubdeck(null);
            setSelectedFlashcard(null);
          }}
          onConfirm={() => {
            if (selectedSubdeck) {
              handleDeleteSubdeck(selectedSubdeck.id);
            } else if (selectedFlashcard) {
              handleDeleteFlashcard(selectedFlashcard.id);
            }
          }}
        />
      )}

      {showStudySession && (
        <StudySession
          deckTitle={deck.title}
          flashcards={deck.flashcards.map(fc => ({
            id: fc.id,
            front: fc.front || fc.question,
            back: fc.back || fc.answer,
            difficulty: fc.difficulty
          }))}
          onClose={() => setShowStudySession(false)}
          onComplete={(results) => {
            console.log('Study session completed:', results);
            setShowStudySession(false);
          }}
        />
      )}

      {showQuizSession && deck && (
        <QuizSession
          deckId={deck.id}
          deckTitle={deck.title}
          flashcards={deck.flashcards.map(fc => ({
            id: fc.id,
            front: fc.front || fc.question,
            back: fc.back || fc.answer,
            difficulty: fc.difficulty
          }))}
          onClose={() => setShowQuizSession(false)}
          onComplete={async (results) => {
            // Refetch deck from backend for updated progress
            const res = await axiosInstance.get(`/decks/decks/${deck.id}/`);
            const data = res.data;
            setDeck({
              ...deck,
              progress: data.progress || 0
            });
            setShowQuizSession(false);
          }}
        />
      )}

      {/* Import Notes Modal */}
      {showImportModal && (
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
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Import Notes to Flashcards</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Select notes and how to parse them into Q/A cards for this deck.</p>
                    <div className="mt-4 space-y-4">
                      {/* Notebook selector */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notebook</label>
                        <div className="flex items-center gap-2">
                          <select
                            disabled={loadingNotes}
                            value={modalSelectedNotebookId ?? ''}
                            onChange={(e) => { const id = Number(e.target.value); setModalSelectedNotebookId(Number.isNaN(id) ? null : id); setSelectedNoteIds(new Set()); }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            {notebooks.length === 0 && <option value="">{loadingNotes ? 'Loading...' : 'No notebooks found'}</option>}
                            {notebooks.map(nb => (
                              <option key={nb.id} value={nb.id}>{nb.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => ensureNotebooksLoaded()}
                            className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
                      {/* Parsing strategy */}
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
                  onClick={importSelectedNotes}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-60"
                >
                  Import to Deck
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subdeck Modal */}
      {selectedSubdeck && (
        <EditDeckModal
          isOpen={showEditModal}
          deck={{
            id: selectedSubdeck.id,
            title: selectedSubdeck.title,
          }}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSubdeck(null);
          }}
          onUpdateDeck={async (deckId: string, updates: { title: string }) => {
            try {
              await axiosInstance.patch(`/decks/decks/${deckId}/`, updates);
              
              // Refresh subdecks
              const subdecksRes = await axiosInstance.get(`/decks/decks/?parent=${id}`);
              const data = subdecksRes.data;
              setSubdecks(data.map((sd: any) => ({
                id: sd.id.toString(),
                title: sd.title,
                flashcards: (sd.flashcards || []).map((fc: any) => ({
                  id: fc.id.toString(),
                  question: fc.front,
                  answer: fc.back,
                  front: fc.front,
                  back: fc.back,
                  difficulty: fc.difficulty
                }))
              })));
              
              setShowEditModal(false);
              setSelectedSubdeck(null);
            } catch (error) {
              console.error('Error updating subdeck:', error);
            }
          }}
        />
      )}

      {/* Stats Modal */}
      {selectedSubdeck && (
        <DeckStatsModal
          isOpen={showStatsModal}
          deckTitle={selectedSubdeck.title}
          stats={{
            totalCards: selectedSubdeck.flashcards.length,
            masteredCards: 0,
            learningCards: 0,
            newCards: selectedSubdeck.flashcards.length,
            averageScore: 0,
            totalStudyTime: 0,
            studyStreak: 0,
            weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
            lastStudied: undefined,
          }}
          onClose={() => {
            setShowStatsModal(false);
            setSelectedSubdeck(null);
          }}
        />
      )}
    </PageLayout>
  );
};

export default DeckDetails; 
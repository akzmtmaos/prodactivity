import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Plus, Edit2, Trash2, ChevronRight, Play, HelpCircle, ChevronLeft, FileText } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import CreateDeckModal from '../components/decks/CreateDeckModal';
import AddFlashcardModal from '../components/decks/AddFlashcardModal';
import DeleteConfirmationModal from '../components/decks/DeleteConfirmationModal';
import StudySession from '../components/decks/StudySession';
import QuizSession from '../components/decks/QuizSession';
import DeckCard from '../components/decks/DeckCard';
import { truncateHtmlContent } from '../utils/htmlUtils';

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
  const [showAddFlashcard, setShowAddFlashcard] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`http://192.168.56.1:8000/api/decks/decks/${id}/`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });
        
        if (!res.ok) throw new Error('Failed to fetch deck');
        
        const data = await res.json();
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
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`http://192.168.56.1:8000/api/decks/decks/?parent=${id}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });
        if (!res.ok) throw new Error('Failed to fetch subdecks');
        const data = await res.json();
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
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://192.168.56.1:8000/api/decks/decks/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ title: deckData.title, parent: id })
      });
      if (!res.ok) throw new Error('Failed to create subdeck');
      const newSubdeck = await res.json();
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

  const handleAddFlashcard = (flashcard: Omit<Flashcard, 'id'>) => {
    // Mock implementation - in real app, this would make an API call
    const newFlashcard: Flashcard = {
      ...flashcard,
      id: Date.now().toString()
    };
    console.log('Adding flashcard:', newFlashcard);
    setShowAddFlashcard(false);
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
  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    } as Record<string, string>;
  };

  const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

  const ensureNotebooksLoaded = async () => {
    if (notebooks.length > 0) return;
    try {
      setLoadingNotes(true);
      const res = await fetch(`${API_BASE}/notes/notebooks/`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch notebooks');
      const data = await res.json();
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
      const res = await fetch(`${API_BASE}/notes/?notebook=${notebookId}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch notes');
      const data = await res.json();
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
    const token = localStorage.getItem('accessToken');
    try {
      setLoadingNotes(true);
      const allCards = parseNotesToCards(selectedNotes);
      for (const card of allCards) {
        await fetch('http://192.168.56.1:8000/api/decks/flashcards/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
          body: JSON.stringify({ deck: deck.id, front: card.question, back: card.answer })
        });
      }
      // Refresh deck data
              const res = await fetch(`http://192.168.56.1:8000/api/decks/decks/${deck.id}/`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' },
      });
      if (res.ok) {
        const data = await res.json();
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
      }
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
                        onStudy={() => {}}
                        onQuiz={() => {}}
                        onEdit={() => {}}
                        onViewStats={() => {}}
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
                <div className="flex space-x-3">
                  <button 
                    onClick={() => setShowImportModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
                  >
                    <FileText size={20} className="mr-2" />
                    Import from Notes
                  </button>
                  <button 
                    onClick={() => setShowAddFlashcard(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
                  >
                    <Plus size={20} className="mr-2" />
                    Add Flashcard
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deck.flashcards.length === 0 ? (
                  <div className="col-span-full text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No flashcards yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Add your first flashcard to start learning</p>
                    <button
                      onClick={() => setShowAddFlashcard(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium"
                    >
                      Add Flashcard
                    </button>
                  </div>
                ) : (
                  deck.flashcards.map(card => (
                    <div key={card.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <div className="mb-2 text-gray-900 dark:text-white font-medium">Q: {card.question}</div>
                          <div className="text-gray-700 dark:text-gray-300">A: {card.answer}</div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedFlashcard(card);
                              setShowAddFlashcard(true);
                            }}
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
                    </div>
                  ))
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

      <AddFlashcardModal
        isOpen={showAddFlashcard}
        onClose={() => {
          setShowAddFlashcard(false);
          setSelectedFlashcard(null);
        }}
        onAddFlashcard={handleAddFlashcard}
      />

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
              // Handle flashcard deletion
              console.log('Deleting flashcard:', selectedFlashcard.id);
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
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`http://192.168.56.1:8000/api/decks/decks/${deck.id}/`, {
              headers: {
                'Authorization': token ? `Bearer ${token}` : '',
              },
            });
            if (res.ok) {
              const data = await res.json();
              setDeck({
                ...deck,
                progress: data.progress || 0
              });
            }
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
    </PageLayout>
  );
};

export default DeckDetails; 
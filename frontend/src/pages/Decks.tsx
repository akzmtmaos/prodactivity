import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, Filter, BookOpen, TrendingUp, Clock, Target } from 'lucide-react';
import PageLayout from '../components/PageLayout';
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

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'decks' | 'stats' | 'archived'>('decks');

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch('http://localhost:8000/api/decks/decks/', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });
        if (!res.ok) throw new Error('Failed to fetch decks');
        const data = await res.json();
        const topLevelDecks = data.filter((deck: any) => !deck.parent).map((deck: any) => {
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
          };
        });
        setDecks(topLevelDecks);
      } catch (error) {
        setDecks([]);
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
      setSelectedDeck(deck);
      setShowStudySession(true);
    }
  };

  const handleQuizMode = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
      setSelectedDeck(deck);
      setShowQuizSession(true);
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
          flashcards={selectedDeck.flashcards.map(f => ({
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
          flashcards={selectedDeck.flashcards.map(f => ({
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
                Decks
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
              {/* Add Deck button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center h-10 min-w-[140px] px-4 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
                  <p className="text-gray-600 dark:text-gray-400">Total Cards</p>
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
            <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-2">
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
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                  activeTab === 'stats'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                Statistics
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
            {/* Removed the <hr> below the tabs for consistency */}
          </div>
          {/* Tab Content */}
          {activeTab === 'decks' && (
            <div className="space-y-6">
              {/* Decks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredDecks.map((deck) => (
                  <div key={deck.id} className="relative">
                    <DeckCard
                      deck={deck}
                      onStudy={handleStudy}
                      onQuiz={handleQuiz}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onViewStats={handleViewStats}
                      onOpen={handleOpenDeck}
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
            </div>
          )}
          {activeTab === 'stats' && (
            <div className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 min-h-[300px] flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400 text-lg">Statistics coming soon...</span>
            </div>
          )}
          {activeTab === 'archived' && (
            <div className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 min-h-[300px] flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400 text-lg">Archived decks will appear here.</span>
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